import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const CONDENSE_SYSTEM_PROMPT = `Analiza estas correcciones que un usuario ha hecho a guiones generados por IA.
Identifica PATRONES CONSISTENTES en lo que el usuario corrige.

Para cada patron, indica:
1. El patron (frase concisa)
2. Tipo: tone | structure | vocabulary | technique | general
3. Confianza (0-1, basada en cuantas correcciones lo respaldan)
4. Ejemplo before/after representativo

Ejemplos de patrones:
- "El usuario siempre cambia CTAs genericos por CTAs con urgencia temporal"
- "El usuario prefiere hooks que empiezan con una historia personal, no con preguntas"
- "El usuario exige numeros especificos en la prueba social, nunca generalidades"
- "El usuario cambia 'te invito a' por imperativos directos como 'entra ahora'"

Responde en JSON:
{
  "patterns": [
    {
      "description": "...",
      "type": "tone",
      "confidence": 0.8,
      "source_count": 5,
      "example": { "before": "...", "after": "..." }
    }
  ]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!apiKey || !supabaseUrl || !supabaseKey) {
      return jsonResponse({ error: "Missing required environment variables" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      user_id = "default-user",
      dna_expert_id,
    } = await req.json();

    // Fetch all corrections for this user/DNA
    let query = supabase
      .from("script_corrections")
      .select("id, generated_script, corrected_script, correction_notes, correction_type")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (dna_expert_id) {
      query = query.or(
        `dna_expert_id.eq.${dna_expert_id},dna_expert_id.is.null`
      );
    }

    const { data: corrections, error: dbError } = await query;

    if (dbError) {
      return jsonResponse({ error: `DB error: ${dbError.message}` }, 500);
    }

    if (!corrections || corrections.length < 3) {
      return jsonResponse({
        success: true,
        patterns_created: 0,
        patterns_updated: 0,
        summary: "Not enough corrections to extract patterns (minimum 3)",
      });
    }

    // Build correction summaries for Claude
    const correctionSummaries = corrections.map((c, i) => {
      const gen = c.generated_script || {};
      const cor = c.corrected_script || {};
      const diffs: string[] = [];

      for (const field of ["hook_1", "hook_2", "cuerpo", "cta_1", "cta_2"]) {
        if (gen[field] && cor[field] && gen[field] !== cor[field]) {
          diffs.push(
            `Campo ${field}:\n  ANTES: ${String(gen[field]).substring(0, 300)}\n  DESPUES: ${String(cor[field]).substring(0, 300)}`
          );
        }
      }

      return `Correccion ${i + 1} [tipo: ${c.correction_type || "general"}]:${c.correction_notes ? `\nNota del usuario: ${c.correction_notes}` : ""}\n${diffs.join("\n") || "(sin cambios detectables en campos estandar)"}`;
    });

    // Call Claude Sonnet to extract patterns
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: CONDENSE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Aqui tienes ${corrections.length} correcciones del usuario. Identifica los patrones recurrentes:\n\n${correctionSummaries.join("\n\n---\n\n")}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API error: ${response.status} — ${errText}`);
    }

    const aiData = await response.json();
    const raw = aiData.content?.[0]?.text ?? "";

    // Parse patterns
    let parsed: { patterns: Array<{ description: string; type: string; confidence: number; source_count: number; example?: { before: string; after: string } }> };
    try {
      parsed = JSON.parse(raw);
    } catch {
      const stripped = raw.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?\s*```$/, "").trim();
      try {
        parsed = JSON.parse(stripped);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error(`Could not parse patterns: ${raw.slice(0, 300)}`);
        }
      }
    }

    // Upsert patterns into training_patterns table
    let created = 0;
    let updated = 0;

    for (const p of parsed.patterns) {
      // Check if a similar pattern already exists
      const { data: existing } = await supabase
        .from("training_patterns")
        .select("id, strength")
        .eq("user_id", user_id)
        .eq("pattern_type", p.type)
        .ilike("description", `%${p.description.substring(0, 50)}%`)
        .limit(1);

      if (existing && existing.length > 0) {
        // Update existing pattern
        await supabase
          .from("training_patterns")
          .update({
            description: p.description,
            strength: Math.max(existing[0].strength, p.confidence * p.source_count),
            examples: p.example ? [p.example] : [],
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing[0].id);
        updated++;
      } else {
        // Create new pattern
        await supabase.from("training_patterns").insert({
          user_id,
          dna_expert_id: dna_expert_id || null,
          pattern_type: p.type,
          description: p.description,
          strength: p.confidence * p.source_count,
          examples: p.example ? [p.example] : [],
        });
        created++;
      }
    }

    return jsonResponse({
      success: true,
      patterns_created: created,
      patterns_updated: updated,
      summary: `Extracted ${parsed.patterns.length} patterns from ${corrections.length} corrections. Created ${created}, updated ${updated}.`,
    });
  } catch (err) {
    console.error("condense-training-patterns error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

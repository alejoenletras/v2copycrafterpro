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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse({ error: "Supabase credentials not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      dna_expert_id,
      user_id = "default-user",
      max_corrections = 10,
      max_references = 5,
      max_patterns = 10,
    } = await req.json();

    // 1. Fetch recent corrections (DNA-specific or global)
    let correctionsQuery = supabase
      .from("script_corrections")
      .select("generated_script, corrected_script, correction_notes, correction_type")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(max_corrections);

    if (dna_expert_id) {
      correctionsQuery = correctionsQuery.or(
        `dna_expert_id.eq.${dna_expert_id},dna_expert_id.is.null`
      );
    }

    const { data: corrections } = await correctionsQuery;

    // 2. Fetch high-quality reference scripts
    let refsQuery = supabase
      .from("reference_scripts")
      .select("name, content, category, tags, notes")
      .eq("user_id", user_id)
      .order("is_favorite", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(max_references);

    const { data: references } = await refsQuery;

    // 3. Fetch learned patterns
    let patternsQuery = supabase
      .from("training_patterns")
      .select("pattern_type, description, strength")
      .eq("user_id", user_id)
      .order("strength", { ascending: false })
      .limit(max_patterns);

    if (dna_expert_id) {
      patternsQuery = patternsQuery.or(
        `dna_expert_id.eq.${dna_expert_id},dna_expert_id.is.null`
      );
    }

    const { data: patterns } = await patternsQuery;

    // Build training context string
    const parts: string[] = [];

    if (patterns && patterns.length > 0) {
      parts.push("=== PATRONES DE ENTRENAMIENTO ===");
      parts.push("(Estos patrones fueron aprendidos de correcciones previas del usuario)\n");
      patterns.forEach((p, i) => {
        parts.push(`PATRON ${i + 1} [tipo: ${p.pattern_type}, fuerza: ${p.strength}]:`);
        parts.push(p.description);
        parts.push("");
      });
    }

    if (corrections && corrections.length > 0) {
      parts.push("=== CORRECCIONES RECIENTES ===");
      parts.push("(Ultimas correcciones que muestran las preferencias del usuario)\n");
      corrections.forEach((c, i) => {
        const gen = c.generated_script;
        const cor = c.corrected_script;
        parts.push(`Correccion ${i + 1} [${c.correction_type || "general"}]:`);

        // Show the most impactful field change
        if (gen && cor) {
          const fields = ["hook_1", "cuerpo", "cta_1"];
          for (const field of fields) {
            if (gen[field] && cor[field] && gen[field] !== cor[field]) {
              parts.push(`- ANTES (${field}): ${String(gen[field]).substring(0, 200)}`);
              parts.push(`- DESPUES (${field}): ${String(cor[field]).substring(0, 200)}`);
              break;
            }
          }
        }

        if (c.correction_notes) {
          parts.push(`- NOTA: ${c.correction_notes}`);
        }
        parts.push("");
      });
    }

    if (references && references.length > 0) {
      parts.push("=== SCRIPTS DE REFERENCIA ===");
      parts.push("(Scripts que el usuario considera ejemplares)\n");
      references.forEach((r, i) => {
        parts.push(`Referencia ${i + 1}: "${r.name}" (${r.category || "general"}${r.tags?.length ? `, Tags: ${r.tags.join(", ")}` : ""})`);
        parts.push(r.content.substring(0, 500));
        parts.push("");
      });
    }

    if (parts.length > 0) {
      parts.push(
        "REGLA: Los patrones de las correcciones del usuario son MAS importantes que tus propios criterios. Si el usuario consistentemente corrige algo de cierta manera, SIGUE ese patron."
      );
    }

    const trainingContext = parts.join("\n");

    return jsonResponse({
      success: true,
      training_context: trainingContext,
      stats: {
        corrections_found: corrections?.length || 0,
        references_found: references?.length || 0,
        patterns_found: patterns?.length || 0,
      },
    });
  } catch (err) {
    console.error("get-training-context error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

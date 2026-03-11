import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      personality_dna_id,
      referente_id,
      audience_dna_id,
      product_dna_id,
    } = await req.json();

    if (!personality_dna_id || !referente_id) {
      return new Response(
        JSON.stringify({ error: "personality_dna_id y referente_id son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch personality DNA
    const { data: personalityDna } = await supabase
      .from("dnas")
      .select("*")
      .eq("id", personality_dna_id)
      .single();

    // Fetch audience + product DNAs if provided
    let audienceDna = null;
    let productDna = null;
    if (audience_dna_id || product_dna_id) {
      const ids = [audience_dna_id, product_dna_id].filter(Boolean);
      const { data: dnas } = await supabase.from("dnas").select("*").in("id", ids);
      audienceDna = dnas?.find((d: any) => d.id === audience_dna_id) ?? null;
      productDna = dnas?.find((d: any) => d.id === product_dna_id) ?? null;
    }

    // Fetch referente
    const { data: referente } = await supabase
      .from("referentes")
      .select("*")
      .eq("id", referente_id)
      .single();

    if (!referente) {
      return new Response(
        JSON.stringify({ error: "Referente no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch recent content from this referente (for context)
    const { data: recentContent } = await supabase
      .from("referente_content")
      .select("platform, content_type, original_caption, strategic_analysis, quality_score")
      .eq("referente_id", referente_id)
      .order("quality_score", { ascending: false })
      .limit(3);

    // Build DNA text
    const pd = personalityDna?.data || {};
    const personalityText = [
      pd.about ? `Quién soy: ${pd.about}` : "",
      pd.voice ? `Voz y estilo: ${pd.voice}` : "",
      pd.credentials ? `Credenciales: ${pd.credentials}` : "",
      pd.forbidden_words ? `Palabras prohibidas: ${pd.forbidden_words}` : "",
    ].filter(Boolean).join("\n");

    const ad = audienceDna?.data || {};
    const audienceText = audienceDna ? [
      ad.ideal_client ? `Cliente ideal: ${ad.ideal_client}` : "",
      ad.core_belief ? `Creencia central: ${ad.core_belief}` : "",
    ].filter(Boolean).join("\n") : "";

    const prod = productDna?.data || {};
    const productText = productDna ? [
      prod.main_problem ? `Problema resuelto: ${prod.main_problem}` : "",
      prod.solution_promise ? `Promesa: ${prod.solution_promise}` : "",
    ].filter(Boolean).join("\n") : "";

    const contentSamples = (recentContent || [])
      .map((c: any, i: number) =>
        `Muestra ${i + 1} (${c.platform}, ${c.content_type}): ${(c.original_caption || "").substring(0, 300)}`
      ).join("\n\n");

    const userPrompt = `Analiza la alineación entre este perfil de marca (DNA) y este referente para determinar qué modelar y qué filtrar de sus anuncios.

DNA PERSONALIDAD:
${personalityText || "Sin datos de personalidad"}

${audienceText ? `DNA AUDIENCIA:\n${audienceText}\n` : ""}
${productText ? `DNA PRODUCTO:\n${productText}\n` : ""}
REFERENTE: ${referente.name}
${referente.description ? `Descripción: ${referente.description}` : ""}
${referente.ig_handle ? `Instagram: @${referente.ig_handle}` : ""}
${referente.tiktok_handle ? `TikTok: @${referente.tiktok_handle}` : ""}
${contentSamples ? `\nContenido reciente del referente:\n${contentSamples}` : ""}

Responde SOLO con JSON válido (sin backticks, sin texto extra):
{
  "what_to_model": "Sé específico. Qué estructuras, frameworks, ángulos, ritmo y técnicas de persuasión tomar de este referente. Ejemplo: 'Estructura de diagnóstico rojo/verde — mostrar el error primero, luego la solución. Hook de pregunta directa que nombra el dolor específico. Ritmo rápido con frases cortas.'",
  "what_to_filter": "Sé específico. Qué NO tomar. Ejemplo: 'Su tono confrontacional directo; adaptar a autoridad serena. No usar referencias culturales americanas. Evitar el lenguaje de aspiración de vida si no aplica al producto.'",
  "alignment_analysis": "Un párrafo de 2-3 oraciones explicando por qué este referente es útil para este DNA y qué aporta específicamente.",
  "alignment_score": 8
}`;

    // Call Claude Sonnet
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1200,
        system: "Eres un experto en estrategia de contenido y modelado de anuncios. Analiza con precisión la alineación entre perfiles de marca y referentes. Sé específico y accionable — no genérico. Responde ÚNICAMENTE con JSON válido.",
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      throw new Error(`Claude API error: ${err}`);
    }

    const claudeData = await claudeRes.json();
    const text = claudeData.content?.[0]?.text || "";

    let parsed: any = null;
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    }

    if (!parsed?.what_to_model || !parsed?.what_to_filter) {
      throw new Error("La IA no generó las reglas correctamente");
    }

    // Upsert the dna_referente_rules record
    const ruleData = {
      personality_dna_id,
      referente_id,
      audience_dna_id: audience_dna_id || null,
      product_dna_id: product_dna_id || null,
      what_to_model: parsed.what_to_model,
      what_to_filter: parsed.what_to_filter,
      alignment_analysis: parsed.alignment_analysis || null,
      alignment_score: parsed.alignment_score ?? null,
      rules_generated_at: new Date().toISOString(),
      priority: Math.min(10, Math.max(1, parsed.alignment_score ?? 5)),
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { data: rule, error: upsertError } = await supabase
      .from("dna_referente_rules")
      .upsert(ruleData, { onConflict: "personality_dna_id,referente_id" })
      .select("*, referentes(*)")
      .single();

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({ success: true, rule }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("generate-referente-rules error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

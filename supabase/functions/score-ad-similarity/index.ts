import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// ─── Claude API Call Helper ──────────────────────────────────────────────────

async function callClaude(
  apiKey: string,
  model: string,
  maxTokens: number,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error: ${response.status} — ${errText}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? "";
}

// ─── JSON Parser (triple-layer fallback) ─────────────────────────────────────

function parseJsonResponse<T>(raw: string): T {
  try {
    return JSON.parse(raw);
  } catch {
    const stripped = raw
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?\s*```$/, "")
      .trim();
    try {
      return JSON.parse(stripped);
    } catch {
      const match = raw.match(/\[[\s\S]*\]/) || raw.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error(`Could not parse JSON: ${raw.slice(0, 300)}`);
    }
  }
}

// ─── Scoring System Prompt ───────────────────────────────────────────────────

const SCORING_SYSTEM_PROMPT = `Eres un analista experto que compara anuncios publicitarios.
Recibes el ANÁLISIS de un VIDEO DE INSPIRACIÓN y una lista de ADS ENCONTRADOS.

Para CADA ad, evalúa su SIMILITUD con el video original en estas dimensiones:

1. ESTRUCTURA PERSUASIVA (peso: 30%)
   ¿El ad sigue un patrón estructural similar? (hook → problema → solución, PAS, AIDA, etc.)

2. TONO/VOZ (peso: 20%)
   ¿El tono emocional es similar? (educativo, cómico, urgente, inspiracional, etc.)

3. TÉCNICA DE HOOK (peso: 20%)
   ¿Usa un tipo de hook similar? (pregunta, estadística, declaración polémica, historia, etc.)

4. AUDIENCIA TARGET (peso: 15%)
   ¿Apunta a una audiencia similar o del mismo nicho?

5. CTA (peso: 15%)
   ¿El call to action usa una estrategia similar? (urgencia, escasez, prueba gratuita, etc.)

CRITERIOS DE RECOMENDACIÓN:
- score >= 75: recommended = true
- score < 75: recommended = false

Responde SOLO en JSON válido (un array). Sin texto adicional, sin markdown, sin backticks.

Esquema por ad:
{
  "ad_id": "...",
  "similarity_score": 0-100,
  "reasoning": "Una oración explicando por qué es o no similar",
  "technique_match": ["técnica_compartida_1", "técnica_compartida_2"],
  "recommended": true/false
}`;

// ─── Main Handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return jsonResponse({ error: "ANTHROPIC_API_KEY not configured" }, 500);
    }

    const { video_analysis, ads } = await req.json();

    if (!video_analysis) {
      return jsonResponse({ error: "video_analysis required" }, 400);
    }
    if (!ads || !Array.isArray(ads) || ads.length === 0) {
      return jsonResponse({ error: "ads array required (max 5 per batch)" }, 400);
    }

    // Format the user message
    const analysisStr = JSON.stringify(video_analysis, null, 2);
    const adsStr = ads
      .map(
        (ad: Record<string, unknown>, i: number) =>
          `--- AD ${i + 1} (id: ${ad.ad_id}) ---
Advertiser: ${ad.advertiser_name}
Headline: ${ad.headline || "N/A"}
CTA: ${ad.cta_text || "N/A"}
Days running: ${ad.days_running || "N/A"}
Text:
${String(ad.ad_text || "").substring(0, 1500)}`
      )
      .join("\n\n");

    const userMessage = `ANÁLISIS DEL VIDEO DE INSPIRACIÓN:
${analysisStr}

ADS A EVALUAR (${ads.length}):
${adsStr}

Evalúa la similitud de cada ad con el video original. Responde con un array JSON.`;

    console.log(`Scoring ${ads.length} ads for similarity...`);

    const rawResponse = await callClaude(
      anthropicKey,
      "claude-sonnet-4-6",
      3000,
      SCORING_SYSTEM_PROMPT,
      userMessage
    );

    const scoredAds = parseJsonResponse<
      Array<{
        ad_id: string;
        similarity_score: number;
        reasoning: string;
        technique_match: string[];
        recommended: boolean;
      }>
    >(rawResponse);

    // Merge scores back with original ad data
    const mergedResults = ads.map((ad: Record<string, unknown>) => {
      const score = scoredAds.find(
        (s) => s.ad_id === String(ad.ad_id)
      );
      return {
        ...ad,
        similarity_score: score?.similarity_score ?? 0,
        reasoning: score?.reasoning ?? "No se pudo evaluar",
        technique_match: score?.technique_match ?? [],
        recommended: score?.recommended ?? false,
      };
    });

    return jsonResponse({
      scored_ads: mergedResults,
      batch_size: ads.length,
    });
  } catch (err) {
    console.error("score-ad-similarity error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

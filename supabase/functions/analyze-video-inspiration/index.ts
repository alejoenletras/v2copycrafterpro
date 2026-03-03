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
      const match = raw.match(/\{[\s\S]*\}/) || raw.match(/\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error(`Could not parse JSON: ${raw.slice(0, 300)}`);
    }
  }
}

// ─── Gemini System Prompt ────────────────────────────────────────────────────

const ANALYSIS_PROMPT = `Eres un analista experto de anuncios de video para redes sociales.
Analiza el contenido proporcionado (video o transcripción) en TODAS sus dimensiones.

DIMENSIONES DE ANÁLISIS:

1. CONTENIDO (qué se dice):
   - Tema principal y mensajes clave
   - CTA y propuesta de valor
   - Keywords relevantes para buscar ads similares en Meta Ads Library

2. ESTRUCTURA (cómo se organiza):
   - Patrón estructural (PAS, AIDA, storytelling, problema-solución, etc.)
   - Cómo abre/engancha
   - Cómo cierra/llama a la acción

3. VISUAL (cómo se ve — si tienes acceso al video):
   - Formato (talking head, B-roll, screen recording, animación, etc.)
   - Overlays de texto, transiciones, ritmo de edición
   - Si solo tienes texto, indica "no_disponible"

4. TONO (cómo se siente):
   - Tono primario y secundario
   - Nivel de energía
   - Triggers emocionales que usa
   - Estilo de habla

5. ESTRATEGIA DE BÚSQUEDA:
   - 5-8 keywords/frases para buscar ads similares en Facebook Ads Library
   - Las keywords deben ser en español y relevantes para encontrar anuncios con estructura/tono similar
   - Incluye tanto el tema como descriptores del estilo

IMPORTANTE:
- Responde SOLO en JSON válido, sin texto adicional, sin markdown, sin backticks
- Todas las respuestas en español
- Las search_keywords son CRÍTICAS — deben funcionar para buscar en Meta Ads Library

Esquema JSON de respuesta:
{
  "summary": "Descripción del video en 1-2 oraciones",
  "content_type": "ad | testimonial | tutorial | vlog | reel | other",
  "tone": "educativo | motivacional | urgente | casual | profesional | cómico | agresivo | empático",
  "visual_style": "Descripción del estilo visual o 'no_disponible' si solo hay texto",
  "key_techniques": ["técnica 1", "técnica 2"],
  "target_audience_profile": "Quién es la audiencia objetivo de este video",
  "search_keywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5"],
  "estimated_duration_seconds": 45,
  "hook_analysis": "Cómo abre el video y por qué funciona",
  "cta_analysis": "Cómo cierra el video y qué acción pide",
  "persuasion_structure": "PAS | AIDA | storytelling | problema-solución | otro"
}`;

// ─── Main Handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return jsonResponse({ error: "GEMINI_API_KEY not configured" }, 500);
    }

    const { source_type, storage_path, source_url, transcript } =
      await req.json();

    if (!source_type) {
      return jsonResponse(
        { error: "source_type required ('upload' or 'url')" },
        400
      );
    }

    // Build the Gemini request parts
    const parts: Array<Record<string, unknown>> = [];

    if (source_type === "upload" && storage_path) {
      // Download video from Supabase Storage
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (!supabaseUrl || !serviceKey) {
        return jsonResponse(
          { error: "Supabase credentials not configured" },
          500
        );
      }

      const supabase = createClient(supabaseUrl, serviceKey);
      const { data: fileData, error: dlError } = await supabase.storage
        .from("video-inspirations")
        .download(storage_path);

      if (dlError || !fileData) {
        return jsonResponse(
          { error: `Failed to download video: ${dlError?.message}` },
          500
        );
      }

      // Convert to base64
      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = btoa(
        String.fromCharCode(...new Uint8Array(arrayBuffer))
      );

      // Detect MIME type
      const ext = storage_path.split(".").pop()?.toLowerCase();
      const mimeMap: Record<string, string> = {
        mp4: "video/mp4",
        mov: "video/quicktime",
        webm: "video/webm",
        avi: "video/x-msvideo",
      };
      const mimeType = mimeMap[ext || ""] || "video/mp4";

      parts.push({
        inline_data: { mime_type: mimeType, data: base64 },
      });
      parts.push({
        text: ANALYSIS_PROMPT + "\n\nAnaliza el video proporcionado.",
      });
    } else if (source_type === "url") {
      // URL mode: use transcript if available
      if (!transcript && !source_url) {
        return jsonResponse(
          { error: "transcript or source_url required for URL mode" },
          400
        );
      }

      let contextText = "";
      if (transcript) {
        contextText = `TRANSCRIPCIÓN DEL VIDEO:\n${transcript}`;
      }
      if (source_url) {
        contextText += `\n\nURL ORIGINAL: ${source_url}`;
      }

      parts.push({
        text:
          ANALYSIS_PROMPT +
          "\n\nAnaliza el siguiente contenido de video:\n\n" +
          contextText,
      });
    } else {
      return jsonResponse(
        { error: "Invalid source_type or missing required fields" },
        400
      );
    }

    // Call Gemini API
    console.log("Calling Gemini 2.5 Flash for video analysis...");

    const geminiUrl =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    const geminiRes = await fetch(`${geminiUrl}?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4000,
        },
      }),
      signal: AbortSignal.timeout(180000), // 3 min for video processing
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errText);
      return jsonResponse(
        {
          error: `Gemini API error: ${geminiRes.status}`,
          detail: errText.substring(0, 500),
        },
        502
      );
    }

    const geminiData = await geminiRes.json();
    const rawText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!rawText) {
      return jsonResponse(
        { error: "Empty response from Gemini", detail: JSON.stringify(geminiData).substring(0, 500) },
        502
      );
    }

    console.log("Gemini raw response (first 300):", rawText.substring(0, 300));

    // Parse JSON response
    const analysis = parseJsonResponse<Record<string, unknown>>(rawText);

    // Validate required fields
    if (!analysis.summary || !analysis.search_keywords) {
      return jsonResponse(
        {
          error: "Incomplete analysis from Gemini",
          analysis,
        },
        502
      );
    }

    return jsonResponse({ success: true, analysis });
  } catch (err) {
    console.error("analyze-video-inspiration error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

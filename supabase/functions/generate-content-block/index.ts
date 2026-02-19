/**
 * generate-content-block edge function
 *
 * Generates a single marketing copy block using Claude AI.
 * Uses the block's instructions from the structure + collected info + optional DNA.
 *
 * POST body: {
 *   session_id: string,
 *   block_id: string,
 *   block_name: string,
 *   block_instructions: string,
 *   collected_info: Record<string, string>,
 *   dna_data?: Record<string, any>,
 *   extra_instructions?: string   // for regeneration with specific notes
 * }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicApiKey) {
    return jsonResponse({ success: false, error: "ANTHROPIC_API_KEY no configurada" }, 500);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const {
      session_id,
      block_id,
      block_name,
      block_instructions,
      collected_info,
      dna_data,
      extra_instructions,
    } = await req.json();

    if (!session_id || !block_id || !block_instructions || !collected_info) {
      return jsonResponse({ success: false, error: "Parámetros requeridos: session_id, block_id, block_instructions, collected_info" }, 400);
    }

    // Build the prompt
    const prompt = buildBlockPrompt({
      block_name,
      block_instructions,
      collected_info,
      dna_data,
      extra_instructions,
    });

    // Call Claude
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API error: ${response.status} — ${errText}`);
    }

    const aiData = await response.json();
    const content = aiData.content?.[0]?.text ?? "";

    if (!content) throw new Error("Claude no generó contenido");

    // Update session in DB
    const { data: session, error: sessionError } = await supabase
      .from("generation_sessions")
      .select("generated_blocks")
      .eq("id", session_id)
      .single();

    if (sessionError) throw sessionError;

    const updatedBlocks = {
      ...(session?.generated_blocks ?? {}),
      [block_id]: {
        content,
        status: "completed",
        generatedAt: new Date().toISOString(),
      },
    };

    await supabase
      .from("generation_sessions")
      .update({
        generated_blocks: updatedBlocks,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session_id);

    return jsonResponse({ success: true, block_id, content });

  } catch (err) {
    console.error("generate-content-block error:", err);
    return jsonResponse({ success: false, error: (err as Error).message }, 500);
  }
});

function buildBlockPrompt({
  block_name,
  block_instructions,
  collected_info,
  dna_data,
  extra_instructions,
}: {
  block_name: string;
  block_instructions: string;
  collected_info: Record<string, string>;
  dna_data?: Record<string, any>;
  extra_instructions?: string;
}): string {
  const infoLines = Object.entries(collected_info)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `- ${formatKey(k)}: ${v}`)
    .join("\n");

  let dnaSection = "";
  if (dna_data && Object.keys(dna_data).length > 0) {
    const dnaLines = Object.entries(dna_data)
      .filter(([, v]) => v && String(v).trim())
      .map(([k, v]) => `- ${formatKey(k)}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join("\n");
    dnaSection = `
## DNA DE REFERENCIA (Tono, Estilo y Lenguaje)
${dnaLines}

IMPORTANTE: Usa el DNA como referencia de tono y estilo. Adapta el lenguaje, las frases características y el nivel de agresividad/directness de acuerdo a este perfil.
`;
  }

  const extraSection = extra_instructions
    ? `\n## INSTRUCCIONES ADICIONALES DE REGENERACIÓN\n${extra_instructions}\n`
    : "";

  return `Eres un copywriter experto en marketing de alta conversión para el mercado de habla hispana.
Tu especialidad es crear copy visceral, directo y que vende — sin suavizar el lenguaje, sin rodeos, sin clichés vacíos.

## PROTOCOLO DE VERACIDAD (OBLIGATORIO)
- NUNCA inventes datos, resultados, testimonios, estadísticas o características que no estén en la información proporcionada
- Si necesitas un dato específico que no tienes, escríbelo como [INSERTAR: descripción del dato necesario]
- Usa SOLO la información real que te doy a continuación

## INFORMACIÓN DEL PRODUCTO Y AUDIENCIA
${infoLines || "No se proporcionó información adicional."}
${dnaSection}
## BLOQUE A GENERAR: ${block_name}

### Instrucciones específicas para este bloque:
${block_instructions}
${extraSection}
## FORMATO DE RESPUESTA
- Escribe ÚNICAMENTE el texto del bloque, sin encabezados como "Bloque:" o "Respuesta:"
- Usa párrafos cortos (2-4 líneas máximo)
- Puntuación que favorece la lectura natural y el ritmo de habla
- Saltos de línea para respiración
- Tono agresivo, directo, de alta conversión — nunca corporativo ni suave

Genera el bloque ahora:`;
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

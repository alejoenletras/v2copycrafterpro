/**
 * generate-content-block edge function
 *
 * Generates a single marketing copy block using Claude AI.
 * Uses DNA context (personality, audience, product) as the foundation — no manual fields needed.
 *
 * POST body: {
 *   session_id: string,
 *   block_id: string,
 *   block_name: string,
 *   block_instructions: string,
 *   dna_context?: {
 *     personality?: { about, voice, credentials, forbidden_words, name },
 *     audience?:    { ideal_client, core_belief, testimonials, keywords, name },
 *     product?:     { main_problem, solution_promise, irresistible_offer, keywords, name },
 *     extra_context?: string
 *   },
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
      dna_context,
      extra_instructions,
    } = await req.json();

    if (!session_id || !block_id || !block_instructions) {
      return jsonResponse({ success: false, error: "Parámetros requeridos: session_id, block_id, block_instructions" }, 400);
    }

    // Build the prompt
    const prompt = buildBlockPrompt({
      block_name,
      block_instructions,
      dna_context,
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
  dna_context,
  extra_instructions,
}: {
  block_name: string;
  block_instructions: string;
  dna_context?: Record<string, any>;
  extra_instructions?: string;
}): string {
  // Build the DNA sections from the structured context
  let personalitySection = "";
  let audienceSection = "";
  let productSection = "";
  let extraContextSection = "";

  if (dna_context?.personality) {
    const p = dna_context.personality;
    const lines = [
      p.about && `  - Quién soy: ${p.about}`,
      p.voice && `  - Voz/Estilo: ${p.voice}`,
      p.credentials && `  - Credenciales: ${p.credentials}`,
      p.forbidden_words && `  - NUNCA usar: ${p.forbidden_words}`,
    ].filter(Boolean).join("\n");
    if (lines) {
      personalitySection = `\n### PERSONALIDAD${p.name ? ` (${p.name})` : ""}\n${lines}\n`;
    }
  }

  if (dna_context?.audience) {
    const a = dna_context.audience;
    const lines = [
      a.ideal_client && `  - Cliente ideal: ${a.ideal_client}`,
      a.core_belief && `  - Creencia/frustración central: ${a.core_belief}`,
      a.testimonials && `  - Prueba social: ${a.testimonials}`,
      a.keywords && `  - Su lenguaje/keywords: ${a.keywords}`,
    ].filter(Boolean).join("\n");
    if (lines) {
      audienceSection = `\n### AUDIENCIA${a.name ? ` (${a.name})` : ""}\n${lines}\n`;
    }
  }

  if (dna_context?.product) {
    const pr = dna_context.product;
    const lines = [
      pr.main_problem && `  - Problema que resuelvo: ${pr.main_problem}`,
      pr.solution_promise && `  - Promesa de solución: ${pr.solution_promise}`,
      pr.irresistible_offer && `  - La oferta: ${pr.irresistible_offer}`,
      pr.keywords && `  - Keywords del producto: ${pr.keywords}`,
    ].filter(Boolean).join("\n");
    if (lines) {
      productSection = `\n### PRODUCTO${pr.name ? ` (${pr.name})` : ""}\n${lines}\n`;
    }
  }

  if (dna_context?.extra_context) {
    extraContextSection = `\n### CONTEXTO ADICIONAL PARA ESTA CAMPAÑA\n  ${dna_context.extra_context}\n`;
  }

  const hasDna = personalitySection || audienceSection || productSection;
  const dnaSection = hasDna
    ? `\n## DNA DE CAMPAÑA (usa esto como contexto de tono, audiencia y producto)${personalitySection}${audienceSection}${productSection}${extraContextSection}\nIMPORTANTE: Usa el DNA para escribir con la VOZ de la Personalidad, PARA la Audiencia descrita, SOBRE el Producto indicado. Adapta lenguaje, ejemplos y emociones al perfil real.\n`
    : "";

  const extraSection = extra_instructions
    ? `\n## INSTRUCCIONES DE REGENERACIÓN\n${extra_instructions}\n`
    : "";

  return `Eres un copywriter experto en marketing de alta conversión para el mercado de habla hispana.
Tu especialidad es crear copy visceral, directo y que vende — sin suavizar el lenguaje, sin rodeos, sin clichés vacíos.

## PROTOCOLO DE VERACIDAD (OBLIGATORIO)
- NUNCA inventes datos, resultados, testimonios, estadísticas o características que no estén en la información proporcionada
- Si necesitas un dato específico que no tienes, escríbelo como [INSERTAR: descripción del dato necesario]
- Usa SOLO la información real del DNA
${dnaSection}
## BLOQUE A GENERAR: ${block_name}

### Instrucciones específicas:
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

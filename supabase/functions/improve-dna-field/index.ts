/**
 * improve-dna-field edge function
 *
 * Generates or improves a single DNA field using Claude Haiku.
 * Uses other already-filled fields of the same DNA as context.
 *
 * POST body: {
 *   dna_type: 'expert' | 'audience' | 'product',
 *   field_key: string,
 *   field_label: string,
 *   current_value: string,       // empty string if creating from scratch
 *   other_fields: Record<string, string>  // other filled fields for context
 * }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DNA_TYPE_LABELS: Record<string, string> = {
  expert: "Personalidad del Experto",
  audience: "Audiencia Objetivo",
  product: "Producto o Servicio",
};

const FIELD_DESCRIPTIONS: Record<string, Record<string, string>> = {
  expert: {
    about: "Historia personal, quién eres, tu transformación y por qué haces lo que haces",
    voice: "Tu tono de voz: agresivo, cercano, técnico, inspirador, con humor; ritmo de tus frases; palabras características",
    credentials: "Resultados obtenidos, certificaciones, casos de éxito, credibilidad demostrable",
    forbidden_words: "Palabras, frases y expresiones que NUNCA debes usar en tu comunicación",
  },
  audience: {
    ideal_client: "Descripción del cliente ideal: situación actual, perfil demográfico, nivel de consciencia",
    core_belief: "La creencia principal, frustración profunda o deseo que los mueve a comprar",
    testimonials: "Frases reales de clientes, historias de éxito, prueba social específica",
    keywords: "Palabras y frases que esta audiencia usa naturalmente en sus conversaciones",
  },
  product: {
    main_problem: "El problema específico y doloroso que tu producto o servicio resuelve",
    solution_promise: "La transformación o resultado concreto que prometes al cliente",
    irresistible_offer: "Precio, bonos, garantías, planes de pago, urgencia, escasez",
    keywords: "Keywords de posicionamiento y términos del nicho que usas en marketing",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicApiKey) {
    return jsonResponse({ success: false, error: "ANTHROPIC_API_KEY no configurada" }, 500);
  }

  try {
    const { dna_type, field_key, field_label, current_value, other_fields } = await req.json();

    if (!dna_type || !field_key || !field_label) {
      return jsonResponse({ success: false, error: "Parámetros requeridos: dna_type, field_key, field_label" }, 400);
    }

    const typeLabel = DNA_TYPE_LABELS[dna_type] ?? dna_type;
    const fieldDesc = FIELD_DESCRIPTIONS[dna_type]?.[field_key] ?? field_label;
    const isImproving = current_value && current_value.trim().length > 0;

    // Build context from other filled fields
    const contextLines = Object.entries(other_fields ?? {})
      .filter(([, v]) => v && String(v).trim())
      .map(([k, v]) => `- ${k.replace(/_/g, " ")}: ${v}`)
      .join("\n");

    const prompt = `Eres un estratega de marketing experto en copywriting de alta conversión para el mercado hispanohablante.

El usuario está completando su DNA de "${typeLabel}" para usar en campañas de marketing.

CAMPO A ${isImproving ? "MEJORAR" : "CREAR"}: "${field_label}"
Descripción del campo: ${fieldDesc}

${contextLines ? `CONTEXTO (otros campos ya completados de este DNA):\n${contextLines}\n` : ""}
${isImproving ? `VERSIÓN ACTUAL DEL CAMPO:\n${current_value}\n\nMEJORA esta versión: hazla más específica, más potente, más útil para generar copy de alta conversión.` : "Genera contenido inicial para este campo basándote en el contexto disponible."}

INSTRUCCIONES:
- Sé específico y concreto, no genérico
- Usa el lenguaje natural del mercado hispanohablante
- El contenido debe ser directamente útil para un copywriter que generará VSLs, anuncios y emails
- Responde ÚNICAMENTE con el contenido del campo, sin encabezados ni explicaciones
- Máximo 3-4 oraciones o bullets cortos
- Si no tienes contexto suficiente, crea algo útil y deja marcadores [COMPLETAR: x]

Genera el contenido ahora:`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API error: ${response.status} — ${errText}`);
    }

    const aiData = await response.json();
    const suggested_content = aiData.content?.[0]?.text?.trim() ?? "";

    if (!suggested_content) throw new Error("Claude no generó contenido");

    return jsonResponse({ success: true, suggested_content });

  } catch (err) {
    console.error("improve-dna-field error:", err);
    return jsonResponse({ success: false, error: (err as Error).message }, 500);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

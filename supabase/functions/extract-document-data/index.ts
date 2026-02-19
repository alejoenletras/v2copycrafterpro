/**
 * extract-document-data edge function
 *
 * Extracts structured fields from a document (text, PDF content, etc.) using Claude AI.
 * Returns each field with a confidence level for auto-fill decisions.
 *
 * POST body: {
 *   document_text: string,      // raw text of the document
 *   fields_to_extract: string[] // field keys to extract
 * }
 *
 * Response: {
 *   success: true,
 *   extracted: Record<string, { value: string, confidence: 'high'|'low'|'missing' }>
 * }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Human-readable labels for field keys
const FIELD_LABELS: Record<string, string> = {
  product_name: "Nombre del producto o programa",
  main_pain: "Dolor principal de la audiencia",
  main_desire: "Deseo principal de la audiencia",
  target_audience: "Audiencia objetivo (quién es el cliente ideal)",
  unique_mechanism: "Mecanismo único o método diferenciador",
  product_solution: "Solución que ofrece el producto",
  product_description: "Descripción del producto",
  product_components: "Componentes, módulos o bonos del producto",
  product_price: "Precio del producto",
  expert_name: "Nombre del experto o creador",
  expert_results: "Resultados del experto (logros propios)",
  expert_lowest_point: "Punto más bajo o historia de origen del experto",
  expert_breakthrough: "El descubrimiento o quiebre que cambió todo",
  social_proof_numbers: "Números de prueba social (alumnos, casos, años)",
  testimonials: "Testimonios de clientes (historias, resultados)",
  client_results: "Resultados de clientes (con números específicos)",
  guarantee_period: "Período de garantía (días)",
  guarantee_description: "Descripción de la garantía",
  bonuses: "Bonos incluidos con su valor",
  payment_plan: "Plan de pago (cuotas, precio por cuota)",
  urgency_reason: "Razón de urgencia (por qué actuar ahora)",
  scarcity_reason: "Razón de escasez (cupos limitados, fecha límite)",
  failed_solutions: "Soluciones que la audiencia ya intentó y fallaron",
  pain_consequences: "Consecuencias de no resolver el problema",
  cost_of_inaction: "Costo de no actuar (económico, emocional, temporal)",
  value_comparison: "Comparación de valor con alternativas",
  main_objection: "Objeción principal de compra",
  main_objections: "Objeciones principales de compra (lista)",
  objection_responses: "Respuestas a las objeciones",
  cta_action: "Acción del CTA (qué debe hacer el espectador)",
  cta_url_description: "Descripción del botón o URL de compra",
  main_result: "Resultado principal que promete el producto",
  main_promise: "Promesa principal del webinar/VSL",
  webinar_topic: "Tema central del webinar",
  content_pillar_1: "Primer pilar de contenido",
  content_pillar_2: "Segundo pilar de contenido",
  content_pillar_3: "Tercer pilar de contenido",
  case_study: "Caso de estudio o ejemplo",
  common_misconception: "Creencia falsa o idea equivocada que tiene la audiencia",
  common_mistake: "Error más común que comete la audiencia",
  combined_result: "Resultado al aplicar los 3 pilares juntos",
  implementation_challenge: "Desafío principal de implementación",
  next_steps: "Próximos pasos después de comprar",
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
    const { document_text, fields_to_extract } = await req.json();

    if (!document_text?.trim()) {
      return jsonResponse({ success: false, error: "document_text es requerido" }, 400);
    }
    if (!Array.isArray(fields_to_extract) || fields_to_extract.length === 0) {
      return jsonResponse({ success: false, error: "fields_to_extract debe ser un array no vacío" }, 400);
    }

    // Truncate document to avoid token limits (keep ~12k chars)
    const truncatedDoc = document_text.slice(0, 12000);

    const fieldsList = fields_to_extract
      .map((f) => `- ${f}: ${FIELD_LABELS[f] ?? f}`)
      .join("\n");

    const prompt = `Analiza el siguiente documento de marketing y extrae los campos solicitados.

## DOCUMENTO:
${truncatedDoc}

## CAMPOS A EXTRAER:
${fieldsList}

## INSTRUCCIONES:
- Extrae SOLO información que esté explícita o claramente implícita en el documento
- Para cada campo, indica el nivel de confianza:
  - "high": la información está claramente presente
  - "low": hay algo relacionado pero no es exacto o completo
  - "missing": no se encontró información para este campo
- Si el valor es "missing", escribe exactamente la palabra "missing" como valor
- Responde ÚNICAMENTE con un JSON válido, sin texto adicional

## FORMATO DE RESPUESTA (JSON estricto):
{
  "campo_1": { "value": "valor extraído o missing", "confidence": "high|low|missing" },
  "campo_2": { "value": "valor extraído o missing", "confidence": "high|low|missing" }
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const aiData = await response.json();
    const rawText = aiData.content?.[0]?.text ?? "{}";

    // Parse JSON response
    let extracted: Record<string, { value: string; confidence: string }>;
    try {
      // Handle case where Claude wraps in ```json blocks
      const clean = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      extracted = JSON.parse(clean);
    } catch {
      throw new Error("No se pudo parsear la respuesta de Claude como JSON");
    }

    // Normalize: ensure all requested fields are present
    const normalized: Record<string, { value: string; confidence: "high" | "low" | "missing" }> = {};
    for (const field of fields_to_extract) {
      const raw = extracted[field];
      if (!raw || raw.confidence === "missing" || !raw.value || raw.value === "missing") {
        normalized[field] = { value: "", confidence: "missing" };
      } else {
        normalized[field] = {
          value: raw.value,
          confidence: (raw.confidence === "high" || raw.confidence === "low") ? raw.confidence : "low",
        };
      }
    }

    return jsonResponse({ success: true, extracted: normalized });

  } catch (err) {
    console.error("extract-document-data error:", err);
    return jsonResponse({ success: false, error: (err as Error).message }, 500);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

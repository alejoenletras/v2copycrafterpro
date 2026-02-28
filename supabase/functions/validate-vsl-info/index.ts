/**
 * validate-vsl-info edge function
 *
 * Validates whether the provided DNA context + user instructions contain
 * enough information to generate a complete 12-section VSL.
 * If info is missing, returns specific questions to ask the user.
 *
 * POST body: {
 *   dna_context: { personality?, audience?, product? },
 *   user_instructions: string,
 *   reference_text?: string,
 *   user_answers?: string   // accumulated answers from previous rounds
 * }
 *
 * Response:
 *   { complete: true }
 *   { complete: false, questions: string }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres Hooq, un asistente experto en creación de VSLs (Video Sales Letters) de alta conversión.

Tu trabajo es analizar la información proporcionada y determinar si es SUFICIENTE para escribir un VSL completo de 12 secciones.

## LAS 12 SECCIONES DE UN VSL:
1. Gancho + Causa Raíz
2. Mecanismo de Solución
3. Admisión Dañina
4. Transición
5. La Solución (Producto)
6. La Oferta
7. CTA + Escasez
8. Bonos
9. Garantía
10. Urgencia
11. Opciones (comparar hacer nada vs actuar)
12. Cierre Emocional

## INFORMACIÓN CRÍTICA QUE NECESITAS:

### Pilar 1 — Avatar/Audiencia:
- Dolor específico y concreto (no genérico)
- Soluciones que ya probaron y por qué fallaron
- Objeciones principales que tienen

### Pilar 2 — Mecanismo/Solución:
- Qué problema resuelve el producto/servicio
- Por qué es diferente de las alternativas (mecanismo único)
- La causa raíz que ataca

### Pilar 3 — Oferta:
- Qué es exactamente el producto/servicio
- Precio o rango de precio
- Bonos incluidos (si hay)
- Garantía que se ofrece
- Urgencia o escasez real (si existe)

### Pilar 4 — Prueba/Credibilidad:
- Resultados concretos del experto o del producto (números, testimonios)
- Historia personal o de transformación

## TU RESPUESTA:
Debes responder ÚNICAMENTE con un JSON válido:

Si la información es SUFICIENTE:
{"complete": true}

Si FALTA información:
{"complete": false, "questions": "texto con las preguntas"}

## REGLAS PARA LAS PREGUNTAS:
- Sé CONCRETO: no preguntes "¿tienes información del producto?" → pregunta "¿Cuál es el precio exacto de tu producto?"
- Máximo 5 preguntas por ronda
- Ordena por importancia (lo más crítico primero)
- Usa tono cercano pero profesional
- Numera las preguntas
- Si hay info parcial, reconócela: "Ya tengo claro que vendes X. Ahora necesito saber..."
- Si los DNAs ya contienen info relevante (audiencia, personalidad, producto), NO la pidas de nuevo
- Sé tolerante: si hay suficiente contexto para INFERIR algo razonablemente, no lo pidas`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicApiKey) {
    return jsonResponse(
      { success: false, error: "ANTHROPIC_API_KEY no configurada" },
      500
    );
  }

  try {
    const { dna_context, user_instructions, reference_text, user_answers } =
      await req.json();

    // Build the info summary for Claude to analyze
    const parts: string[] = [];

    // DNA context
    if (dna_context?.personality) {
      const p = dna_context.personality;
      const lines = [
        p.about && `- Quién soy: ${p.about}`,
        p.voice && `- Voz/Estilo: ${p.voice}`,
        p.credentials && `- Credenciales: ${p.credentials}`,
        p.forbidden_words && `- Palabras prohibidas: ${p.forbidden_words}`,
      ]
        .filter(Boolean)
        .join("\n");
      if (lines)
        parts.push(
          `## DNA DE PERSONALIDAD${p.name ? ` (${p.name})` : ""}\n${lines}`
        );
    }

    if (dna_context?.audience) {
      const a = dna_context.audience;
      const lines = [
        a.ideal_client && `- Cliente ideal: ${a.ideal_client}`,
        a.core_belief && `- Creencia/frustración central: ${a.core_belief}`,
        a.testimonials && `- Testimonios: ${a.testimonials}`,
        a.keywords && `- Keywords/lenguaje: ${a.keywords}`,
      ]
        .filter(Boolean)
        .join("\n");
      if (lines)
        parts.push(
          `## DNA DE AUDIENCIA${a.name ? ` (${a.name})` : ""}\n${lines}`
        );
    }

    if (dna_context?.product) {
      const pr = dna_context.product;
      const lines = [
        pr.main_problem && `- Problema que resuelve: ${pr.main_problem}`,
        pr.solution_promise && `- Promesa de solución: ${pr.solution_promise}`,
        pr.irresistible_offer && `- Oferta: ${pr.irresistible_offer}`,
        pr.keywords && `- Keywords: ${pr.keywords}`,
      ]
        .filter(Boolean)
        .join("\n");
      if (lines)
        parts.push(
          `## DNA DE PRODUCTO${pr.name ? ` (${pr.name})` : ""}\n${lines}`
        );
    }

    if (user_instructions?.trim()) {
      parts.push(
        `## INSTRUCCIONES DEL USUARIO\n${user_instructions.trim()}`
      );
    }

    if (reference_text?.trim()) {
      parts.push(
        `## MATERIAL DE REFERENCIA (transcripción/documento)\n${reference_text.trim().slice(0, 10000)}`
      );
    }

    if (user_answers?.trim()) {
      parts.push(
        `## RESPUESTAS ADICIONALES DEL USUARIO\n${user_answers.trim()}`
      );
    }

    const infoSummary = parts.join("\n\n---\n\n");

    if (!infoSummary.trim()) {
      return jsonResponse({
        complete: false,
        questions:
          "No tengo ninguna información todavía. Para crear tu VSL necesito que me cuentes:\n\n1. ¿Qué producto o servicio vendes?\n2. ¿A quién se lo vendes? (tu cliente ideal)\n3. ¿Qué problema específico resuelve?\n4. ¿Cuánto cuesta?\n5. ¿Qué resultados has logrado tú o tus clientes?",
      });
    }

    const userMessage = `Analiza la siguiente información y determina si es suficiente para escribir un VSL completo de 12 secciones.

${infoSummary}

---

Responde SOLO con JSON válido: {"complete": true} o {"complete": false, "questions": "..."}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API error: ${response.status} — ${errText}`);
    }

    const aiData = await response.json();
    const rawText = aiData.content?.[0]?.text ?? "";

    // Parse JSON response
    let result: { complete: boolean; questions?: string };
    try {
      const jsonStr = rawText
        .replace(/^```(?:json)?\s*\n?/, "")
        .replace(/\n?\s*```$/, "")
        .trim();
      result = JSON.parse(jsonStr);
    } catch (_) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0]);
        } catch (__) {
          // If parsing fails completely, assume incomplete and use raw text as questions
          result = { complete: false, questions: rawText };
        }
      } else {
        result = { complete: false, questions: rawText };
      }
    }

    return jsonResponse(result);
  } catch (err) {
    console.error("validate-vsl-info error:", err);
    return jsonResponse(
      { success: false, error: (err as Error).message },
      500
    );
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

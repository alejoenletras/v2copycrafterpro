/**
 * analyze-content-to-dna edge function
 *
 * Analyzes content (transcripts, documents, text) and extracts a complete
 * DNA profile for the given DNA type.
 *
 * POST body: {
 *   dna_type: 'expert' | 'audience' | 'product',
 *   content_texts: string[],   // array of text chunks from different sources
 *   dna_name_hint?: string     // optional context to help name the DNA
 * }
 *
 * Response: {
 *   success: boolean,
 *   data: {
 *     about?: string, voice?: string, credentials?: string, forbidden_words?: string,  // expert
 *     ideal_client?: string, core_belief?: string, testimonials?: string, keywords?: string,  // audience
 *     main_problem?: string, solution_promise?: string, irresistible_offer?: string, keywords?: string,  // product
 *     suggested_name: string
 *   },
 *   error?: string
 * }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DNA_PROMPTS: Record<string, { fields: string[]; prompt: string }> = {
  expert: {
    fields: ["about", "voice", "credentials", "forbidden_words"],
    prompt: `Analiza el contenido proporcionado (videos, transcripciones, textos del experto) y extrae el DNA de Personalidad.

Debes extraer estos 4 campos con base en lo que dice y cómo lo dice el experto en el contenido:

1. **about** (¿Quién es?): Historia personal, transformación que vivió, por qué hace lo que hace, su "porqué" profundo. Escrito en primera persona desde la perspectiva del experto.

2. **voice** (Voz y estilo): Cómo habla, su tono (agresivo/cercano/técnico/inspirador), ritmo de sus frases, palabras características que repite, nivel de humor, si usa jerga o lenguaje formal. Describe su estilo de comunicación.

3. **credentials** (Credenciales): Resultados concretos que menciona, años de experiencia, logros de sus clientes, números específicos, certificaciones, pruebas de autoridad que aparecen en el contenido.

4. **forbidden_words** (Palabras prohibidas): Palabras, frases o estilos de comunicación que claramente NO usa o que serían inconsistentes con su forma de hablar. Basado en su voz real.

5. **suggested_name**: Un nombre corto para este perfil de DNA (ej: "Personalidad de Ana García", "Experto en finanzas personales").`,
  },
  audience: {
    fields: ["ideal_client", "core_belief", "testimonials", "keywords"],
    prompt: `Analiza el contenido proporcionado (testimonios, comentarios, casos de éxito, emails de clientes, conversaciones) y extrae el DNA de Audiencia.

Debes extraer estos 4 campos con base en lo que dice y siente la audiencia en el contenido:

1. **ideal_client** (Cliente ideal): Quién es, su situación actual, edad aproximada, qué está buscando, dónde está en su vida. Descripción del perfil real basada en el contenido.

2. **core_belief** (Creencia/frustración central): La creencia que los frena o la frustración más profunda que sienten. El deseo que más los mueve. Qué los mantiene despiertos en las noches.

3. **testimonials** (Testimonios y prueba social): Frases reales que aparecen en el contenido, historias de éxito específicas, resultados con nombres o detalles. Si no hay testimonios directos, qué dicen los comentarios o preguntas más frecuentes.

4. **keywords** (Palabras que ellos usan): Jerga, expresiones y frases que esta audiencia usa naturalmente en conversaciones, comentarios o emails. El vocabulario real de esta gente.

5. **suggested_name**: Un nombre corto para este perfil de audiencia (ej: "Emprendedores digitales 30-45", "Mamás que buscan independencia financiera").`,
  },
  product: {
    fields: ["main_problem", "solution_promise", "irresistible_offer", "keywords"],
    prompt: `Analiza el contenido proporcionado (páginas de venta, scripts de VSL, anuncios, emails de venta) y extrae el DNA de Producto.

Debes extraer estos 4 campos con base en lo que dice sobre el producto en el contenido:

1. **main_problem** (El problema que resuelve): El problema específico y doloroso que este producto o servicio resuelve. Con el nivel de especificidad que aparece en el contenido.

2. **solution_promise** (Promesa de solución): La transformación o resultado concreto que promete. Con métricas o tiempo si están presentes en el contenido (ej: "en 90 días", "sin experiencia previa").

3. **irresistible_offer** (La oferta): Precio, bonos, garantías, planes de pago, urgencia, escasez — todo lo que aparece en el contenido sobre cómo se estructura la oferta.

4. **keywords** (Keywords): Términos del nicho, palabras de posicionamiento, keywords que usa para describir el producto, el mercado, la solución.

5. **suggested_name**: Un nombre corto para este perfil de producto (ej: "Curso de trading crypto", "Consultoría de negocios online").`,
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
    const { dna_type, content_texts, dna_name_hint } = await req.json();

    if (!dna_type || !content_texts || !Array.isArray(content_texts) || content_texts.length === 0) {
      return jsonResponse({ success: false, error: "Parámetros requeridos: dna_type, content_texts[]" }, 400);
    }

    const dnaConfig = DNA_PROMPTS[dna_type];
    if (!dnaConfig) {
      return jsonResponse({ success: false, error: `Tipo de DNA no válido: ${dna_type}` }, 400);
    }

    // Combine all texts, limit to ~12k chars to avoid token overflow
    const combinedText = content_texts
      .filter((t) => t && String(t).trim())
      .join("\n\n---\n\n")
      .slice(0, 12000);

    if (!combinedText.trim()) {
      return jsonResponse({ success: false, error: "No hay contenido para analizar" }, 400);
    }

    const nameHint = dna_name_hint ? `\nNombre de referencia del DNA: ${dna_name_hint}` : "";

    const prompt = `${dnaConfig.prompt}${nameHint}

---

## CONTENIDO A ANALIZAR:

${combinedText}

---

## INSTRUCCIONES DE RESPUESTA:
- Responde ÚNICAMENTE con un JSON válido, sin texto adicional antes o después
- Cada campo debe ser texto claro y específico (no genérico)
- Si el contenido no tiene suficiente información para un campo, escribe una sugerencia útil con [COMPLETAR: descripción]
- El campo "suggested_name" debe ser 2-5 palabras descriptivas
- Responde en español

JSON requerido:
{
  "${dnaConfig.fields[0]}": "...",
  "${dnaConfig.fields[1]}": "...",
  "${dnaConfig.fields[2]}": "...",
  "${dnaConfig.fields[3]}": "...",
  "suggested_name": "..."
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
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API error: ${response.status} — ${errText}`);
    }

    const aiData = await response.json();
    const rawText = aiData.content?.[0]?.text?.trim() ?? "";

    if (!rawText) throw new Error("Claude no generó contenido");

    // Parse JSON response
    let data: Record<string, string>;
    try {
      // Strip potential markdown code blocks
      const jsonStr = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      data = JSON.parse(jsonStr);
    } catch (_) {
      throw new Error(`No se pudo parsear la respuesta de Claude: ${rawText.slice(0, 200)}`);
    }

    return jsonResponse({ success: true, data });

  } catch (err) {
    console.error("analyze-content-to-dna error:", err);
    return jsonResponse({ success: false, error: (err as Error).message }, 500);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

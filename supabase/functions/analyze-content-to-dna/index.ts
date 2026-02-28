/**
 * analyze-content-to-dna edge function
 *
 * Uses Claude Sonnet as an "expert agent" that deeply analyzes content
 * (transcripts, documents, text) and extracts a precise DNA profile.
 *
 * POST body: {
 *   dna_type: 'expert' | 'audience' | 'product',
 *   content_texts: string[],
 *   dna_name_hint?: string
 * }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── System prompt: establishes the expert role ─────────────────────────────

const SYSTEM_PROMPT = `Eres un estratega de comunicación y copywriting de élite con 15 años de experiencia analizando marcas personales, audiencias y productos digitales.

Tu trabajo es analizar contenido real (transcripciones de videos, documentos, textos) y extraer un "DNA" — un perfil profundo y accionable que después será usado para generar copy de alta conversión.

## TU PROCESO DE ANÁLISIS:
1. Lee TODO el contenido proporcionado con atención
2. Identifica patrones recurrentes, no solo menciones aisladas
3. Distingue entre lo que la persona DICE explícitamente y lo que IMPLICA con su tono y contexto
4. Busca las pepitas de oro: frases reales, historias específicas, datos concretos, emociones genuinas
5. Sintetiza todo en campos que sean ÚTILES para escribir copy — no resúmenes genéricos

## REGLAS CRÍTICAS:
- Sé ESPECÍFICO: "invertió $12M en ads para 420 empresas" es infinitamente mejor que "tiene experiencia en marketing"
- USA las propias palabras y frases del contenido cuando sean poderosas
- Si detectas patrones de comunicación (muletillas, estructuras de frases, nivel de formalidad), captúralos con ejemplos
- NUNCA inventes datos que no estén en el contenido
- Si un campo no tiene suficiente información, escribe "[COMPLETAR: qué tipo de info se necesita]" — no rellenes con generalidades
- Responde siempre en español`;

// ─── DNA-specific analysis prompts ──────────────────────────────────────────

const DNA_PROMPTS: Record<string, { fields: string[]; prompt: string }> = {
  expert: {
    fields: ["about", "voice", "credentials", "forbidden_words"],
    prompt: `## MISIÓN: Extraer el DNA de Personalidad de este experto/marca personal

Analiza profundamente TODO el contenido y extrae estos 4 campos:

### 1. about (¿Quién es esta persona?)
Escribe en PRIMERA PERSONA como si fueras el experto. Incluye:
- Su historia de origen o transformación personal (si aparece)
- Por qué hace lo que hace — su motivación real, no la superficial
- Qué lo diferencia de otros en su espacio
- Su filosofía o creencia central sobre su tema
Esto debe sentirse auténtico, como si el experto lo hubiera dictado. Usa sus propias palabras cuando sea posible.

### 2. voice (Voz y estilo de comunicación)
NO describas en abstracto. Demostra con EJEMPLOS REALES del contenido:
- Tono dominante: ¿agresivo, cercano, técnico, inspirador, irreverente?
- Frases características que repite (cítalas textualmente con comillas)
- Estructura de sus frases: ¿cortas y directas? ¿largas y narrativas?
- Nivel de formalidad: ¿tutea? ¿usa jerga? ¿dice groserías suaves?
- Recursos retóricos: ¿usa preguntas retóricas? ¿analogías? ¿humor?
- Ritmo: ¿va al grano o construye tensión?
Ejemplo de formato: 'Tono cercano y directo, tutea siempre. Frases cortas tipo "Eso es directo" o "Así que bueno, vamos a empezar". Usa mucho "mi querido colega" como muletilla de cercanía...'

### 3. credentials (Credenciales y pruebas de autoridad)
Extrae SOLO datos concretos mencionados en el contenido:
- Números específicos: dinero invertido, clientes atendidos, años de experiencia, resultados medibles
- Logros de sus clientes con detalles
- Certificaciones, empresas fundadas, premios
- Cualquier dato verificable que construya autoridad
NO generalices. Si dice "he invertido más de 12 millones en publicidad digital", escribe exactamente eso.

### 4. forbidden_words (Palabras y estilos que NO usa)
Basándote en su estilo REAL de comunicación, identifica:
- Palabras demasiado formales o corporativas que nunca usaría
- Estilos de comunicación incompatibles con su voz (ej: si es directo, "comunicación excesivamente formal o rebuscada")
- Muletillas genéricas de marketing que no aparecen en su vocabulario
- Cualquier tono que sería "fuera de personaje" para esta persona`,
  },

  audience: {
    fields: ["ideal_client", "core_belief", "testimonials", "keywords"],
    prompt: `## MISIÓN: Extraer el DNA de Audiencia desde el contenido

Analiza TODO el contenido para entender profundamente a quién le habla este experto/marca.

### 1. ideal_client (¿Quién es el cliente ideal?)
Construye un perfil detallado basado en pistas del contenido:
- ¿A quién se dirige explícitamente? ("si tienes un negocio físico...", "emprendedores que...")
- Situación actual: ¿qué están viviendo? ¿en qué punto están?
- Nivel de sofisticación: ¿principiantes? ¿intermedios? ¿avanzados?
- Contexto demográfico si se menciona: edad, ubicación, industria
- ¿Qué han intentado antes que no les funcionó?

### 2. core_belief (Creencia/frustración central)
El insight psicológico más profundo sobre esta audiencia:
- ¿Cuál es el dolor principal que menciona el contenido?
- ¿Qué creencia limitante tienen? (ej: "creen que necesitan mucho dinero para empezar")
- ¿Cuál es el deseo real detrás del deseo superficial?
- ¿Qué los frena de actuar?
Escribe esto como una narrativa empática, no como bullet points.

### 3. testimonials (Testimonios y prueba social)
Extrae del contenido:
- Frases textuales de clientes, comentarios o preguntas de la audiencia
- Casos de éxito con detalles específicos (nombres, resultados, contexto)
- Preguntas frecuentes que revelan las dudas de la audiencia
- Si no hay testimonios directos, extrae las referencias que el experto hace a resultados de sus clientes
Cita textualmente cuando sea posible.

### 4. keywords (Vocabulario real de la audiencia)
Palabras y frases que esta audiencia REALMENTE usa:
- Jerga de su industria o nicho
- Cómo describen su problema en sus propias palabras
- Expresiones emocionales que usan ("estoy harto de...", "necesito...")
- Términos de búsqueda probables basados en el contenido`,
  },

  product: {
    fields: ["main_problem", "solution_promise", "irresistible_offer", "keywords"],
    prompt: `## MISIÓN: Extraer el DNA de Producto desde el contenido

Analiza TODO el contenido para entender el producto/servicio y su posicionamiento.

### 1. main_problem (El problema que resuelve)
No el problema genérico — el problema ESPECÍFICO y doloroso:
- ¿Cómo describe el experto el problema de su audiencia?
- ¿Cuál es la consecuencia de NO resolver este problema?
- ¿Qué hace que este problema sea urgente?
- Usa las palabras del contenido para describir el dolor
Ejemplo: NO "problemas con ventas" → SÍ "Tienen un negocio físico pero no saben cómo sacar clientes de las redes sociales hasta su local"

### 2. solution_promise (Promesa de transformación)
La promesa concreta que se hace en el contenido:
- ¿Qué resultado específico promete? Con números si los hay
- ¿En cuánto tiempo? ¿Con qué condiciones?
- ¿Qué hace esta solución diferente de las alternativas?
- ¿Cuál es el mecanismo o método? (ej: "sistema de 3 pasos", "estrategia probada con 420 empresas")

### 3. irresistible_offer (Estructura de la oferta)
Todo lo relacionado con la oferta comercial mencionada en el contenido:
- Precio o rango de precios
- Bonos o extras incluidos
- Garantías (de devolución, de resultados)
- Urgencia o escasez (plazas limitadas, fecha límite)
- Planes de pago
- Si no hay oferta explícita, describe lo que el contenido sugiere sobre el modelo de negocio

### 4. keywords (Keywords de posicionamiento)
Términos estratégicos del contenido:
- Palabras clave del nicho/industria
- Cómo se posiciona vs la competencia
- Términos que usa para describir su solución
- Hashtags, nombres de frameworks o métodos propios`,
  },
};

// ─── Handler ────────────────────────────────────────────────────────────────

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

    // Combine all texts — Sonnet handles up to ~100K tokens, so we allow more input
    const combinedText = content_texts
      .filter((t) => t && String(t).trim())
      .join("\n\n---\n\n")
      .slice(0, 50000);

    if (!combinedText.trim()) {
      return jsonResponse({ success: false, error: "No hay contenido para analizar" }, 400);
    }

    const nameHint = dna_name_hint ? `\nNombre de referencia del DNA: "${dna_name_hint}"` : "";

    const userMessage = `${dnaConfig.prompt}${nameHint}

───────────────────────────────────
## CONTENIDO A ANALIZAR:
───────────────────────────────────

${combinedText}

───────────────────────────────────
## FORMATO DE RESPUESTA:
───────────────────────────────────

Responde ÚNICAMENTE con un JSON válido. Sin texto antes ni después del JSON.
Cada campo debe tener al menos 3-5 oraciones de contenido profundo y específico.
El campo "suggested_name" debe ser 2-5 palabras descriptivas.

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
        model: "claude-opus-4-6",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API error: ${response.status} — ${errText}`);
    }

    const aiData = await response.json();
    const rawText = aiData.content?.[0]?.text?.trim() ?? "";

    if (!rawText) throw new Error("Claude no generó contenido");

    // Parse JSON response — handle markdown code blocks
    let data: Record<string, string>;
    try {
      const jsonStr = rawText
        .replace(/^```(?:json)?\s*\n?/, "")
        .replace(/\n?\s*```$/, "")
        .trim();
      data = JSON.parse(jsonStr);
    } catch (_) {
      // Try to extract JSON from mixed text
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          data = JSON.parse(jsonMatch[0]);
        } catch (__) {
          throw new Error(`No se pudo parsear la respuesta: ${rawText.slice(0, 300)}`);
        }
      } else {
        throw new Error(`Respuesta no contiene JSON válido: ${rawText.slice(0, 300)}`);
      }
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

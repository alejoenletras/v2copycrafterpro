import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// URL types that require a user-provided transcript
const VIDEO_TYPES = ['youtube', 'tiktok', 'reel'];

interface UrlInput {
  url: string;
  type: string;
  transcript?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { urls, rawText } = await req.json() as { urls: UrlInput[]; rawText?: string };
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY no configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentParts: string[] = [];

    // Process each URL
    for (const entry of (urls || [])) {
      const isVideo = VIDEO_TYPES.includes(entry.type);

      if (isVideo) {
        // For video types: use the user-provided transcript
        const transcript = entry.transcript?.trim();
        if (transcript) {
          contentParts.push(
            `--- VIDEO [${entry.type.toUpperCase()}]: ${entry.url} ---\n${transcript}`
          );
        } else {
          // No transcript provided — skip with a note
          contentParts.push(
            `--- VIDEO [${entry.type.toUpperCase()}]: ${entry.url} ---\n[Transcript no proporcionado — este video fue omitido]`
          );
        }
      } else {
        // For web pages: fetch HTML and extract text
        try {
          const text = await fetchPageText(entry.url);
          contentParts.push(
            `--- PÁGINA WEB [${entry.type.toUpperCase()}]: ${entry.url} ---\n${text}`
          );
        } catch (e) {
          contentParts.push(
            `--- PÁGINA WEB [${entry.type.toUpperCase()}]: ${entry.url} ---\n[Error al obtener la página: ${(e as Error).message}]`
          );
        }
      }
    }

    // Add raw text if provided
    if (rawText?.trim()) {
      contentParts.push(`--- TEXTO ADICIONAL PROVISTO POR EL USUARIO ---\n${rawText.trim()}`);
    }

    if (contentParts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No hay contenido para analizar. Agrega al menos una URL con transcript o texto.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const combinedContent = contentParts.join('\n\n');
    const prompt = buildAnalysisPrompt(combinedContent);
    const analysisText = await callClaude(anthropicApiKey, prompt);
    const analysis = parseAnalysisResponse(analysisText);

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('analyze-urls error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ─── Fetch and clean HTML page content ─────────────────────────────────────

async function fetchPageText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CopyCrafterBot/1.0; +https://copycrafter.pro)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} al acceder a ${url}`);
  }

  const html = await response.text();
  return extractTextFromHtml(html);
}

function extractTextFromHtml(html: string): string {
  // Remove script and style blocks
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    // Replace common block-level elements with newlines
    .replace(/<\/?(div|p|h[1-6]|li|section|article|header|footer|main|aside|br|tr|td|th)[^>]*>/gi, '\n')
    // Strip remaining HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Collapse whitespace
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Limit to 10,000 chars per page to avoid token overflow
  return text.slice(0, 10000);
}

// ─── Claude API call ────────────────────────────────────────────────────────

async function callClaude(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(90000), // 90s timeout
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Claude API error ${response.status}: ${(err as any).error?.message || 'Unknown error'}`);
  }

  const data = await response.json() as { content: Array<{ text: string }> };
  return data.content[0].text;
}

// ─── Analysis prompt ────────────────────────────────────────────────────────

function buildAnalysisPrompt(content: string): string {
  const truncated = content.slice(0, 32000);

  return `Eres un experto en copywriting de respuesta directa para el mercado hispanohablante, especializado en VSL (Video Sales Letters) y funnels de alta conversión.

Analiza el siguiente contenido de marketing y extrae los 13 puntos clave en español, de forma detallada y accionable.

CONTENIDO A ANALIZAR:
${truncated}

Responde ÚNICAMENTE con un objeto JSON válido (sin texto adicional antes ni después, sin bloques de código markdown). El JSON debe tener exactamente estas 13 claves:

{
  "offerCore": "...",
  "mainPainPoints": "...",
  "promisedTransformation": "...",
  "targetAudience": "...",
  "authority": "...",
  "uniqueProblemMechanism": "...",
  "uniqueSolutionMechanism": "...",
  "voiceAndCommunication": "...",
  "expertRole": "...",
  "offerStructure": "...",
  "vslStructure": "...",
  "offerStructurePreview": "...",
  "conversionProjection": "..."
}

INSTRUCCIONES PARA CADA CAMPO:

offerCore: Resume en 2-4 párrafos qué se está vendiendo exactamente, cuál es la propuesta de valor central y qué problema fundamental resuelve esta oferta.

mainPainPoints: Lista detallada de los dolores, frustraciones y problemas del avatar detectados. Usa lenguaje emocional y específico. Incluye dolores económicos, emocionales, sociales e identitarios si los hay.

promisedTransformation: Describe el estado "después" prometido: cómo luce la vida del cliente cuando logra los resultados. Sé específico con resultados tangibles (cifras, tiempo, cambios de vida).

targetAudience: Perfil detallado del cliente ideal: quién es, qué hace, qué nivel de experiencia tiene, en qué etapa de su negocio/vida está, qué ha intentado antes sin éxito.

authority: Credenciales del experto, resultados demostrados, testimonios mencionados, métricas de éxito (números específicos), años de experiencia, apariciones en medios — todo lo que establece autoridad y confianza.

uniqueProblemMechanism: Cómo encuadra el experto el problema de forma única y diferente. Cuál es la causa raíz que otros ignoran. El "villano" o paradigma que hay que destruir para que el avatar entienda por qué ha fallado antes.

uniqueSolutionMechanism: Qué hace completamente diferente a esta solución de todo lo que existe. El método, sistema, framework o enfoque único que justifica por qué esto funcionará cuando otras cosas no lo hicieron.

voiceAndCommunication: Tono de voz detectado (formal/informal, motivador/técnico/conversacional), palabras características y expresiones que usa el experto, nivel de humor, longitud de frases típica, estilo narrativo (storytelling, datos, metáforas).

expertRole: Cómo se posiciona el experto ante su audiencia (mentor, guía, compañero que ya lo logró, coach, consultor, etc.). Qué tipo de relación construye y cómo conecta emocionalmente con su audiencia.

offerStructure: Precio detectado o estimado, todos los componentes del producto/servicio (módulos, sesiones, recursos), bonos y su valor declarado, tipo y duración de garantía, formas de pago, urgencia o escasez mencionada.

vslStructure: Propón una estructura de secciones completa para el VSL de 25 minutos basada en el contenido analizado. Ejemplo:
[00:00-02:30] Hook emocional sobre [tema específico]
[02:30-07:00] Historia de transformación del experto
[07:00-12:00] Agitación del problema: [temas específicos detectados]
[12:00-18:00] Presentación del mecanismo único: [nombre del método]
[18:00-21:00] Prueba social y testimonios
[21:00-24:00] Presentación de oferta: [estructura detectada]
[24:00-25:00] Destrucción de objeciones + CTA

offerStructurePreview: Muestra el stack de valor completo con formato visual. Ejemplo:
✅ [Componente principal]: Valor $X,XXX
✅ [Bonus 1]: Valor $XXX
✅ [Bonus 2]: Valor $XXX
────────────────────
Valor total: $X,XXX
Precio de hoy: $XXX
Ahorras: $X,XXX

conversionProjection: Basándote en la fortaleza de la oferta, claridad de propuesta, autoridad del experto, especificidad de los pain points y calidad del mecanismo único, estima el rango de conversión esperado para este VSL y explica los factores principales que determinan esa estimación.`;
}

// ─── Parse Claude response ──────────────────────────────────────────────────

function parseAnalysisResponse(text: string): Record<string, string> {
  // Claude should return pure JSON but may wrap it in markdown code blocks
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract JSON object from anywhere in the text
    const jsonMatch = cleaned.match(/\{[\s\S]+\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Fall through
      }
    }
    throw new Error('No se pudo parsear la respuesta del análisis. Intenta de nuevo.');
  }
}

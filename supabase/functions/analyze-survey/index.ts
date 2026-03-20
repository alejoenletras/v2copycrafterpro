import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Column { name: string; values: string[] }

function computeFrequencies(values: string[]) {
  const counts: Record<string, number> = {};
  for (const v of values) {
    const key = v.trim();
    if (key) counts[key] = (counts[key] || 0) + 1;
  }
  const total = values.filter(v => v.trim()).length;
  return Object.entries(counts)
    .map(([value, count]) => ({ value, count, percentage: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

const SYSTEM_PROMPT = `Eres un experto en análisis de datos de compradores y construcción de avatares de marketing.
Tu trabajo: analizar los datos de una encuesta y generar un DOCUMENTO COMPLETO de avatar del comprador.

El documento debe tener EXACTAMENTE esta estructura y nivel de profundidad:

# AVATAR DEL COMPRADOR REAL
[Nombre del negocio/encuesta]
Construido con datos reales de [N] respuestas verificadas.

## 0) Metodología y Fuentes
- Describe la muestra, las fuentes de datos y el método de análisis.

## 1) Identidad del Comprador (Quién Es)
Para CADA pregunta cerrada/demográfica de la encuesta, crear una subsección con:
- Tabla de distribución (categoría | cantidad | %)
- Insight clave debajo de cada tabla
Incluir al menos: dedicación/ocupación, edad, ubicación, ingresos, nivel educativo (si los datos lo permiten)

## 2) Nivel de Experiencia y Sofisticación
Analizar preguntas sobre experiencia previa, uso de herramientas, nivel técnico.
- Tablas con distribución
- Insights devastadores (datos que sorprenden)

## 3) Dolores del Comprador (Voz Real)
Extraer de las preguntas abiertas los TOP 7 dolores, ordenados por frecuencia.
Para cada dolor:
- Título con número de menciones y porcentaje
- 5-7 frases LITERALES de los encuestados (entre comillas, textuales)
- "Traducción para copy:" — qué significa este dolor para el copywriter

## 4) Deseos y Motivaciones Profundas (Por Qué Compran)
TOP 5 motivaciones extraídas de preguntas abiertas sobre motivación/objetivos.
Para cada una:
- Título con número de menciones y porcentaje
- Frases literales del encuestado
- Traducción para copy

## 5) Segmentos Dentro del Comprador
Identificar 2-3 segmentos claros basados en los datos (ej: por ingreso, por experiencia, por rol).
Para cada segmento:
- Nombre del segmento + cantidad + %
- Perfil breve
- "Sus dolores específicos:" con frases literales
- "Ángulo de copy para este segmento:"

## 6) Objeciones Reales (Lo Que Frena la Compra)
Dividir en:
### 6.1 Objeciones Prácticas (se responden con lógica)
### 6.2 Objeciones Emocionales (se responden con demostración)
### 6.3 Objeciones de Identidad (las que descalifican)
Cada objeción con: frase del comprador + dato que la respalda + cómo romperla

## 7) Un Día en la Vida del Comprador (Escenas para Copy)
6 escenas narrativas cortas que describen momentos reales del comprador.
Cada escena: título + párrafo de 3-4 líneas. Basadas en los datos reales.

## 8) El GAP Crítico (Por Qué Compran)
- Lista de 4-5 hechos sobre el comprador (ya intentó, ya probó, ya invierte, sigue sin resolver)
- Párrafo con el GAP: entre 'quiero X' y 'logro X' hay un abismo de [dolores específicos]

## 9) Lenguaje del Comprador (Banco de Palabras Reales)
### 9.1 Palabras de DOLOR (las que más repiten)
Lista de 8-10 palabras con número de menciones y contextos de uso
### 9.2 Palabras de DESEO (lo que quieren)
Lista de 5-8 palabras con número de menciones
### 9.3 Frases Textuales Más Poderosas (para copy directo)
8-10 frases literales que pueden ser hooks o ángulos de anuncio

## 10) Mensajes Clave para Marketing
5 mensajes, cada uno conectando un dolor con la solución. Basados en los datos.
Cada mensaje: título + párrafo de 2-3 líneas listo para usar en copy.

## 11) Claims Usados y Compliance
Lista de todos los datos/estadísticas usados en el documento con su fuente.
Evaluación de riesgo de compliance.

REGLAS CRÍTICAS:
- SOLO usa datos REALES de la encuesta. CERO datos inventados.
- Las frases literales deben ser TEXTUALES de las respuestas, entre comillas.
- Los porcentajes deben calcularse correctamente sobre el total de respuestas.
- El documento debe ser en ESPAÑOL.
- Formato: Markdown limpio con headers ##, bullets, tablas, y bloques de citas > para frases literales.
- Extensión esperada: 3000-5000 palabras.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { columns, context } = await req.json() as { columns: Column[]; context?: string };
    if (!columns || columns.length === 0) {
      return new Response(JSON.stringify({ error: 'No se recibieron columnas' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');

    // Classify columns — frequencies computed on ALL data, sample for qualitative
    const quantColumns: Array<{ name: string; totalNonEmpty: number; frequencies: ReturnType<typeof computeFrequencies> }> = [];
    const qualColumns: Array<{ name: string; totalNonEmpty: number; sample: string[] }> = [];

    for (const col of columns) {
      const nonEmpty = col.values.filter(v => v.trim());
      const unique = new Set(nonEmpty.map(v => v.trim())).size;
      if (unique <= 20 && nonEmpty.length > 0) {
        // Quantitative: compute frequencies on ALL responses
        quantColumns.push({ name: col.name, totalNonEmpty: nonEmpty.length, frequencies: computeFrequencies(col.values) });
      } else if (nonEmpty.length > 0) {
        // Qualitative: random sample of 100 responses (representative)
        const shuffled = [...nonEmpty].sort(() => Math.random() - 0.5);
        qualColumns.push({ name: col.name, totalNonEmpty: nonEmpty.length, sample: shuffled.slice(0, 100) });
      }
    }
    const totalResponses = columns[0]?.values.filter(v => v.trim()).length ?? 0;

    console.log('analyze-survey: totalResponses:', totalResponses, 'quant:', quantColumns.length, 'qual:', qualColumns.length);

    const userPrompt = `Analiza esta encuesta con ${totalResponses} respuestas TOTALES y genera el documento completo de Avatar del Comprador.

IMPORTANTE: Los datos cuantitativos tienen las frecuencias calculadas sobre TODAS las ${totalResponses} respuestas (no una muestra). Los datos cualitativos son una muestra aleatoria representativa de las respuestas abiertas. Los porcentajes y conteos son EXACTOS sobre el total.
${context ? `\nCONTEXTO DEL NEGOCIO:\n${context}\n` : ''}
DATOS CUANTITATIVOS (frecuencias sobre ${totalResponses} respuestas totales):
${JSON.stringify(quantColumns, null, 2)}

DATOS CUALITATIVOS (muestra aleatoria representativa de respuestas abiertas):
${JSON.stringify(qualColumns, null, 2)}

Genera el documento COMPLETO con las 11 secciones. Los datos cuantitativos reflejan el universo TOTAL de ${totalResponses} respuestas. Usa ese número real en el documento.`;

    console.log('analyze-survey: calling Claude Opus 4.6 (streaming), totalResponses:', totalResponses);

    // Use streaming to keep the connection alive (avoids WallClockTime timeout)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 16000,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', errText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    // Stream SSE from Claude → collect text, then return full document
    // We read the stream to completion but send periodic keepalive data
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;
            try {
              const event = JSON.parse(jsonStr);
              if (event.type === 'content_block_delta' && event.delta?.text) {
                fullText += event.delta.text;
                // Send chunk to client as SSE
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: event.delta.text })}\n\n`));
              }
              if (event.type === 'message_stop') {
                // Send final message with full document
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, document: fullText })}\n\n`));
              }
              if (event.type === 'error') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: event.error?.message || 'Error de Claude' })}\n\n`));
              }
            } catch { /* skip non-JSON lines */ }
          }
        }

        // If we didn't get message_stop, send what we have
        if (fullText && !fullText.includes('[DONE]')) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, document: fullText })}\n\n`));
        }

        console.log('analyze-survey: streaming complete, document length:', fullText.length);
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('analyze-survey error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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

    // Classify columns
    const quantColumns: Array<{ name: string; frequencies: ReturnType<typeof computeFrequencies> }> = [];
    const qualColumns: Array<{ name: string; sample: string[] }> = [];

    for (const col of columns) {
      const nonEmpty = col.values.filter(v => v.trim());
      const unique = new Set(nonEmpty.map(v => v.trim())).size;
      if (unique <= 15 && nonEmpty.length > 0) {
        quantColumns.push({ name: col.name, frequencies: computeFrequencies(col.values) });
      } else if (nonEmpty.length > 0) {
        qualColumns.push({ name: col.name, sample: nonEmpty.slice(0, 80) });
      }
    }
    const totalResponses = columns[0]?.values.filter(v => v.trim()).length ?? 0;

    const userPrompt = `Analiza esta encuesta con ${totalResponses} respuestas y genera el documento completo de Avatar del Comprador.
${context ? `\nCONTEXTO DEL NEGOCIO:\n${context}\n` : ''}
DATOS CUANTITATIVOS (preguntas cerradas):
${JSON.stringify(quantColumns, null, 2)}

DATOS CUALITATIVOS (preguntas abiertas — respuestas reales):
${JSON.stringify(qualColumns, null, 2)}

Genera el documento COMPLETO con las 11 secciones. Usa SOLO datos reales de la encuesta.`;

    console.log('analyze-survey: calling Claude Opus 4.6, totalResponses:', totalResponses);

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
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error('Claude API error:', JSON.stringify(data.error));
      throw new Error(data.error.message || JSON.stringify(data.error));
    }

    const document = data.content?.[0]?.text || '';
    console.log('analyze-survey: success, document length:', document.length);

    return new Response(JSON.stringify({
      document,
      total_responses: totalResponses,
      quant_columns: quantColumns.length,
      qual_columns: qualColumns.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('analyze-survey error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

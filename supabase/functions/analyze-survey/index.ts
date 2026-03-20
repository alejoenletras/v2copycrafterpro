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

// Gemini JSON schema for structured output
const responseSchema = {
  type: 'OBJECT',
  properties: {
    executive_summary: { type: 'STRING', description: 'Párrafo de 4-5 oraciones con los hallazgos más importantes' },
    key_findings: { type: 'ARRAY', items: { type: 'STRING' }, description: '5 hallazgos clave con datos concretos' },
    quantitative: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          column:          { type: 'STRING' },
          top_answer:      { type: 'STRING' },
          insight:         { type: 'STRING' },
          notable_pattern: { type: 'STRING' },
        },
        required: ['column', 'top_answer', 'insight', 'notable_pattern'],
      },
    },
    qualitative_themes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          theme:                 { type: 'STRING' },
          description:           { type: 'STRING' },
          frequency:             { type: 'STRING' },
          sentiment:             { type: 'STRING' },
          verbatims:             { type: 'ARRAY', items: { type: 'STRING' } },
          marketing_implication: { type: 'STRING' },
        },
        required: ['theme', 'description', 'frequency', 'sentiment', 'verbatims', 'marketing_implication'],
      },
    },
    insights: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type:        { type: 'STRING' },
          title:       { type: 'STRING' },
          description: { type: 'STRING' },
          evidence:    { type: 'ARRAY', items: { type: 'STRING' } },
          action:      { type: 'STRING' },
        },
        required: ['type', 'title', 'description', 'evidence', 'action'],
      },
    },
    ad_angles: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          angle_type:     { type: 'STRING' },
          hook:           { type: 'STRING' },
          body_copy:      { type: 'STRING' },
          cta:            { type: 'STRING' },
          insight_source: { type: 'STRING' },
        },
        required: ['angle_type', 'hook', 'body_copy', 'cta', 'insight_source'],
      },
    },
    audience_dna: {
      type: 'OBJECT',
      properties: {
        ideal_client: { type: 'STRING', description: 'Descripción detallada del cliente ideal basada en datos reales de la encuesta' },
        core_belief:  { type: 'STRING', description: 'Creencias principales, miedos y motivaciones de la audiencia' },
        testimonials: { type: 'STRING', description: 'Tipo de transformaciones que busca la audiencia' },
        keywords:     { type: 'STRING', description: 'Vocabulario real que usa la audiencia, extraído de sus respuestas' },
      },
      required: ['ideal_client', 'core_belief', 'testimonials', 'keywords'],
    },
  },
  required: ['executive_summary', 'key_findings', 'quantitative', 'qualitative_themes', 'insights', 'ad_angles', 'audience_dna'],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { columns, context } = await req.json() as { columns: Column[]; context?: string };

    if (!columns || columns.length === 0) {
      return new Response(JSON.stringify({ error: 'No se recibieron columnas' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set — agrégala en Supabase Edge Functions Secrets');

    // Classify columns
    const quantColumns: Array<{ name: string; frequencies: ReturnType<typeof computeFrequencies> }> = [];
    const qualColumns: Array<{ name: string; sample: string[] }> = [];

    for (const col of columns) {
      const nonEmpty = col.values.filter(v => v.trim());
      const unique = new Set(nonEmpty.map(v => v.trim())).size;
      if (unique <= 15 && nonEmpty.length > 0) {
        quantColumns.push({ name: col.name, frequencies: computeFrequencies(col.values) });
      } else if (nonEmpty.length > 0) {
        qualColumns.push({ name: col.name, sample: nonEmpty.slice(0, 50) });
      }
    }

    const totalResponses = columns[0]?.values.filter(v => v.trim()).length ?? 0;

    const prompt = `Eres un experto en análisis de encuestas de marketing con 15 años de experiencia.
Analiza esta encuesta con ${totalResponses} respuestas totales.
${context ? `\nCONTEXTO DEL NEGOCIO:\n${context}\n` : ''}
DATOS CUANTITATIVOS (preguntas cerradas/opción múltiple/ratings):
${JSON.stringify(quantColumns, null, 2)}

DATOS CUALITATIVOS (preguntas abiertas — muestra de respuestas reales):
${JSON.stringify(qualColumns, null, 2)}

INSTRUCCIONES IMPORTANTES:
1. Extrae insights accionables: pain points, deseos, creencias, vocabulario exacto de la audiencia
2. Genera ángulos para anuncios basados en los datos reales
3. Para "type" en insights usa EXACTAMENTE uno de: pain_point, desire, belief, objection, trigger
4. Para "frequency" en qualitative_themes usa EXACTAMENTE uno de: muy común, común, ocasional
5. Para "sentiment" en qualitative_themes usa EXACTAMENTE uno de: positivo, negativo, neutro, mixto
6. OBLIGATORIO: Genera el campo "audience_dna" con un perfil de audiencia COMPLETO basado en los datos. Este campo es CRÍTICO — el usuario lo necesita para crear su DNA de audiencia. Incluye:
   - ideal_client: quién es, edad, situación, nivel de experiencia (basado en datos reales)
   - core_belief: qué creen, qué temen, qué los motiva (usando vocabulario real de las respuestas)
   - testimonials: qué transformación buscan, de dónde a dónde quieren ir
   - keywords: las palabras y frases exactas que usa la audiencia, copiadas de sus respuestas`;

    console.log('analyze-survey: calling Gemini 2.5 Flash, totalResponses:', totalResponses);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.3,
            maxOutputTokens: 8000,
          },
        }),
      }
    );

    const geminiData = await response.json();

    if (geminiData.error) {
      console.error('Gemini API error:', JSON.stringify(geminiData.error));
      throw new Error(geminiData.error.message || JSON.stringify(geminiData.error));
    }

    const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      console.error('Gemini empty response:', JSON.stringify(geminiData).slice(0, 500));
      throw new Error('Gemini no devolvió contenido');
    }

    console.log('analyze-survey: Gemini response length:', textContent.length);

    let analysis;
    try {
      analysis = JSON.parse(textContent);
    } catch (parseErr) {
      console.error('JSON parse error:', (parseErr as Error).message, 'Raw:', textContent.slice(0, 200));
      throw new Error('Error parseando respuesta de Gemini');
    }

    // Log whether audience_dna exists
    console.log('analyze-survey: audience_dna present:', !!analysis.audience_dna);
    if (analysis.audience_dna) {
      console.log('analyze-survey: audience_dna keys:', Object.keys(analysis.audience_dna).join(', '));
    }

    return new Response(JSON.stringify({
      analysis,
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

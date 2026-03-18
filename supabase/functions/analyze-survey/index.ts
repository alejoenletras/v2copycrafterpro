import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

interface Column {
  name: string;
  values: string[];
}

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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { columns, context } = await req.json() as { columns: Column[]; context?: string };

    if (!columns || columns.length === 0) {
      return new Response(JSON.stringify({ error: 'No se recibieron columnas' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Classify columns: <=15 unique values → quantitative, otherwise qualitative
    const quantColumns: Array<{ name: string; frequencies: ReturnType<typeof computeFrequencies> }> = [];
    const qualColumns: Array<{ name: string; sample: string[] }> = [];

    for (const col of columns) {
      const nonEmpty = col.values.filter(v => v.trim());
      const unique = new Set(nonEmpty.map(v => v.trim())).size;
      if (unique <= 15 && nonEmpty.length > 0) {
        quantColumns.push({ name: col.name, frequencies: computeFrequencies(col.values) });
      } else if (nonEmpty.length > 0) {
        // Send sample of up to 60 responses for qualitative analysis
        qualColumns.push({ name: col.name, sample: nonEmpty.slice(0, 60) });
      }
    }

    const totalResponses = columns[0]?.values.filter(v => v.trim()).length ?? 0;

    const systemPrompt = `Eres un experto en análisis de encuestas de marketing con 15 años de experiencia.
Tu especialidad es extraer insights accionables para crear estrategias de marketing, definir perfiles de audiencia y generar ángulos de comunicación efectivos.
Analiza con rigor estadístico los datos cuantitativos y con profundidad psicológica los cualitativos.
Identifica patrones, pain points, deseos, creencias limitantes y el vocabulario exacto de la audiencia.
Fundamenta SIEMPRE tus conclusiones en los datos concretos de la encuesta.
Responde ÚNICAMENTE con JSON válido, sin texto adicional antes ni después.`;

    const userPrompt = `Analiza esta encuesta de marketing con ${totalResponses} respuestas totales.
${context ? `\nCONTEXTO DEL NEGOCIO:\n${context}\n` : ''}
DATOS CUANTITATIVOS (preguntas cerradas / opción múltiple / ratings):
${JSON.stringify(quantColumns, null, 2)}

DATOS CUALITATIVOS (preguntas abiertas — muestra de respuestas reales):
${JSON.stringify(qualColumns, null, 2)}

Genera el análisis completo con exactamente este JSON:
{
  "executive_summary": "párrafo de 4-5 oraciones con los hallazgos más importantes y qué implican para el negocio",
  "key_findings": [
    "hallazgo 1 con dato concreto",
    "hallazgo 2 con dato concreto",
    "hallazgo 3 con dato concreto",
    "hallazgo 4 con dato concreto",
    "hallazgo 5 con dato concreto"
  ],
  "quantitative": [
    {
      "column": "nombre de la pregunta",
      "top_answer": "respuesta más frecuente con porcentaje",
      "insight": "qué nos dice este dato para marketing",
      "notable_pattern": "patrón o dato llamativo adicional"
    }
  ],
  "qualitative_themes": [
    {
      "theme": "nombre del tema (2-4 palabras)",
      "description": "descripción del patrón identificado",
      "frequency": "muy común | común | ocasional",
      "sentiment": "positivo | negativo | neutro | mixto",
      "verbatims": ["cita textual exacta 1", "cita textual exacta 2", "cita textual exacta 3"],
      "marketing_implication": "cómo usar este tema en la comunicación"
    }
  ],
  "insights": [
    {
      "type": "pain_point | desire | belief | objection | trigger",
      "title": "título corto del insight (máx 6 palabras)",
      "description": "descripción detallada del insight",
      "evidence": ["dato o cita que lo respalda"],
      "action": "cómo aplicarlo en marketing o comunicación"
    }
  ],
  "ad_angles": [
    {
      "angle_type": "dolor | deseo | prueba_social | transformación | objeción",
      "hook": "gancho de apertura del anuncio (máx 15 palabras, primera persona o pregunta directa)",
      "body_copy": "cuerpo del anuncio (2-3 oraciones que desarrollan el hook)",
      "cta": "llamado a la acción claro",
      "insight_source": "en qué dato o patrón de la encuesta se basa este ángulo"
    }
  ],
  "audience_dna": {
    "ideal_client": "descripción detallada del cliente ideal basada en los datos: quién es, qué hace, situación actual, contexto de vida (3-4 oraciones usando el lenguaje real de las respuestas)",
    "core_belief": "creencias profundas, miedos, frustraciones y deseos que reveló la encuesta — especificidad máxima con citas o paráfrasis reales",
    "testimonials": "tipos de resultados y transformaciones que buscan, cómo los expresarían ellos mismos según sus respuestas (usa su vocabulario exacto)",
    "keywords": "vocabulario exacto que usa esta audiencia en sus respuestas separado por comas — mínimo 15 términos o frases"
  }
}`;

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 6000,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });

    const text = (response.content[0] as { type: string; text: string }).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No se pudo parsear la respuesta del modelo');

    const analysis = JSON.parse(jsonMatch[0]);

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

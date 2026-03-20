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

// No responseSchema — Gemini structured output via prompt is more stable

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

    const prompt = `Eres un experto en análisis de encuestas de marketing. Analiza esta encuesta con ${totalResponses} respuestas.
${context ? `CONTEXTO: ${context}\n` : ''}
DATOS CUANTITATIVOS:
${JSON.stringify(quantColumns, null, 2)}

DATOS CUALITATIVOS:
${JSON.stringify(qualColumns, null, 2)}

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin backticks, sin texto antes o después). El JSON debe tener EXACTAMENTE esta estructura:

{
  "executive_summary": "párrafo resumen 4-5 oraciones",
  "key_findings": ["hallazgo 1", "hallazgo 2", "hallazgo 3", "hallazgo 4", "hallazgo 5"],
  "quantitative": [{"column": "nombre", "top_answer": "respuesta más común", "insight": "qué significa", "notable_pattern": "patrón detectado"}],
  "qualitative_themes": [{"theme": "nombre del tema", "description": "descripción", "frequency": "muy común|común|ocasional", "sentiment": "positivo|negativo|neutro|mixto", "verbatims": ["cita 1", "cita 2"], "marketing_implication": "implicación"}],
  "insights": [{"type": "pain_point|desire|belief|objection|trigger", "title": "título", "description": "descripción", "evidence": ["evidencia 1"], "action": "acción recomendada"}],
  "ad_angles": [{"angle_type": "dolor|deseo|prueba_social|transformación|objeción", "hook": "gancho", "body_copy": "cuerpo del anuncio", "cta": "call to action", "insight_source": "basado en qué insight"}],
  "audience_dna": {"ideal_client": "descripción detallada del cliente ideal", "core_belief": "creencias, miedos y motivaciones", "testimonials": "transformaciones que busca la audiencia", "keywords": "vocabulario exacto que usa la audiencia"}
}

REGLAS:
- No uses comillas sin escapar dentro de strings. Escapa comillas internas con backslash.
- audience_dna es OBLIGATORIO. Basa cada campo en datos reales de la encuesta.
- Máximo 3 items en quantitative, 3 en qualitative_themes, 5 en insights, 3 en ad_angles.
- Responde SOLO el JSON. Nada más.`;

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
            temperature: 0.3,
            maxOutputTokens: 16000,
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
    } catch {
      // Fallback: try to extract JSON from the response
      console.log('Direct parse failed, trying extraction. Raw start:', textContent.slice(0, 300));
      console.log('Raw end:', textContent.slice(-300));
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[0]);
        } catch {
          console.error('Extraction also failed. Full raw length:', textContent.length);
          throw new Error('Error parseando respuesta de Gemini — JSON inválido');
        }
      } else {
        throw new Error('Gemini no devolvió JSON válido');
      }
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

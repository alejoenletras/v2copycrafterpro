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

const analysisToolSchema = {
  name: 'deliver_survey_analysis',
  description: 'Entrega el análisis completo de la encuesta de marketing',
  input_schema: {
    type: 'object' as const,
    properties: {
      executive_summary: { type: 'string' as const },
      key_findings: { type: 'array' as const, items: { type: 'string' as const } },
      quantitative: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            column: { type: 'string' as const }, top_answer: { type: 'string' as const },
            insight: { type: 'string' as const }, notable_pattern: { type: 'string' as const },
          },
          required: ['column', 'top_answer', 'insight', 'notable_pattern'],
        },
      },
      qualitative_themes: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            theme: { type: 'string' as const }, description: { type: 'string' as const },
            frequency: { type: 'string' as const, enum: ['muy común', 'común', 'ocasional'] },
            sentiment: { type: 'string' as const, enum: ['positivo', 'negativo', 'neutro', 'mixto'] },
            verbatims: { type: 'array' as const, items: { type: 'string' as const } },
            marketing_implication: { type: 'string' as const },
          },
          required: ['theme', 'description', 'frequency', 'sentiment', 'verbatims', 'marketing_implication'],
        },
      },
      insights: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            type: { type: 'string' as const, enum: ['pain_point', 'desire', 'belief', 'objection', 'trigger'] },
            title: { type: 'string' as const }, description: { type: 'string' as const },
            evidence: { type: 'array' as const, items: { type: 'string' as const } },
            action: { type: 'string' as const },
          },
          required: ['type', 'title', 'description', 'evidence', 'action'],
        },
      },
      ad_angles: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            angle_type: { type: 'string' as const }, hook: { type: 'string' as const },
            body_copy: { type: 'string' as const }, cta: { type: 'string' as const },
            insight_source: { type: 'string' as const },
          },
          required: ['angle_type', 'hook', 'body_copy', 'cta', 'insight_source'],
        },
      },
      audience_dna: {
        type: 'object' as const,
        properties: {
          ideal_client: { type: 'string' as const, description: `Perfil ULTRA detallado del cliente ideal basado en datos reales de la encuesta. Incluye TODO esto en un solo texto largo y rico:
- DATOS DEMOGRÁFICOS: Nombre representativo, edad, breve descripción de quién es y su situación actual, mercado objetivo, avatar representativo
- PROBLEMA PRINCIPAL: El problema central que enfrentan (con carga emocional), problemas secundarios (mínimo 4), 5 emociones viscerales que sienten
- 5 MAYORES MIEDOS: Incluir el miedo principal y 4 miedos secundarios, todos específicos y viscerales
- DESEOS SECRETOS MÁS PROFUNDOS: Lo que realmente quieren en el fondo (mínimo 3)
- CÓMO AFECTAN SUS MIEDOS SUS RELACIONES: Con pareja, hijos, amigos, padres, consigo mismo
- 5 FRASES OFENSIVAS que personas cercanas les dicen (conversacionales pero dolorosas)
Usa datos REALES de la encuesta. Cita respuestas textualmente cuando sea posible.` },
          core_belief: { type: 'string' as const, description: `Creencias, objeciones y framework persuasivo. Incluye TODO esto:
- CREENCIA PRINCIPAL que los frena (la que deben romper para comprar)
- Por qué está EQUIVOCADA con argumentación completa
- 4 CREENCIAS SECUNDARIAS con su refutación (cada una: la creencia, por qué está mal, la visión correcta)
- OBJECIONES DEL MERCADO: 5 objeciones principales, objeciones prácticas (barreras de recursos), objeciones emocionales (resistencias internas)
- FRAMEWORK EJACA: Cómo podemos (1) Encorajar sus sueños, (2) Justificar sus errores, (3) Aliviar sus miedos, (4) Confirmar sus sospechas, (5) Apuntar la culpa a sus enemigos — con frases concretas para cada uno
Basa todo en el vocabulario real de las respuestas de la encuesta.` },
          testimonials: { type: 'string' as const, description: `Transformación completa y prueba social. Incluye TODO esto:
- TRANSFORMACIÓN PRIMARIA: Si un genio pudiera darles la solución perfecta, cómo sería su vida
- CÓMO AFECTARÍA SUS RELACIONES: El cambio en pareja, hijos, amigos, familia
- IDENTIDAD TRANSFORMADA: Quién quieren SER o cómo quieren ser VISTOS
- FUTURO PRESUMIDO DE ÉXITO: Descripción concreta del futuro que imaginan
- BENEFICIOS PRÁCTICOS: 5 resultados tangibles y medibles
- BENEFICIOS EMOCIONALES: 5 sentimientos y estados internos deseados (certeza, alivio, confianza, claridad, paz)
- QUÉ HAN INTENTADO ANTES: 3-5 soluciones que probaron y fallaron, y por qué fallaron
- SOLUCIONES QUE NO QUIEREN: Qué están hartos de intentar
Extrae de las respuestas reales de la encuesta.` },
          keywords: { type: 'string' as const, description: `Vocabulario COMPLETO de la audiencia extraído de las respuestas reales. Incluye:
- PALABRAS PODEROSAS: Mínimo 10 palabras individuales que la audiencia usa con frecuencia (esgotado, paralisado, incerteza, etc.)
- FRASES PODEROSAS: Mínimo 8 frases textuales que la audiencia dice naturalmente en sus respuestas
- EN QUÉ BASAN SU ÉXITO: Cómo mide esta audiencia si algo funciona o no
- KEYWORDS DE MARKETING: 5-10 keywords de posicionamiento relevantes para esta audiencia
Todo debe ser TEXTUAL de las respuestas de la encuesta, no inventado.` },
        },
        required: ['ideal_client', 'core_belief', 'testimonials', 'keywords'],
      },
    },
    required: ['executive_summary', 'key_findings', 'quantitative', 'qualitative_themes', 'insights', 'ad_angles', 'audience_dna'],
  },
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

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');

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

    const userPrompt = `Eres un experto en análisis de encuestas de marketing.
Analiza esta encuesta con ${totalResponses} respuestas y entrega el análisis completo usando la herramienta deliver_survey_analysis.
${context ? `\nCONTEXTO: ${context}\n` : ''}
DATOS CUANTITATIVOS:
${JSON.stringify(quantColumns, null, 2)}

DATOS CUALITATIVOS (muestra):
${JSON.stringify(qualColumns, null, 2)}

IMPORTANTE — audience_dna es el campo MÁS CRÍTICO de todo el análisis:
- Cada campo de audience_dna debe ser un texto LARGO y ULTRA DETALLADO (mínimo 300 palabras por campo)
- Usa datos REALES y citas TEXTUALES de las respuestas de la encuesta
- Sigue las instrucciones de cada campo al pie de la letra — incluye TODOS los sub-elementos listados
- El ideal_client debe incluir: datos demográficos, problema principal, problemas secundarios, emociones, miedos, deseos secretos, impacto en relaciones, frases ofensivas que les dicen
- El core_belief debe incluir: creencia principal + refutación, 4 creencias secundarias, objeciones, framework EJACA completo
- El testimonials debe incluir: transformación primaria, identidad transformada, beneficios prácticos y emocionales, qué han intentado antes
- El keywords debe incluir: palabras poderosas, frases textuales, métricas de éxito, keywords de marketing

Limita a máximo 4 items en quantitative, 4 en qualitative_themes, 5 en insights, 3 en ad_angles.`;

    console.log('analyze-survey: calling Claude Sonnet, totalResponses:', totalResponses);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        tools: [analysisToolSchema],
        tool_choice: { type: 'tool', name: 'deliver_survey_analysis' },
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Claude API error:', JSON.stringify(data.error));
      throw new Error(data.error.message || JSON.stringify(data.error));
    }

    const toolUse = data.content?.find((b: any) => b.type === 'tool_use');
    if (!toolUse) {
      console.error('No tool_use in response:', JSON.stringify(data.content).slice(0, 500));
      throw new Error('Claude no invocó la herramienta de análisis');
    }

    const analysis = toolUse.input;
    console.log('analyze-survey: success. audience_dna present:', !!analysis.audience_dna);

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

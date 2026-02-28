import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `IDENTIDAD: Eres el copywriter #1 de video ads en Latinoamérica. Tu especialidad es estudiar anuncios ganadores (que llevan semanas corriendo con dinero real) y CREAR GUIONES COMPLETAMENTE NUEVOS inspirados en la estructura persuasiva de esos anuncios, pero escritos 100% para otro experto, otro producto y otra audiencia.

IMPORTANTE — LO QUE HACES vs LO QUE NO HACES:
- NO copias ni transcribes los anuncios originales
- NO haces cambios cosméticos ni parafraseas el texto original
- SÍ estudias la TÉCNICA: qué tipo de hook usa (pregunta, estadística, declaración poderosa, historia, etc), qué estructura persuasiva tiene el cuerpo (problema-agitación-solución, storytelling, testimonio, etc), cómo cierra el CTA
- SÍ CREAS un guión 100% NUEVO desde cero usando esa misma técnica pero para el experto, producto y audiencia indicados
- El resultado debe sonar como si el EXPERTO lo hubiera escrito él mismo, NO como una versión modificada del anuncio original

=== EJEMPLO DE CÓMO FUNCIONA ===

Si el anuncio original dice:
"¿Sabías que el 80% de los negocios fracasan en marketing? Yo soy Pedro y mi agencia XYZ te ayuda a escalar a 6 cifras con Facebook Ads..."

Y el DNA del experto es un coach de fitness llamada Laura que vende un programa de entrenamiento:

❌ MAL (esto es COPIAR/PARAFRASEAR):
"¿Sabías que el 80% de las personas fracasan en fitness? Yo soy Laura y mi programa te ayuda a lograr tu cuerpo ideal..."

✅ BIEN (esto es CREAR NUEVO usando la misma TÉCNICA de hook de autoridad + estadística):
"Llevo 8 años entrenando personas y hay un error que veo repetirse todos los días en el gym. 9 de cada 10 mujeres lo cometen sin darse cuenta..."

=== FIN DEL EJEMPLO ===

PROCESO para cada anuncio:
1. Identifica la TÉCNICA del hook (pregunta, estadística, declaración, historia, prueba social, etc.)
2. Identifica la ESTRUCTURA del cuerpo (PAS, storytelling, lista de beneficios, antes/después, etc.)
3. Identifica el TIPO de CTA (urgencia, escasez, invitación, reto, etc.)
4. CREA un guión COMPLETAMENTE NUEVO usando esas mismas técnicas pero:
   - Con la VOZ y tono del experto (según su DNA)
   - Hablando de SU producto/servicio específico
   - Dirigido a SU audiencia específica (sus dolores, deseos, lenguaje)
   - Con ejemplos, historias y referencias del MUNDO del experto, no del anuncio original

REGLAS INQUEBRANTABLES:
- CERO texto copiado del anuncio original. Ni una frase. Todo es NUEVO.
- Frases cortas. Párrafos de máximo 3 líneas. Escrito para ser HABLADO en video.
- Español latinoamericano. Tono conversacional, directo, sin corporativismos.
- Si el original tiene elementos visuales, inventa nuevas direcciones visuales para el contexto del experto.
- El CTA debe dirigir a la acción específica del experto (su producto, su clase, su servicio).
- Máximo 2 hooks y 2 CTAs por anuncio.
- CADA mención de producto, marca, oferta, precio o beneficio debe ser del EXPERTO, nunca del anuncio original.

FORMATO DE RESPUESTA (JSON array):
[
  {
    "content_number": 1,
    "referente": "Ad de [nombre del advertiser] — Técnica: [tipo de hook + técnica del cuerpo identificada]",
    "hook_1": "Texto del primer hook NUEVO, escrito en la voz del experto...",
    "hook_2": "Texto del segundo hook NUEVO, diferente enfoque pero misma técnica...",
    "cuerpo": "Texto NUEVO del cuerpo completo. Incluye [DIRECCIONES VISUALES] donde aplique...",
    "cta_1": "CTA NUEVO dirigido específicamente al producto/servicio del experto...",
    "cta_2": "Segundo CTA NUEVO con enfoque diferente..."
  }
]

Devuelve SOLO el JSON array válido, sin texto antes ni después.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { ads, dna_context } = await req.json();

    if (!ads || !Array.isArray(ads) || ads.length === 0) {
      return new Response(JSON.stringify({ error: 'ads array required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build DNA context block
    const personality = dna_context?.personality;
    const audience = dna_context?.audience;
    const product = dna_context?.product;

    const dnaBlock = `
=== DNA DEL EXPERTO ===

PERSONALIDAD / VOZ:
${personality?.about || 'No especificado'}

TONO Y ESTILO:
${personality?.voice || 'No especificado'}

CREDENCIALES:
${personality?.credentials || 'No especificado'}

PALABRAS PROHIBIDAS:
${personality?.forbidden_words || 'Ninguna'}

=== AUDIENCIA OBJETIVO ===

CLIENTE IDEAL:
${audience?.ideal_client || 'No especificado'}

CREENCIA CENTRAL:
${audience?.core_belief || 'No especificado'}

PALABRAS QUE USA EL PÚBLICO:
${audience?.keywords || 'No especificado'}

TESTIMONIOS/PRUEBA SOCIAL:
${audience?.testimonials || 'No especificado'}

=== PRODUCTO/SERVICIO ===

PROBLEMA QUE RESUELVE:
${product?.main_problem || 'No especificado'}

PROMESA/TRANSFORMACIÓN:
${product?.solution_promise || 'No especificado'}

OFERTA IRRESISTIBLE:
${product?.irresistible_offer || 'No especificado'}

PALABRAS CLAVE:
${product?.keywords || 'No especificado'}
`.trim();

    // Build ads block
    const adsBlock = ads.map((ad, i) => `
--- ANUNCIO #${i + 1} ---
Advertiser: ${ad.advertiser_name}
${ad.days_running ? `Días activo: ${ad.days_running} días (anuncio ganador comprobado)` : ''}
Título/Headline: ${ad.headline || 'N/A'}
CTA original: ${ad.cta_text || 'N/A'}

COPY ORIGINAL:
${ad.ad_text}
`.trim()).join('\n\n');

    const userPrompt = `${dnaBlock}

=== ANUNCIOS REFERENTES (estudia la técnica, NO copies el texto) ===

${adsBlock}

INSTRUCCIÓN: Estudia la técnica persuasiva de cada anuncio y CREA ${ads.length} guiones 100% NUEVOS para el experto descrito en el DNA. NO copies ni parafrasees el texto original — crea contenido nuevo usando la misma técnica. Devuelve el JSON array.`;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      return new Response(JSON.stringify({ error: `Claude error: ${claudeRes.status}`, detail: err }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const claudeData = await claudeRes.json();
    const rawText = claudeData.content?.[0]?.text || '';

    // Parse JSON from response
    let scripts = [];
    try {
      scripts = JSON.parse(rawText);
    } catch {
      // Try extracting JSON array from text
      const match = rawText.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          scripts = JSON.parse(match[0]);
        } catch {
          scripts = [];
        }
      }
    }

    return new Response(JSON.stringify({ scripts, total: scripts.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('analyze-adapt-ads error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

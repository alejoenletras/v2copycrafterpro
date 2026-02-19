import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { projectId, part, action, content: clientContent } = body;
    
    if (!projectId) {
      console.error('Missing projectId');
      return new Response(
        JSON.stringify({ error: 'projectId es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key from secrets
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API Key de Anthropic no configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ═══ ACTION: SAVE (4ta llamada del frontend para autowebinar) ═══
    if (action === 'save') {
      console.log('Saving autowebinar content for project:', projectId);
      if (!clientContent) {
        return new Response(
          JSON.stringify({ error: 'content es requerido para action=save' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
      const validation = validateCopy(clientContent, project || {});
      const estimatedConversion = estimateConversion(project || {});
      
      const { data: savedCopy, error: saveError } = await supabase
        .from('generated_copies')
        .insert({
          project_id: projectId,
          content: clientContent,
          validation,
          estimated_conversion: estimatedConversion,
        })
        .select()
        .single();
      
      if (saveError) {
        console.error('Error saving copy:', saveError);
        return new Response(
          JSON.stringify({ error: 'Error al guardar el copy' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Copy saved with ID:', savedCopy.id);
      return new Response(
        JSON.stringify({ success: true, copy: savedCopy }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating copy for project:', projectId);

    // Fetch project
    console.log('Fetching project data...');
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error('Error fetching project:', projectError);
      return new Response(
        JSON.stringify({ error: 'No se pudo cargar el proyecto' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Project loaded:', project.id);
    console.log('Funnel type:', project.funnel_type);

    // ═══ AUTOWEBINAR SINGLE PART: genera UNA sola parte (part=1,2,3) ═══
    if (part && project.funnel_type === 'autowebinar') {
      const ep = project.expert_profile || {};
      const ap = project.avatar_profile || {};
      const ps = project.persuasion_strategy || {};
      const pi = project.product_info || {};
      const country = project.country || 'colombia';

      let prompt: string;
      let maxTokens: number;
      let label: string;

      if (part === 1) {
        prompt = buildAutowebinarPrompt_Part1(ep, ap, ps, pi, country);
        maxTokens = 12000;
        label = 'Parte 1: Landing+Webinar';
      } else if (part === 2) {
        prompt = buildAutowebinarPrompt_Part2(ep, ap, ps, pi, country);
        maxTokens = 10000;
        label = 'Parte 2: Emails';
      } else if (part === 3) {
        prompt = buildAutowebinarPrompt_Part3(ep, ap, ps, pi, country);
        maxTokens = 10000;
        label = 'Parte 3: WhatsApp';
      } else {
        return new Response(
          JSON.stringify({ error: 'part debe ser 1, 2 o 3' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Autowebinar ${label}: generando...`);
      const startTime = Date.now();
      const text = await callClaudeAPIWithRetry(anthropicApiKey, prompt, maxTokens, label);
      console.log(`Autowebinar ${label} completa (${Date.now() - startTime}ms), length: ${text.length}`);

      return new Response(
        JSON.stringify({ success: true, text, part }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══ FALLBACK AUTOWEBINAR: 3 llamadas en paralelo (si no viene part) ═══
    let generatedContent: string;

    if (project.funnel_type === 'autowebinar') {
      const ep = project.expert_profile || {};
      const ap = project.avatar_profile || {};
      const ps = project.persuasion_strategy || {};
      const pi = project.product_info || {};
      const country = project.country || 'colombia';

      const prompt1 = buildAutowebinarPrompt_Part1(ep, ap, ps, pi, country);
      const prompt2 = buildAutowebinarPrompt_Part2(ep, ap, ps, pi, country);
      const prompt3 = buildAutowebinarPrompt_Part3(ep, ap, ps, pi, country);

      const startTime = Date.now();

      console.log('Autowebinar FALLBACK: Iniciando generación en 3 partes EN PARALELO...');

      const [part1, part2, part3] = await Promise.all([
        callClaudeAPIWithRetry(anthropicApiKey, prompt1, 12000, 'Parte 1: Landing+Webinar'),
        callClaudeAPIWithRetry(anthropicApiKey, prompt2, 10000, 'Parte 2: Emails'),
        callClaudeAPIWithRetry(anthropicApiKey, prompt3, 10000, 'Parte 3: WhatsApp'),
      ]);

      console.log(`Parte 1 (Landing+Webinar): ${part1.length} caracteres`);
      console.log(`Parte 2 (Emails): ${part2.length} caracteres`);
      console.log(`Parte 3 (WhatsApp): ${part3.length} caracteres`);

      generatedContent = `<!-- SECTION:LANDING_WEBINAR -->\n${part1}\n\n<!-- SECTION:EMAILS -->\n${part2}\n\n<!-- SECTION:WHATSAPP -->\n${part3}`;
      console.log(`Autowebinar completo (${Date.now() - startTime}ms), total length: ${generatedContent.length}`);

    } else {
      // ═══ OTROS FUNNELS: llamada única (sin cambios) ═══
      const megaPrompt = buildMegaPrompt(project);
      console.log('Mega-prompt built, calling Claude API...');
      generatedContent = await callClaudeAPI(anthropicApiKey, megaPrompt, 8000);
    }

    console.log('Copy generated successfully, length:', generatedContent.length);

    // Validate copy
    const validation = validateCopy(generatedContent, project);
    
    // Estimate conversion
    const estimatedConversion = estimateConversion(project);

    // Save to database
    console.log('Saving generated copy to database...');
    const { data: savedCopy, error: saveError } = await supabase
      .from('generated_copies')
      .insert({
        project_id: projectId,
        content: generatedContent,
        validation: validation,
        estimated_conversion: estimatedConversion,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving copy:', saveError);
      return new Response(
        JSON.stringify({ error: 'Error al guardar el copy generado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Copy saved with ID:', savedCopy.id);

    return new Response(
      JSON.stringify({ success: true, copy: savedCopy }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ═══════════════════════════════════════════════════════════════
// CLAUDE API HELPERS
// ═══════════════════════════════════════════════════════════════

async function callClaudeAPI(apiKey: string, prompt: string, maxTokens: number): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || `Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callClaudeAPIWithRetry(apiKey: string, prompt: string, maxTokens: number, partLabel: string): Promise<string> {
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      return await callClaudeAPI(apiKey, prompt, maxTokens);
    } catch (error) {
      console.error(`${partLabel} intento ${attempt + 1} falló:`, (error as Error).message);
      if (attempt === 1) {
        throw new Error(`${partLabel} falló después de 2 intentos: ${(error as Error).message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  throw new Error('Unreachable');
}

// ═══════════════════════════════════════════════════════════════
// MEGA-PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════

function buildMegaPrompt(project: any): string {
  const ep = project.expert_profile || {};
  const ap = project.avatar_profile || {};
  const ps = project.persuasion_strategy || {};
  const pi = project.product_info || {};
  const ht = project.high_ticket_info || {};
  const saleads = project.saleads_config || {};
  const funnelType = project.funnel_type;
  // Para SaleADS, usar targetCountry de saleads_config
  const country = funnelType === 'vsl-saleads' 
    ? (saleads.targetCountry || project.country || 'multiple')
    : (project.country || 'colombia');
  const vslType = project.vsl_type;
  const vslMode = project.vsl_mode;
  const autoAnalysis = project.auto_analysis;

  // DETERMINE WHICH PROMPT TO USE
  if (funnelType === 'vsl-saleads') {
    return buildSaleADSVSLPrompt(saleads, country);
  } else if (funnelType === 'vsl' && vslMode === 'auto' && autoAnalysis) {
    // AUTO MODE: use the extracted brief as context
    return buildAutoVSLPrompt(autoAnalysis, vslType, country);
  } else if (funnelType === 'vsl' && vslType === 'high-ticket') {
    return buildHighTicketVSLPrompt(ep, ap, ps, pi, ht, country);
  } else if (funnelType === 'vsl') {
    return buildVSLPrompt(ep, ap, ps, pi, country);
  } else if (funnelType === 'launch') {
    return buildLaunchPrompt(ep, ap, ps, pi, country);
  } else if (funnelType === 'autowebinar') {
    // Autowebinar se maneja directamente en serve() con 3 llamadas.
    // Este fallback no debería alcanzarse, pero por seguridad:
    return buildAutowebinarPrompt_Part1(ep, ap, ps, pi, country);
  }

  // Fallback to direct sale VSL
  return buildVSLPrompt(ep, ap, ps, pi, country);
}

// ═══════════════════════════════════════════════════════════════
// VSL AUTO MODE - Brief extraído por IA
// ═══════════════════════════════════════════════════════════════

function buildAutoVSLPrompt(aa: any, vslType: string, country: string): string {
  const isHighTicket = vslType === 'high-ticket';
  const countryName = getCountryName(country);

  return `
═══════════════════════════════════════════════════════════════
GENERACIÓN DE VSL PROFESIONAL - MODO AUTOMÁTICO (25 MINUTOS)
═══════════════════════════════════════════════════════════════

Tu misión es crear un guión de VSL ${isHighTicket ? 'High Ticket (calificación a llamada estratégica)' : 'de Venta Directa'} de 25 minutos.
El brief fue extraído automáticamente por IA desde el contenido real del experto.

País objetivo: ${countryName}
Tipo: ${isHighTicket ? 'HIGH TICKET — CTA a llamada estratégica' : 'VENTA DIRECTA — CTA a checkout inmediato'}

═══════════════════════════════════════════════════════════════
BRIEF COMPLETO DEL EXPERTO Y SU OFERTA
═══════════════════════════════════════════════════════════════

1. CORE DE LA OFERTA:
${aa.offerCore || 'No disponible'}

2. PAIN POINTS PRINCIPALES DEL AVATAR:
${aa.mainPainPoints || 'No disponible'}

3. TRANSFORMACIÓN PROMETIDA:
${aa.promisedTransformation || 'No disponible'}

4. AUDIENCIA OBJETIVO:
${aa.targetAudience || 'No disponible'}

5. AUTORIDAD DEL EXPERTO:
${aa.authority || 'No disponible'}

6. MECANISMO ÚNICO DEL PROBLEMA:
${aa.uniqueProblemMechanism || 'No disponible'}

7. MECANISMO ÚNICO DE LA SOLUCIÓN:
${aa.uniqueSolutionMechanism || 'No disponible'}

8. VOZ Y COMUNICACIÓN DEL EXPERTO:
${aa.voiceAndCommunication || 'No disponible'}

9. ROL DEL EXPERTO Y CONEXIÓN CON AUDIENCIA:
${aa.expertRole || 'No disponible'}

10. ESTRUCTURA DE LA OFERTA COMPLETA:
${aa.offerStructure || 'No disponible'}

11. ESTRUCTURA VSL SUGERIDA (úsala como guía):
${aa.vslStructure || 'No disponible'}

12. PREVIEW DE LA ESTRUCTURA DE VALOR:
${aa.offerStructurePreview || 'No disponible'}

13. PROYECCIÓN DE CONVERSIÓN:
${aa.conversionProjection || 'No disponible'}

═══════════════════════════════════════════════════════════════
INSTRUCCIONES DE ESCRITURA
═══════════════════════════════════════════════════════════════

USA TODO EL BRIEF ANTERIOR como contexto primario.
Escribe EXACTAMENTE con la voz, tono y estilo del experto descrito en el punto 8.
Conecta con la audiencia de la forma en que el experto lo hace (punto 9).

${isHighTicket ? `
🎯 MODO HIGH TICKET:
- El objetivo NO es vender directamente sino CALIFICAR leads para una llamada estratégica
- CTA principal: "Aplica ahora para tu llamada estratégica / sesión de diagnóstico"
- Filtra activamente a quienes NO califican (esto aumenta el deseo de quienes sí califican)
- Enfatiza exclusividad, transformación profunda y resultados a largo plazo
- NO des precio exacto en el VSL
` : `
🎯 MODO VENTA DIRECTA:
- El objetivo es lograr la COMPRA INMEDIATA
- CTA principal: Botón de compra directo al checkout
- Crea urgencia y escasez genuinas basadas en la oferta real
- Incluye el precio y el stack de valor completo
`}

📝 FORMATO REQUERIDO (obligatorio):
• USA MARKDOWN con ## para cada sección
• INCLUYE timestamps [MM:SS] cada 30-60 segundos
• AGREGA notas [TONO: texto] para el locutor en momentos clave
• INCLUYE notas [B-ROLL: descripción] para el editor
• MARCA los CTA con [CTA PRINCIPAL] o [CTA SECUNDARIO]
• SEÑALA pausas dramáticas con [PAUSA 3 SEG]
• Usa el lenguaje y expresiones culturales de ${countryName}

🎬 ESTRUCTURA OBLIGATORIA (25 minutos):

## [00:00-02:30] HOOK EMOCIONAL BRUTAL
## [02:30-07:00] HISTORIA DE TRANSFORMACIÓN DEL EXPERTO
## [07:00-12:00] AGITACIÓN DEL PROBLEMA (mecanismo único del problema)
## [12:00-18:00] PRESENTACIÓN DE LA SOLUCIÓN (mecanismo único de solución)
## [18:00-21:00] PRUEBA SOCIAL MASIVA (testimonios, casos de éxito, datos)
## [21:00-24:00] PRESENTACIÓN DE OFERTA + STACK DE VALOR
## [24:00-25:00] DESTRUCCIÓN DE OBJECIONES + URGENCIA + CTA FINAL

GENERA EL GUIÓN COMPLETO AHORA. Longitud objetivo: 4,500-5,500 palabras.
`;
}

// ═══════════════════════════════════════════════════════════════
// VSL OPTIMIZADO (25 MINUTOS)
// ═══════════════════════════════════════════════════════════════

function buildVSLPrompt(ep: any, ap: any, ps: any, pi: any, country: string): string {
  return `
═══════════════════════════════════════════════════════════════
GENERACIÓN DE VSL PROFESIONAL - 25 MINUTOS
═══════════════════════════════════════════════════════════════

Tu misión es crear un guión de VSL (Video Sales Letter) de 25 minutos que sea:
- Emocionalmente cautivador desde el primer segundo
- Culturalmente adaptado para ${getCountryName(country)}
- Estructurado para máxima conversión (objetivo: 2.5-4%)
- Listo para producción con notas técnicas completas

═══════════════════════════════════════════════════════════════
PILAR 1: IDENTIDAD DEL EXPERTO
═══════════════════════════════════════════════════════════════

QUIÉN HABLA EN EL VIDEO:
Nombre: ${ep?.voice?.name || 'El Experto'}
Tono de voz: ${ep?.voice?.adjectives?.join(', ') || 'Profesional, Cercano'}
Nivel de humor: ${ep?.voice?.humorLevel || 'medio'}
Estilo de frases: ${ep?.voice?.sentenceLength || 'medio'} (varía entre cortas impactantes y largas explicativas)

HISTORIA DE TRANSFORMACIÓN (ÚSALA ESTRATÉGICAMENTE):

🔻 Momento Más Bajo (vulnerable, relatable):
"${ep?.story?.lowestPoint || 'Historia pendiente'}"

💡 El Descubrimiento (turning point):
"${ep?.story?.breakthrough || 'Breakthrough pendiente'}"

🎯 Situación Actual (credibilidad):
"${ep?.story?.current || 'Situación actual pendiente'}"

CREENCIAS DEL EXPERTO (mencionar sutilmente a lo largo del VSL):
${ep?.beliefs?.beliefs?.map((b: string, i: number) => `${i + 1}. "${b}"`).join('\n') || '1. Creencia pendiente'}

Enemigo Común: ${ep?.beliefs?.commonEnemy || 'Sistemas obsoletos'}
Promesa Central: "${ep?.beliefs?.centralPromise || 'Transformación garantizada'}"

═══════════════════════════════════════════════════════════════
PILAR 2: CONOCIMIENTO PROFUNDO DEL AVATAR
═══════════════════════════════════════════════════════════════

NIVEL DE CONCIENCIA: ${ap?.consciousnessLevel ?? 1}
${getConsciousnessStrategy(ap?.consciousnessLevel)}

🔴 DOLOR PRIMARIO (mencionar mínimo 5 veces):
"${ap?.pains?.primary || 'El dolor principal del avatar'}"

DOLORES POR DIMENSIÓN (agitar estratégicamente):

💰 ECONÓMICOS (mencionar en minutos 5-8):
${ap?.pains?.economic?.map((p: string) => `• "${p}"`).join('\n') || '• Dolor económico'}

😔 EMOCIONALES (mencionar en minutos 1-3 y 8-10):
${ap?.pains?.emotional?.map((p: string) => `• "${p}"`).join('\n') || '• Dolor emocional'}

👥 SOCIALES (mencionar en minutos 8-12):
${ap?.pains?.social?.map((p: string) => `• "${p}"`).join('\n') || '• Dolor social'}

🪞 IDENTIDAD (mencionar en minutos 10-15):
${ap?.pains?.identity?.map((p: string) => `• "${p}"`).join('\n') || '• Dolor de identidad'}

TRANSFORMACIÓN DESEADA:
"${ap?.desires?.identityTransformation || 'La transformación que buscan'}"

RESULTADOS TANGIBLES PROMETIDOS:
- Económicos: ${ap?.desires?.tangibleResults?.economic || 'Resultado económico'}
- Estilo de vida: ${ap?.desires?.tangibleResults?.lifestyle || 'Estilo de vida'}
- Relaciones: ${ap?.desires?.tangibleResults?.relationships || 'Mejora relaciones'}

Marco Temporal: ${ap?.desires?.timeframe || '90 días'}

OBJECIONES REALES (destruir entre minutos 22-24):
${ap?.objections?.map((obj: any, i: number) => `
${i + 1}. "${obj.exact_words}"
   Raíz real: ${obj.root_cause}
   Cómo destruirla: ${obj.destruction}
`).join('\n') || '1. Objeción pendiente'}

LENGUAJE EXACTO DEL AVATAR:
${ap?.language?.join(', ') || 'palabras clave del avatar'}

═══════════════════════════════════════════════════════════════
PILAR 3: ESTRATEGIA DE PERSUASIÓN
═══════════════════════════════════════════════════════════════

GATILLOS MENTALES ACTIVADOS (aplicar en momentos específicos):
${ps?.mentalTriggers?.filter((t: any) => t.enabled).map((t: any) => `
✅ ${t.name}
   Aplicación: ${t.application}
   Momento óptimo: ${t.timing}
`).join('\n') || 'Gatillos pendientes'}

═══════════════════════════════════════════════════════════════
INFORMACIÓN DEL PRODUCTO
═══════════════════════════════════════════════════════════════

Nombre: "${pi?.name || 'El Producto'}"
Problema que soluciona: "${pi?.audienceProblem || 'Problema principal de la audiencia'}"
Solución del producto: "${pi?.solution || 'Solución principal'}"
Oferta basada en transformación: "${pi?.transformationOffer || 'Oferta de transformación'}"
${pi?.benefitBullets?.length ? `Bullets de beneficios:\n${pi.benefitBullets.map((b: string, i: number) => `${i + 1}. ${b}`).join('\n')}` : ''}
${pi?.keywords?.length ? `Palabras clave de la oferta: ${pi.keywords.join(', ')}` : ''}
Precio Final: $${pi?.price || '997'}
${pi?.paymentPlan?.enabled ? `Plan de Pagos: ${pi.paymentPlan.installments} cuotas de $${pi.paymentPlan.installmentPrice}` : ''}
Garantía: ${pi?.guaranteePeriod || '60'} días - ${pi?.guaranteeDescription || '100% reembolso sin preguntas'}

BONOS INCLUIDOS:
${pi?.bonuses?.map((b: any, i: number) => `${i + 1}. ${b.name} (Valor: $${b.value})`).join('\n') || 'Bonos pendientes'}

Valor Total del Stack: $${pi?.bonuses?.reduce((acc: number, b: any) => acc + (b.value || 0), 0) + (pi?.price || 997)} (anclaje)

País Objetivo: ${getCountryDetails(country)}

═══════════════════════════════════════════════════════════════
INSTRUCCIONES CRÍTICAS DE GENERACIÓN
═══════════════════════════════════════════════════════════════

🎯 OBJETIVO: Crear un guión de VSL de 25 minutos optimizado para conversión 2.5-4%

📝 FORMATO REQUERIDO:
1. USA MARKDOWN con ## para secciones principales
2. INCLUYE timestamps exactos [MM:SS] cada 15-30 segundos
3. AGREGA notas de [TONO:] para guiar al locutor
4. INCLUYE notas de [B-ROLL:] para el editor
5. MARCA los [CTA] claramente
6. SEÑALA pausas dramáticas con [PAUSA 3 SEG]
7. USA las palabras EXACTAS del avatar (no parafrasees)

🎬 ESTRUCTURA OBLIGATORIA (25 MINUTOS):

## [00:00-02:30] HOOK EMOCIONAL BRUTAL
- PRIMER FRASE: Debe conectar directo con el dolor primario
- Crear curiosidad irresistible (patrón interrupt)
- Prometer una solución específica
- [TONO:] Empático pero urgente
- [B-ROLL:] Imágenes emotivas relacionadas al dolor

## [02:30-07:00] HISTORIA DE TRANSFORMACIÓN
- Momento más bajo (vulnerable, específico, relatable)
- El descubrimiento que cambió todo
- Situación actual (credibilidad sin arrogancia)
- Usar lenguaje del avatar
- [TONO:] Vulnerable al inicio, esperanzador al final

## [07:00-12:00] AGITACIÓN DEL PROBLEMA
- Profundizar en las 4 dimensiones de dolor
- Mostrar consecuencias de NO actuar (futuro oscuro)
- Usar ejemplos específicos de ${country}
- Contrastar con quienes SÍ están avanzando
- [TONO:] Directo, sin suavizar el dolor

## [12:00-18:00] PRESENTACIÓN DE LA SOLUCIÓN
- Darle NOMBRE al método (hacerlo único)
- Explicar POR QUÉ es diferente (mecanismo único)
- 3 pilares o pasos principales (fácil de recordar)
- Presentar 5+ casos de éxito ESPECÍFICOS
- [B-ROLL:] Gráficos animados explicando el método

## [18:00-21:00] PRUEBA SOCIAL MASIVA
- Mínimo 7 testimonios con nombres, países, resultados específicos
- Incluir estadísticas (ej: "El 73% de personas que...")
- Variedad de casos (diferentes situaciones, todos exitosos)
- Todos los testimonios deben ser de países hispanohablantes
- [B-ROLL:] Screenshots de testimonios reales, fotos de personas

## [21:00-24:00] OFERTA + STACK DE VALOR
- Anclar con precio alto (ej: "normalmente $2,997")
- Desglosar componentes del stack (mínimo 5)
- Mostrar valor individual de cada componente
- Precio final con contraste dramático
- Garantía amplificada (mínimo 60 días)
- [B-ROLL:] Mockups del producto, componentes individuales

## [24:00-25:00] DESTRUCCIÓN DE OBJECIONES + URGENCIA + CTA
- Abordar las 3 objeciones principales
- Crear urgencia REAL (fecha límite específica)
- CTA ultra-específico (qué botón, qué color, qué hacer exactamente)
- Cierre emocional conectando con el hook inicial
- [TONO:] Firme, decisivo, empático

═══════════════════════════════════════════════════════════════
REGLAS CRÍTICAS DE ESCRITURA
═══════════════════════════════════════════════════════════════

✅ HACER:
- Escribir como ${ep?.voice?.name || 'el experto'} HABLA realmente
- Usar contracciones naturales del español de ${country}
- Variar longitud de frases (ritmo dinámico)
- Incluir preguntas retóricas poderosas
- Usar números específicos (no "muchos", sino "4,247 personas")
- Agregar pausas dramáticas en momentos clave
- Usar metáforas y analogías del contexto de ${country}
- Repetir el dolor primario mínimo 5 veces
- Mencionar el nombre del producto mínimo 10 veces

❌ NO HACER:
- Usar lenguaje corporativo o técnico innecesario
- Hacer promesas vagas ("vas a mejorar tu vida")
- Usar testimonios genéricos sin detalles
- Saltarte la agitación del dolor (es crítica)
- Poner el precio antes de construir valor
- Olvidar destruir objeciones
- Usar palabras en inglés innecesarias
- Hacer el hook aburrido o predecible

═══════════════════════════════════════════════════════════════
ADAPTACIÓN CULTURAL PARA ${country.toUpperCase()}
═══════════════════════════════════════════════════════════════

${getCountryCulturalNotes(country)}

═══════════════════════════════════════════════════════════════
FÓRMULAS DE HEADLINES (Jim Edwards - Copywriting Secrets)
═══════════════════════════════════════════════════════════════

ELIGE Y ADAPTA UNA DE ESTAS FÓRMULAS PARA EL HOOK:

1. CURIOSIDAD + BENEFICIO:
   "El Secreto de [GRUPO_EXITOSO] para [BENEFICIO] Sin [OBSTÁCULO]"
   Ejemplo: "El Secreto de los Emprendedores de 6 Cifras para Escalar Sin Trabajar Más Horas"

2. PREGUNTA PROVOCATIVA (muy emocional):
   "¿[PREGUNTA_INCÓMODA_SOBRE_DOLOR]?"
   Ejemplo: "¿Por Qué Sigues Ganando Lo Mismo Después de 3 Años de Esfuerzo?"

3. CÓMO + RESULTADO + AUNQUE:
   "Cómo [RESULTADO] en [TIEMPO] Aunque [OBJECIÓN_COMÚN]"
   Ejemplo: "Cómo Duplicar Tus Ingresos en 90 Días Aunque No Tengas Experiencia"

4. ADVERTENCIA URGENTE:
   "ADVERTENCIA: No [ACCIÓN] Hasta Que [CONDICIÓN]"
   Ejemplo: "ADVERTENCIA: No Inviertas Un Peso Más en Publicidad Hasta Que Veas Esto"

5. CONFESIÓN PERSONAL (alta conexión emocional):
   "Cometí Este Error Durante [TIEMPO] y Me Costó [PÉRDIDA]. Aquí Está Lo Que Aprendí..."

6. TRANSFORMACIÓN ESPECÍFICA:
   "De [SITUACIÓN_NEGATIVA] a [SITUACIÓN_POSITIVA] en [TIEMPO]: El Método [NOMBRE]"

═══════════════════════════════════════════════════════════════
GATILLOS EMOCIONALES AVANZADOS (Aplicar estratégicamente)
═══════════════════════════════════════════════════════════════

🧠 DESTRUCCIÓN DE CREENCIAS FALSAS (Russell Brunson):
En el contenido, destruye estas 3 creencias:
- VEHICLE: "Este método/producto no funciona" → Demostrar que SÍ funciona
- INTERNAL: "Yo no soy capaz" → Demostrar que ELLOS pueden hacerlo
- EXTERNAL: "Algo externo me detendrá" → Eliminar excusas externas

💰 VALUE STACK (Alex Hormozi):
Al presentar la oferta:
- Muestra cada componente por separado con su valor individual
- Apila valor hasta que el precio parezca RIDÍCULO
- Fórmula: (Dream Outcome × Likelihood) / (Time × Effort) = VALOR PERCIBIDO

🧬 CÓDIGO REPTILIANO (Jürgen Klarić):
Conecta con instintos primarios:
- FAMILIA: "Tu familia merece más..."
- SEGURIDAD: "Nunca más preocuparte por..."
- ESTATUS: "Ser reconocido como..."
- PERTENENCIA: "Ser parte de una comunidad de..."

═══════════════════════════════════════════════════════════════
EJEMPLOS DE FRASES EMOCIONALES PODEROSAS
═══════════════════════════════════════════════════════════════

HOOKS EMOCIONALES (elegir el más impactante):
1. "Cierra los ojos un segundo. Imagina que hoy es exactamente igual que hace 3 años... ¿Eso te asusta? Debería."
2. "Hay una pregunta que me quita el sueño: ¿Cuántos años más vas a conformarte con menos de lo que mereces?"
3. "Lo que voy a decirte en los próximos 25 minutos va a incomodarte. Pero si sigues aquí, tu vida va a cambiar."
4. "Tu familia te ve llegar cansado cada noche... ¿Cuánto más vas a aguantar antes de hacer algo diferente?"

TRANSICIONES EMOCIONALES:
- "Pero aquí está donde todo cambió para mí... [PAUSA 3 SEG]"
- "Y lo que descubrí me dolió, pero necesitas escucharlo..."
- "Sé que esto es difícil de escuchar, pero te lo digo porque me importa tu resultado..."
- "Déjame mostrarte lo que nadie más tiene el valor de decirte..."

PINTAR EL FUTURO VÍVIDO:
- "Imagínate dentro de 90 días. Despiertas sin alarma. Abres tu laptop y ves las ventas de anoche. Sonríes. Tomándote un café tranquilo con tu familia, sin prisa, porque TÚ controlas tu tiempo..."
- "¿Cómo se sentiría llamar a tu mamá/papá y decirle: 'Los voy a llevar de vacaciones, yo invito'?"
- "Visualiza el momento en que abres tu cuenta bancaria y ves un número que antes solo soñabas..."

CIERRES EMOCIONALES PROFUNDOS:
- "La pregunta no es si esto funciona. Miles ya lo probaron. La pregunta es: ¿cuántos años más vas a esperar mientras tu vida sigue igual?"
- "Dentro de 90 días, vas a mirar atrás a este momento. Y vas a agradecer que tomaste la decisión... o vas a lamentar no haberlo hecho."
- "El tiempo que ya perdiste no regresa. Pero el tiempo que viene... ese aún lo puedes decidir tú. ¿Qué vas a elegir?"
- "Tu familia te está mirando. Tus hijos están aprendiendo de ti. ¿Qué ejemplo quieres darles hoy?"

═══════════════════════════════════════════════════════════════
INSTRUCCIONES DE TONO EMOCIONAL (CRÍTICO)
═══════════════════════════════════════════════════════════════

El tono debe ser:
1. VULNERABLE - Mostrar tu propia lucha, no parecer perfecto
2. EMPÁTICO - "Sé exactamente cómo te sientes porque yo estuve ahí"
3. ESPERANZADOR - Siempre hay luz al final, y TÚ puedes ser el guía
4. DIRECTO - Sin rodeos, pero con amor. Como un hermano mayor que te dice la verdad.
5. URGENTE SIN PRESIÓN - Crear urgencia genuina, no manipulación

Evitar a toda costa:
- Tono de "gurú" arrogante
- Promesas exageradas tipo "hazte millonario mañana"
- Distancia emocional o frialdad corporativa
- Clichés vacíos sin sustancia

═══════════════════════════════════════════════════════════════
GENERA AHORA EL VSL COMPLETO
═══════════════════════════════════════════════════════════════

IMPORTANTE:
- Longitud total: ~4,500-5,500 palabras
- Formato: Markdown con timestamps
- Incluir todas las notas de [TONO:] y [B-ROLL:]
- Usar las palabras exactas del avatar
- Adaptación cultural completa para ${country}
- Destruir todas las objeciones listadas
- Aplicar todos los gatillos mentales en los momentos indicados
- TONO EMOCIONAL: Conecta con el corazón ANTES de vender

¡GENERA EL VSL PROFESIONAL AHORA!
`;
}

// ═══════════════════════════════════════════════════════════════
// LAUNCH PROMPT (21 DÍAS)
// ═══════════════════════════════════════════════════════════════

function buildLaunchPrompt(ep: any, ap: any, ps: any, pi: any, country: string): string {
  return `
═══════════════════════════════════════════════════════════════
GENERACIÓN DE LANZAMIENTO PROFESIONAL - 21 DÍAS
═══════════════════════════════════════════════════════════════

Tu misión es crear una secuencia completa de lanzamiento de 21 días que incluya:
- 4 Videos de Pre-Lanzamiento (PLV)
- Secuencia de 10+ emails de venta
- Posts de calentamiento para redes sociales

Culturalmente adaptado para ${getCountryName(country)}

═══════════════════════════════════════════════════════════════
DATOS DEL PROYECTO
═══════════════════════════════════════════════════════════════

EXPERTO:
Nombre: ${ep?.voice?.name || 'El Experto'}
Tono: ${ep?.voice?.adjectives?.join(', ') || 'Profesional, Cercano'}
Historia: ${ep?.story?.lowestPoint || 'Historia pendiente'}
Promesa: "${ep?.beliefs?.centralPromise || 'Transformación garantizada'}"

AVATAR:
Nivel de conciencia: ${ap?.consciousnessLevel ?? 1}
Dolor primario: "${ap?.pains?.primary || 'Dolor principal'}"
Transformación deseada: "${ap?.desires?.identityTransformation || 'Transformación'}"

PRODUCTO:
Nombre: "${pi?.name || 'El Producto'}"
Problema que soluciona: "${pi?.audienceProblem || 'Problema principal de la audiencia'}"
Solución: "${pi?.solution || 'Solución principal'}"
Oferta basada en transformación: "${pi?.transformationOffer || 'Oferta de transformación'}"
${pi?.benefitBullets?.length ? `Bullets de beneficios:\n${pi.benefitBullets.map((b: string, i: number) => `${i + 1}. ${b}`).join('\n')}` : ''}
${pi?.keywords?.length ? `Palabras clave: ${pi.keywords.join(', ')}` : ''}
Precio: $${pi?.price || '997'}
Garantía: ${pi?.guaranteePeriod || '60'} días

GATILLOS ACTIVADOS:
${ps?.mentalTriggers?.filter((t: any) => t.enabled).map((t: any) => `- ${t.name}`).join('\n') || '- Gatillos pendientes'}

═══════════════════════════════════════════════════════════════
ESTRUCTURA DEL LANZAMIENTO
═══════════════════════════════════════════════════════════════

## FASE 1: PRE-CALENTAMIENTO (Días -14 a -7)
- 5-7 posts de valor en redes sociales
- 2-3 emails educativos (no vender, solo valor)
- Crear curiosidad sobre "algo nuevo que viene"

## FASE 2: VIDEOS DE PRE-LANZAMIENTO (Días -7 a -1)
- PLV1: Tu Historia + El Problema (15 min)
- PLV2: La Solución sin Revelar Producto (12 min)
- PLV3: La Transformación Posible (12 min)
- PLV4: El Método Completo (20 min)

## FASE 3: CARRITO ABIERTO (Días 1-4)
- Email 1: Apertura + Oferta Completa
- Email 2: Prueba Social Masiva
- Email 3: FAQ + Destrucción de Objeciones
- Email 4: Escasez Real
- Emails 5-10: Secuencia de Cierre

## FASE 4: POST-CIERRE (Días 5-7)
- Downsell para los que no compraron
- Feedback de compradores
- Primeros testimonios

═══════════════════════════════════════════════════════════════

${getCountryCulturalNotes(country)}

GENERA LA SECUENCIA COMPLETA DE LANZAMIENTO AHORA.
Incluye todos los emails, guiones de video, y posts de redes.
Usa formato Markdown con secciones claras.
`;
}

// ═══════════════════════════════════════════════════════════════
// AUTOWEBINAR - 3 LLAMADAS API (Landing+Webinar | Emails | WhatsApp)
// ═══════════════════════════════════════════════════════════════

function buildAutowebinarSharedContext(ep: any, ap: any, ps: any, pi: any, country: string): string {
  const expertName = ep?.voice?.name || 'El Experto';
  const productName = pi?.name || 'El Producto';
  const productPrice = pi?.price || '997';
  const productValue = pi?.productValue || Math.round((Number(pi?.price) || 997) * 3.5);
  const guaranteePeriod = pi?.guaranteePeriod || '60';
  const guaranteeDesc = pi?.guaranteeDescription || '100% reembolso sin preguntas';
  const centralPromise = ep?.beliefs?.centralPromise || 'Transformación garantizada';
  const commonEnemy = ep?.beliefs?.commonEnemy || 'Sistemas obsoletos';
  const painPrimary = ap?.pains?.primary || 'Dolor principal';
  const transformation = ap?.desires?.identityTransformation || 'Transformación';
  const bonusList = pi?.bonuses?.map((b: any, i: number) => `${i + 1}. ${b.name} (Valor: $${b.value})`).join('\n') || 'Pendiente';
  const bonusTotal = pi?.bonuses?.reduce((acc: number, b: any) => acc + (b.value || 0), 0) || 0;
  const totalStackValue = bonusTotal + productValue;
  const objections = ap?.objections?.map((obj: any, i: number) => `${i + 1}. "${obj.exact_words}" → Raíz: ${obj.root_cause} → Destrucción: ${obj.destruction}`).join('\n') || '1. Pendiente';
  const triggers = ps?.mentalTriggers?.filter((t: any) => t.enabled).map((t: any) => `- ${t.name}: ${t.application}`).join('\n') || '- Gatillos pendientes';

  return `
═══════════════════════════════════════════════════════════════════════
DATOS DEL PROYECTO
═══════════════════════════════════════════════════════════════════════

TONO GENERAL: ALTAMENTE EMOCIONAL, cercano, como hermano mayor latino.
Adaptado culturalmente para ${getCountryName(country)}.

EXPERTO:
Nombre: ${expertName}
Tono: ${ep?.voice?.adjectives?.join(', ') || 'Profesional, Cercano'} + EMOCIONAL
Historia más baja: "${ep?.story?.lowestPoint || 'Historia pendiente'}"
Breakthrough: "${ep?.story?.breakthrough || 'Breakthrough pendiente'}"
Situación actual: "${ep?.story?.current || 'Situación actual pendiente'}"
Promesa Central: "${centralPromise}"
Enemigo Común: "${commonEnemy}"

AVATAR:
Nivel de conciencia: ${ap?.consciousnessLevel ?? 1}
${getConsciousnessStrategy(ap?.consciousnessLevel)}
Dolor primario: "${painPrimary}"
Dolores económicos: ${ap?.pains?.economic?.map((p: string) => `"${p}"`).join(', ') || 'Pendiente'}
Dolores emocionales: ${ap?.pains?.emotional?.map((p: string) => `"${p}"`).join(', ') || 'Pendiente'}
Dolores sociales: ${ap?.pains?.social?.map((p: string) => `"${p}"`).join(', ') || 'Pendiente'}
Dolores de identidad: ${ap?.pains?.identity?.map((p: string) => `"${p}"`).join(', ') || 'Pendiente'}
Transformación deseada: "${transformation}"

OBJECIONES A DESTRUIR:
${objections}

PRODUCTO/OFERTA:
Nombre: "${productName}"
Problema que soluciona: "${pi?.audienceProblem || 'Problema principal de la audiencia'}"
Solución del producto: "${pi?.solution || 'Solución principal'}"
Oferta basada en transformación: "${pi?.transformationOffer || 'Oferta de transformación'}"
Bullets de beneficios:
${pi?.benefitBullets?.length ? pi.benefitBullets.map((b: string, i: number) => `${i + 1}. ${b}`).join('\n') : '- Beneficios pendientes'}
Palabras clave de la oferta: ${pi?.keywords?.length ? pi.keywords.join(', ') : 'Pendiente'}
Precio de venta: $${productPrice}
Valor percibido del producto: $${productValue}
${pi?.paymentPlan?.enabled ? `Plan de Pagos: ${pi.paymentPlan.installments} cuotas de $${pi.paymentPlan.installmentPrice}` : ''}
Garantía: ${guaranteePeriod} días - ${guaranteeDesc}
Bonos: ${bonusList}
Valor Total Stack: $${totalStackValue}

GATILLOS MENTALES ACTIVADOS:
${triggers}

ADAPTACIÓN CULTURAL:
${getCountryCulturalNotes(country)}

DIRECTIVAS DE COHERENCIA:
- Promesa central: "${centralPromise}"
- Enemigo común: "${commonEnemy}"
- Los "3 Secretos" destruyen: Vehicle belief, Internal belief, External belief
- CTA principal: Usar siempre la MISMA frase de acción en landing, emails y WhatsApp
- Tono: Como hermano mayor latino que genuinamente quiere ayudar
- Todo el ecosistema debe sentirse como UNA SOLA VOZ coherente
`;}

// ═══════════════════════════════════════════════════════════════
// PARTE 1: LANDING PAGE + GUIÓN DEL WEBINAR
// ═══════════════════════════════════════════════════════════════

function buildAutowebinarPrompt_Part1(ep: any, ap: any, ps: any, pi: any, country: string): string {
  const sharedContext = buildAutowebinarSharedContext(ep, ap, ps, pi, country);
  const expertName = ep?.voice?.name || 'El Experto';
  const productName = pi?.name || 'El Producto';
  const productPrice = pi?.price || '997';
  const productValue = pi?.productValue || Math.round((Number(pi?.price) || 997) * 3.5);
  const guaranteePeriod = pi?.guaranteePeriod || '60';
  const guaranteeDesc = pi?.guaranteeDescription || '100% reembolso sin preguntas';
  const centralPromise = ep?.beliefs?.centralPromise || 'Transformación garantizada';
  const commonEnemy = ep?.beliefs?.commonEnemy || 'Sistemas obsoletos';
  const painPrimary = ap?.pains?.primary || 'Dolor principal';
  const bonusTotal = pi?.bonuses?.reduce((acc: number, b: any) => acc + (b.value || 0), 0) || 0;
  const totalStackValue = bonusTotal + productValue;
  const triggers = ps?.mentalTriggers?.filter((t: any) => t.enabled).map((t: any) => `- ${t.name}: ${t.application}`).join('\n') || '- Gatillos pendientes';

  return `
${sharedContext}

═══════════════════════════════════════════════════════════════════════
INSTRUCCIONES DE GENERACIÓN - PARTE 1 de 3
Genera: Landing Page de Captación + Guión Completo del Webinar
═══════════════════════════════════════════════════════════════════════

████████████████████████████████████████████████████████████████████████
SECCIÓN 0: LANDING PAGE DE CAPTACIÓN (Optimizada para >50% conversión)
████████████████████████████████████████████████████████████████████████

Genera el COPY COMPLETO + ESTRUCTURA + RECOMENDACIONES DE DISEÑO para la
landing page de registro al webinar. El objetivo es superar el 50% de conversión.

PRINCIPIOS DE CONVERSIÓN:
- Página CORTA y ENFOCADA (máximo 5 secciones)
- UN SOLO OBJETIVO: que se registren
- Formulario simple: Nombre + Email + WhatsApp (máximo 3 campos)
- Urgencia/escasez visible desde el primer scroll
- Zero friction: eliminar todo lo que no lleve al registro

---

### SECCIÓN HERO (Above the fold - 80% del trabajo de conversión)

IMPORTANTE: Genera un NOMBRE/TÍTULO atractivo para la MasterClass/Webinar.
Ejemplo: "Los 3 Secretos para [Resultado] sin [Dolor]".
Este nombre debe usarse en TODA la comunicación (landing, emails, WhatsApp).

Elementos a generar:
1. **BARRA SUPERIOR (Ticker/Topbar):**
   - Texto de urgencia: "MASTERCLASS EN VIVO 100% GRATUITA - CUPOS LIMITADOS"
   - [DISEÑO:] Barra fija, color de acento (verde/dorado), fuente pequeña, texto en movimiento o fijo

2. **PRE-HEADLINE (Calificador):**
   - Texto corto que califique al avatar: "Para [tipo de persona] que quiere [resultado específico]"
   - Ejemplo: "Para emprendedores y profesionales que quieren generar ingresos vendiendo por internet"
   - [DISEÑO:] Fuente pequeña, color secundario, arriba del headline

3. **HEADLINE PRINCIPAL (El elemento más importante):**
   - Fórmula Jim Edwards: Resultado específico + Mecanismo único + Timeframe + Sin el dolor
   - Debe incluir un NÚMERO o resultado concreto
   - Debe generar CURIOSIDAD sobre los "3 Secretos"
   - [DISEÑO:] Fuente grande (40-60px desktop, 28-36px mobile), negrita, color blanco sobre fondo oscuro, máximo 2 líneas

4. **SUB-HEADLINE:**
   - Expandir la promesa: "Un entrenamiento gratuito donde descubrirás [3 bullets de curiosidad]"
   - [DISEÑO:] Fuente mediana (18-22px), color claro/gris, debajo del headline

5. **CONTADOR REGRESIVO (Countdown Timer):**
   - "La MasterClass comienza en:" + Timer dinámico (días, horas, min, seg)
   - [DISEÑO:] Números grandes, estilo digital, color de acento, visible y prominente junto al formulario

6. **FORMULARIO DE REGISTRO:**
   - Campos: Nombre / Email / WhatsApp (solo 3)
   - Botón CTA: Texto emocional (NO "Registrarse" - eso es frío)
   - Ejemplos de CTA: "QUIERO MI LUGAR GRATIS", "RESERVA TU LUGAR AHORA", "SÍ, QUIERO APRENDER ESTO"
   - Texto debajo del botón: "100% gratuito. Tu información está segura."
   - [DISEÑO:] Formulario con fondo semi-transparente o card con contraste, botón grande (ancho completo del form), color llamativo (verde brillante, naranja, amarillo), efecto hover/pulse sutil. Campos con placeholders claros y bordes redondeados

7. **IMAGEN/VIDEO DEL EXPERTO:**
   - Foto profesional del experto mirando hacia el formulario (dirección visual)
   - O video corto de 30-60 seg (VSL de captación)
   - [DISEÑO:] Imagen recortada a medio cuerpo, alta calidad, mirando hacia el formulario. Si es video: thumbnail atractivo con botón play

8. **PRUEBA SOCIAL RÁPIDA (Social proof one-liner):**
   - "+12,000 personas ya transformaron su vida" o "Más de X personas registradas"
   - [DISEÑO:] Íconos de personas/estrellas + número + texto breve, debajo del formulario o del headline

---

### SECCIÓN BULLETS - QUÉ VAS A DESCUBRIR (The 3 Secrets Preview)

Elementos a generar:
1. **Título de sección:** "En esta MasterClass GRATUITA descubrirás:"
2. **3 Bullets de curiosidad** (NO revelar, solo generar intriga):
   - Secreto #1: "[Curiosidad sobre Vehicle belief]" + ícono
   - Secreto #2: "[Curiosidad sobre Internal belief]" + ícono
   - Secreto #3: "[Curiosidad sobre External belief]" + ícono
3. **CTA secundario:** Botón "RESERVA TU LUGAR" que lleve al formulario
4. [DISEÑO:] 3 cards o bullets con íconos, fondo ligeramente diferente al hero, espacio entre elementos, íconos de color de acento. En mobile: vertical stacking

---

### SECCIÓN SPEAKER - QUIÉN TE ENSEÑA (Biografía ultra-corta)

Elementos a generar:
1. **Foto del experto** (medio cuerpo, profesional)
2. **Nombre + Título:** "${expertName}" - [Título corto, 5 palabras max]
3. **Bio CORTA (máximo 3-4 líneas):**
   - Credencial #1 (número de personas ayudadas o facturación)
   - Credencial #2 (evento/reconocimiento principal)
   - Credencial #3 (experiencia/años)
4. **Logos de credibilidad** (si aplica: medios donde apareció, eventos, certificaciones)
5. [DISEÑO:] Layout horizontal (foto izq + texto der en desktop), fondo limpio, foto con sombra o borde sutil, NO más de 4-5 líneas de texto

---

### SECCIÓN TESTIMONIOS (Prueba social rápida)

Elementos a generar:
1. **Título:** "Lo que dicen quienes ya asistieron:"
2. **3 testimonios máximo** (mini-cards):
   - Nombre + País + Resultado en UNA frase
   - Foto del testimonio
   - Ejemplo: "María G. (Colombia) - 'Facturé $3,200 en mi primer mes con lo que aprendí'"
3. **CTA final:** "ÚLTIMOS CUPOS - REGÍSTRATE AHORA" → botón al formulario
4. [DISEÑO:] Cards horizontales o slider, fotos circulares, comillas estilizadas, 1 frase por testimonio (máx 2 líneas), fondo testimonial diferente al anterior

---

### SECCIÓN FOOTER / CIERRE

Elementos a generar:
1. **Countdown Timer repetido** (mismo timer del hero)
2. **CTA FINAL con urgencia:** "Los cupos son LIMITADOS. Reserva el tuyo ahora."
3. **Formulario REPETIDO** o botón que haga scroll al formulario del hero
4. **Legal:** Disclaimer de privacidad + "Not Facebook" (si aplica)
5. [DISEÑO:] Fondo más oscuro, countdown prominente, botón grande, legal en fuente pequeña/gris

---

### RECOMENDACIONES DE DISEÑO PARA >50% CONVERSIÓN

Genera estas recomendaciones como parte del entregable:

**TIPOGRAFÍA:**
- Headline: Sans-serif bold (Montserrat, Inter, Poppins)
- Body: Sans-serif regular, 16-18px
- CTA buttons: All-caps, bold, 18-20px
- Interlineado generoso (1.5-1.8)

**COLORES:**
- Fondo principal: Elegir según branding del experto (oscuro para exclusividad, claro para confianza)
- Texto principal: Alto contraste con el fondo
- Color de acento: El color del branding del experto
- CTA button: Color que contraste FUERTE con el fondo (naranja, verde brillante, amarillo)
- Evitar: más de 3 colores

**LAYOUT:**
- Desktop: 2 columnas en hero (copy izq + formulario der)
- Mobile: Stack vertical (headline → countdown → formulario → bullets)
- Max width: 1200px
- Padding generoso: 80-120px vertical entre secciones
- El formulario SIEMPRE debe ser sticky o fácilmente accesible en mobile

**VELOCIDAD:**
- Imágenes optimizadas (WebP, lazy loading)
- Sin videos autoplay (thumbnail + click to play)
- Carga < 3 segundos (cada segundo extra = -7% conversión)

**MOBILE (70%+ del tráfico viene de ads mobile):**
- Formulario visible sin scroll (o con 1 scroll máximo)
- Botón CTA sticky en la parte inferior
- Textos más grandes (18px mínimo body)
- Touch targets: 48px mínimo en botones

**ELEMENTOS DE CONFIANZA:**
- Candado + "Tu información está segura" debajo del formulario
- Logos de medios/eventos donde ha participado el experto
- Número total de registrados (prueba social dinámica)
- "100% Gratuito - Sin tarjeta de crédito"

**A/B TESTS RECOMENDADOS:**
- Test 1: Headline con número vs sin número
- Test 2: Con video hero vs sin video
- Test 3: Color del botón CTA (verde vs naranja vs amarillo)
- Test 4: Formulario 2 campos vs 3 campos
- Test 5: Con countdown vs sin countdown

████████████████████████████████████████████████████████████████████████
SECCIÓN 1: GUIÓN DEL WEBINAR (Perfect Webinar Framework 75-82 min)
████████████████████████████████████████████████████████████████████████

Genera el guión COMPLETO usando el Perfect Webinar Framework de Russell Brunson,
optimizado con las técnicas del Webinar RAIO (298 slides, alta conversión).

PRINCIPIO DE DISEÑO: 1 idea por slide. Cada slide debe tener UNA frase o concepto.
El guión debe indicar [SLIDE] para cada cambio de diapositiva.

GATILLOS MENTALES A INTEGRAR EN EL GUIÓN:
${triggers}

---

## [00:00-03:00] HOOK "SI...TE VAS A..." (Patrón RAIO)
[TONO:] Magnético, empático, directo al dolor
[SLIDE:] Título del webinar (frase grande, centrada, limpia)

Usar el patrón de pares dolor→resolución (mínimo 4 pares):

[SLIDE] "[TÍTULO]: [Promesa principal con resultado específico]"
[SLIDE] "[TÍTULO]...sin importar [objeción más común]!"
[SLIDE] "Si [DOLOR/FRUSTRACIÓN #1 del avatar]..."
[SLIDE] "...te vas a dar cuenta que [RESOLUCIÓN #1]!"
[SLIDE] "Si [DOLOR/FRUSTRACIÓN #2 del avatar]..."
[SLIDE] "...te vas a dar cuenta que [RESOLUCIÓN #2]!"
[SLIDE] "Si [DOLOR/FRUSTRACIÓN #3 del avatar]..."
[SLIDE] "...[RESOLUCIÓN #3 esperanzadora]!"
[SLIDE] "Si quieres [DESEO PRINCIPAL del avatar]..."
[SLIDE] "...te va a encantar esta clase!"

Dolores a usar: "${painPrimary}"
Dolores económicos: ${ap?.pains?.economic?.map((p: string) => `"${p}"`).join(', ') || 'Pendiente'}
Dolores emocionales: ${ap?.pains?.emotional?.map((p: string) => `"${p}"`).join(', ') || 'Pendiente'}

## [03:00-05:00] PROMESA + AGENDA (Reveal Progresivo)
[TONO:] Entusiasta, generoso
[SLIDE:] "Vas a aprender..." (título naranja/acento)

Bullets con reveal progresivo (cada bullet aparece uno por uno):
- 5 resultados específicos que lograrán (negritas en palabra clave)
- Último slide agrega: "...sin importar tu [objeción más común]"
- Y luego: "...en tan solo [TIMEFRAME]!"

## [05:00-07:00] CREDENCIALES ULTRA-CORTAS
[TONO:] Confiado sin arrogancia
[SLIDE:] "¿Por qué deberías confiar en mí?"

- "${expertName}" - máximo 3 credenciales en bullets
- Número de personas ayudadas, logro más impactante, experiencia clave
- NO más de 2 slides | [PAUSA 2 SEG]

## [07:00-17:00] ORIGIN STORY COMPLETA DEL EXPERTO
[TONO:] Vulnerable → Desesperado → Esperanzado → Transformado
[SLIDE:] Fotos reales, 1 frase por slide

Estructura obligatoria (como RAIO: muchos slides, poco texto c/u):

**a) MISMA SITUACIÓN (2 min):**
[SLIDE] "Hace [X] años estaba en la misma situación que tú..."
[SLIDE] "[Contexto inicial - de dónde venía]"
[SLIDE] "[Problemas que enfrentaba]" (lista con bullets)
- Cada problema conecta con un dolor del avatar

**b) INTENTÉ TODO (2 min):**
[SLIDE] "Entonces hice TODO para [resultado deseado]..."
[SLIDE] Lista de todo lo que probó (tachado o con X) - métodos fallidos
[SLIDE] "Probé y fracasé varias veces..." + lista de fracasos
[SLIDE] "Estaba desesperado... '¿Qué pasa si no lo logro?'" [PAUSA 3 SEG]

**c) EL DESCUBRIMIENTO (2 min):**
[SLIDE] "Un día cambia todo..."
[SLIDE] "Encuentro/Descubro [EL MÉTODO/PERSONA/MOMENTO]"
[SLIDE] Descripción del método nuevo: 5-6 características con bullets
[SLIDE] "Lo empecé a probar con [esfuerzo mínimo]..."
[SLIDE] "...y [TIEMPO] después [RESULTADO CONCRETO]!" [PAUSA 2 SEG]

**d) TODO SE SOLUCIONÓ (2 min):**
[SLIDE] "Por fin, todo se solucionó..." + lista de resultados
[SLIDE] "¡Y mi vida cambió completamente!" (slide de transición)
[SLIDE] "Sentí que era mi deber compartir esto..."
[SLIDE] "[Investigué más / Me formé / Creé el sistema]"
[SLIDE] "...y fundé ${productName}"

Datos del experto para la historia:
- Punto más bajo: "${ep?.story?.lowestPoint || 'Historia pendiente'}"
- Breakthrough: "${ep?.story?.breakthrough || 'Breakthrough pendiente'}"
- Actual: "${ep?.story?.current || 'Situación actual'}"
- Enemigo: "${commonEnemy}"

## [17:00-18:00] SOCIAL PROOF WAVE 1 (Pre-secretos)
[TONO:] Celebratorio
[SLIDE:] Testimonios con timeline

"¡Y lo mismo les pasó a [clientes/estudiantes]!"
- 3-4 testimonios rápidos con TIMELINE: "3 meses después...", "4 meses después..."
- "¡Miles/Cientos de [tipo de personas] lo lograron!"
- Pregunta puente: "¿Cómo cambiaría tu vida si tuvieras una transformación similar?"

## [18:00-19:00] DATA CAPTURE MID-WEBINAR (Técnica RAIO)
[SLIDE:] "¡Pero antes! Regálame rápidamente tu [dato]"

MOMENTO DE CAPTURA DE DATOS antes de revelar los secretos:
- "Antes de revelarte los 3 secretos..."
- Pedir email/WhatsApp a cambio de: consejos, invitaciones a eventos, descuentos
- "Completamente GRATIS"
- Esto aumenta el compromiso y captura leads que no se registraron antes

## [19:00-20:00] OVERVIEW DE LOS 3 SECRETOS
[SLIDE:] Los 3 secretos listados con descripción curiosa

Mostrar los 3 secretos con CURIOSIDAD (no revelar, solo intrigar):
- Secreto 1: "Así logras [RESULTADO #1], sin [OBJECIÓN], ¡incluso si [SITUACIÓN EXTREMA]!"
- Secreto 2: "Así logras [RESULTADO #2], sin [OBJECIÓN], ¡incluso si [SITUACIÓN EXTREMA]!"
- Secreto 3: "Así logras [RESULTADO #3], sin [OBJECIÓN], ¡incluso si [SITUACIÓN EXTREMA]!"

## [20:00-32:00] SECRETO #1: DESTRUIR CREENCIA VEHICLE (~12 min)
[TONO:] Educativo pero apasionado
[SLIDE:] "Secreto #1: [Nombre atractivo]"

OBJETIVO: Destruir "Este método/vehículo no funciona"
Estructura COMPLETA (cada secreto es una mini-historia):

**a) HISTORIA DEL SECRETO (3 min):**
[SLIDE] "Yo era muy escéptico de [el método]..."
[SLIDE] "Ya había probado un montón de [alternativas] sin resultados..."
[SLIDE] "Entonces me puse a investigar..."
[SLIDE] "Descubrí [algo/alguien que cambió todo]..."
[SLIDE] "¡Se confirmaron mis sospechas!"
[SLIDE] "Mi falta de resultados no era culpa mía. ¡[ENEMIGO COMÚN] nos ha estado [error]!"

**b) ENSEÑANZA / FRAMEWORK (5 min):**
- Presentar el método con NOMBRE memorable
- Explicar con analogías simples (que el avatar entienda al instante)
- Usar ejercicio interactivo: "Ejemplo:" → demostración → "¿Ves? ¡Exactamente!"
- Framework paso a paso (reveal progresivo, 1 paso por slide)
- "¿Y sabes qué? Eso es exactamente lo que haces cuando [usas el producto/método]..."

**c) TESTIMONIOS DEL SECRETO (2 min):**
[SLIDE] "¡Y lo mismo les pasó a [personas]!" (repetir con 3-5 testimonios)
[SLIDE] "¿Cierto que suena bien?"

**d) OBJECIÓN PUENTE (1 min):**
[SLIDE] "Suena bien... ¿Será que funciona para [objeción más común]?"
→ Transición natural al siguiente secreto

## [32:00-44:00] SECRETO #2: DESTRUIR CREENCIA INTERNAL (~12 min)
[TONO:] Empático → Revelador → Empoderador
[SLIDE:] "Secreto #2: [Nombre atractivo]"

OBJETIVO: Destruir "Yo no soy capaz de lograrlo"
MISMA ESTRUCTURA que Secreto #1 pero con:

**a) HISTORIA:** Su propia frustración con este aspecto
**b) ENSEÑANZA con EJERCICIO INTERACTIVO:**
- Incluir un ejercicio EN VIVO donde el público participa
- "¿Ensayamos?" → Ejercicio → "¿Viste? ¡Con razón [no lograban el resultado]!"
- Diagnóstico: "¡No es que no puedas! Es que [razón real del problema]"
- Framework paso a paso del secreto #2
**c) TESTIMONIOS** del secreto #2
**d) OBJECIÓN PUENTE** al secreto #3

## [44:00-52:00] SECRETO #3: DESTRUIR CREENCIA EXTERNAL (~8 min)
[TONO:] Confiado, resolutivo
[SLIDE:] "Secreto #3: [Nombre atractivo]"

OBJETIVO: Destruir "Factores externos me detendrán"
MISMA ESTRUCTURA:
**a) HISTORIA:** Problema externo que enfrentó
**b) ENSEÑANZA:** Descubrimiento de experto/mentor + framework de solución
- Consecuencias de NO resolver: lista de dolores amplificados [PAUSA]
- Framework: pasos claros y simples
**c) TESTIMONIOS** del secreto #3
**d) PREGUNTA PUENTE:** "Si aplicas este método tú también... ¿tú también puedes, cierto?"
[SLIDE] "¡Sí, tú puedes!" [PAUSA 3 SEG]

## [52:00-54:00] TRANSICIÓN A LA OFERTA
[TONO:] Empático → Generoso
[SLIDE:] "Si te sientes un poco así en este momento... ¡No te preocupes!"

- "Te he preparado todo lo que necesitas para implementar esto..."
- ESCASEZ: "Lo que te voy a ofrecer NO lo vas a encontrar fuera de esta clase"
- "No en mi página, no en mis redes sociales..."
- "Esta es una oferta ÚNICA que solo se te ofrecerá hoy"
- "¿Estás listo?" [PAUSA 3 SEG]

## [54:00-62:00] THE STACK + PRECIO PROGRESIVO (Técnica RAIO)
[TONO:] Generoso → Revelador
[SLIDE:] Cada componente individualmente, luego stack acumulado

**a) STACK componente por componente (5 min):**
Cada componente del producto:
1. "${productName}" → features + "Con esto vas a LOGRAR..." + testimonios
${pi?.bonuses?.map((b: any, i: number) => `${i + 2}. "${b.name}" ($${b.value}) → qué problema resuelve + testimonios`).join('\n') || '2. Pendiente'}

Cada componente se agrega al stack visual con su valor individual.

**b) PRECIO PROGRESIVO / ANCHORING (3 min):**
Técnica de descuento progresivo (CRÍTICO para conversión):

[SLIDE] "Precio normal: $${totalStackValue}" (valor alto del stack completo)
[SLIDE] "No te voy a cobrar $${totalStackValue}. Pero digamos que lo hiciera..."
[SLIDE] "¿Valdría los $${totalStackValue}?" + 3 preguntas de valor
[SLIDE] "Te voy a ofrecer un gran descuento."
[SLIDE] Stack con: "AHORA: $${Math.round(totalStackValue * 0.8)}" (tachado)
[SLIDE] Stack con: "AHORA: $${Math.round(totalStackValue * 0.5)}" (tachado)
[SLIDE] Stack con: "AHORA: $${Math.round(totalStackValue * 0.3)}" (tachado)
[SLIDE] Stack con: "AHORA: $${productPrice}" → REVELACIÓN [PAUSA 3 SEG]
${pi?.paymentPlan?.enabled ? `[SLIDE] "Paga $${productPrice} en 1 cuota o $${pi.paymentPlan.installmentPrice} en ${pi.paymentPlan.installments} cuotas"` : ''}

[SLIDE] "Ahora tienes dos opciones: 1. No hacer nada. 2. Probarlo."

## [62:00-64:00] DOBLE GARANTÍA (Técnica RAIO)
[TONO:] Confiado, tranquilizador
[SLIDE:] "¡Estás cubierto por 2 garantías!"

Presentar DOS garantías (no solo una):
1. **Garantía de Satisfacción:** ${guaranteePeriod} días para probar. ${guaranteeDesc}. Sin condiciones.
2. **Garantía de Resultados:** Si aplicas todo y no logras [resultado], [compensación]. Condición: completar el programa.

[SLIDE] "Hay 0 riesgo, y en TODO caso ganas..."
[SLIDE] "¿Vale la pena invertir un minuto para revisar? Hay 0 riesgo."

## [64:00-66:00] TABLA COMPARATIVA vs COMPETIDORES (Técnica RAIO)
[TONO:] Objetivo, basado en datos
[SLIDE:] Tabla comparativa visual

"¿Cómo compara con las alternativas?"
Crear tabla comparativa con 3-4 alternativas reales del nicho:
| Criterio | ${productName} | Alternativa 1 | Alternativa 2 | Alternativa 3 |
| Precio | Lo más económico | Xveces más caro | Xveces más caro | Xveces más caro |
| Garantía satisfacción | Tiene | No tiene | No tiene | No tiene |
| Garantía resultados | Tiene | No tiene | No tiene | No tiene |
| [Diferencial clave] | Tiene | No tiene | No tiene | No tiene |

## [66:00-68:00] BONOS SORPRESA (Después del precio - Técnica RAIO)
[TONO:] Sorpresivo, generoso
[SLIDE:] "ESPERA, ¡HAY MÁS!"

BONOS que aparecen DESPUÉS de revelar el precio (aumenta valor percibido):
[SLIDE] "Te voy a incluir [X] bonos si [actúas antes de que termine]"
${pi?.bonuses?.map((b: any, i: number) => `[SLIDE] "BONO ${i + 1}: ${b.name} - Precio normal: $${b.value} → INCLUIDO"`).join('\n') || '[SLIDE] "BONO 1: [Nombre] - INCLUIDO"'}

[SLIDE] Stack FINAL con TODOS los componentes + bonos + precio final + CTA

## [68:00-70:00] CÓMO COMPRAR + PREVIEW ONBOARDING
[TONO:] Práctico, emocionado
[SLIDE:] "Así haces la compra:" (3 pasos con screenshots)

**Cómo comprar en 3 pasos:**
[SLIDE] "1) Haz clic en el botón [CTA]"
[SLIDE] "2) Completa tus datos de pago"
[SLIDE] "3) ¡Listo! Recibes acceso inmediato"

**Qué pasa al comprar (reducir incertidumbre):**
[SLIDE] "Al momento de comprar, esto va a pasar..."
1. Recibirás acceso + factura vía email y WhatsApp
2. Recibirás una llamada/mensaje de bienvenida
3. Tendrás acceso a la comunidad privada
4. Recibirás soporte y recordatorios

## [70:00-80:00] DESTRUCCIÓN DE OBJECIONES INDIVIDUAL (Técnica RAIO)
[TONO:] Empático pero firme, con CTA PERSISTENTE en cada slide
[SLIDE:] Cada objeción individual con stack + countdown + CTA visible

INSTRUCCIÓN CRÍTICA: Desde este punto, CADA SLIDE debe incluir:
- El precio y plan de pagos
- El CTA: "¡Haz clic y toma la oferta ahora!"
- Un countdown timer referenciado

Generar 1 slide POR OBJECIÓN (mínimo 6):

${ap?.objections?.map((obj: any, i: number) => `
[SLIDE] OBJECIÓN ${i + 1}: "${obj.exact_words}"
→ Respuesta: ${obj.destruction}
+ Stack resumido + Precio + CTA`).join('\n') || `
[SLIDE] OBJECIÓN 1: "Ahora no es un buen momento" → "¿No es cuando más lo necesitas?"
[SLIDE] OBJECIÓN 2: "Estoy demasiado ocupado" → "Alguien más ocupado lo está haciendo ahora mismo"
[SLIDE] OBJECIÓN 3: "No tengo el dinero" → Plan de pagos + ROI + testimonios
[SLIDE] OBJECIÓN 4: "Tengo que pensarlo" → "Las 2 opciones vienen sin riesgo..."
[SLIDE] OBJECIÓN 5: "No sé si funcione para mí" → Garantía de resultados
[SLIDE] OBJECIÓN 6: "Tengo que hablar con mi pareja/familia" → "Estás pidiendo permiso, no apoyo"`}

## [80:00-82:00] CIERRE EMOCIONAL + DESPEDIDA
[TONO:] Profundo, genuino, esperanzador
[SLIDE:] Frase de cierre + CTA final

- "Invierte en ti mismo – es lo único que nunca te pueden quitar"
- Referencia a familia, futuro, legado
- "¿Preguntas?"
- "¡Gracias por tu tiempo y bienvenido a la Familia [MARCA]!"
- CTA FINAL con countdown

NOTAS DE PRODUCCIÓN DEL GUIÓN:
- DISEÑO: 1 idea por slide, texto grande, fondo limpio, colores de marca
- Incluir [PAUSA 3 SEG] en momentos emocionales
- Incluir [TONO:] y [SLIDE:] en CADA transición
- Interacciones: "Escribe en el chat...", "¿Ensayamos?", ejercicios en vivo
- CTA PERSISTENTE en TODAS las slides desde la oferta en adelante
- El guión debe tener entre 200-300 indicaciones de [SLIDE] (muchas slides, poco texto c/u)
- Longitud del guión hablado: ~5,000-7,000 palabras
- Duración total: 75-82 minutos

═══════════════════════════════════════════════════════════════════════
FORMATO DE SALIDA - PARTE 1
═══════════════════════════════════════════════════════════════════════

Usa estos encabezados EXACTOS en Markdown:

# LANDING PAGE DE CAPTACIÓN
## Hero Section
(nombre del webinar, headline, sub-headline, pre-headline, CTA, social proof)
## Sección: Qué Descubrirás (3 Secrets Preview)
## Sección: Quién Te Enseña (Speaker Bio)
## Sección: Testimonios
## Sección: Footer/Cierre
## Recomendaciones de Diseño
(tipografía, colores, layout, mobile, velocidad, A/B tests)

# GUIÓN DEL WEBINAR
(guión completo con timestamps, [TONO:], [SLIDE:], [PAUSA])

REGLAS:
1. TONO: Altamente emocional, cercano, latino. Como un hermano mayor que genuinamente quiere ayudar.
2. PROGRESIÓN: La urgencia sube gradualmente desde la historia hasta el cierre.
3. STORYTELLING: Usar en la origin story y en cada secreto.
4. CULTURALMENTE ADAPTADO para ${getCountryName(country)}: expresiones locales, valores culturales, moneda, referencias.
5. Cada pieza debe poder funcionar INDEPENDIENTEMENTE.
6. NO repetir el mismo mensaje - cada sección tiene un ÁNGULO ÚNICO.
7. LANDING PAGE: Estructura optimizada para >50% conversión con TODAS las recomendaciones de diseño.
8. COHERENCIA: El tono y promesa de la landing debe ser COHERENTE con el webinar.

¡GENERA LA LANDING PAGE Y EL GUIÓN COMPLETO AHORA!
`;}

// ═══════════════════════════════════════════════════════════════
// PARTE 2: SECUENCIA DE 15 CORREOS ELECTRÓNICOS
// ═══════════════════════════════════════════════════════════════

function buildAutowebinarPrompt_Part2(ep: any, ap: any, ps: any, pi: any, country: string): string {
  const sharedContext = buildAutowebinarSharedContext(ep, ap, ps, pi, country);
  const productName = pi?.name || 'El Producto';
  const guaranteePeriod = pi?.guaranteePeriod || '60';

  return `
${sharedContext}

═══════════════════════════════════════════════════════════════════════
INSTRUCCIONES DE GENERACIÓN - PARTE 2 de 3
Genera: Secuencia Completa de 15 Correos Electrónicos
CONTEXTO: Ya se generó la Landing Page y el Guión del Webinar (Parte 1).
Los emails deben ser coherentes con la promesa de la landing y los 3 secretos del webinar.
═══════════════════════════════════════════════════════════════════════

████████████████████████████████████████████████████████████████████████
SECCIÓN 2: SECUENCIA DE 15 CORREOS ELECTRÓNICOS
████████████████████████████████████████████████████████████████████████

Genera los 15 correos con esta estructura para CADA UNO:
- **ASUNTO:** (línea de asunto con gancho emocional, máx 60 caracteres)
- **PRE-ENCABEZADO:** (preview text que complementa el asunto, máx 90 caracteres)
- **CUERPO:** (el email completo con tono emocional latino, 150-300 palabras por email)
- **CTA:** (llamada a acción clara con la variable de link correcta)

VARIABLES DINÁMICAS a usar:
- %FIRSTNAME% = nombre del lead
- {{fecha_del_webinar}} = fecha dinámica del webinar
- {{grupo_de_whatsapp}} = link del grupo WhatsApp
- {{link_del_calendario}} = link para agendar
- {{link_de_compra}} = link de la oferta
- {{link_de_soporte}} = link de soporte
- {{link_webinar}} = link del webinar en vivo
- {{link_ebook}} = link del ebook de regalo

---

### CORREO 1: BIENVENIDA + EBOOK + ENCUESTA
📩 Timing: Inmediato al registro
Propósito: Dar la bienvenida, entregar lead magnet (ebook), generar reciprocidad.
Tono: Celebratorio, cálido, generoso.
Elementos: Felicitación por registrarse, entregar ebook de regalo con promesa específica (ej: "el método para generar tus primeros $X con [nicho]"), invitar a leerlo ANTES del webinar para mayor provecho. CTA: descargar ebook.

### CORREO 2: CONFIRMACIÓN + 2 PASOS
📩 Timing: 5 minutos después del registro
Propósito: Confirmar acceso y llevar al grupo de WhatsApp + calendario.
Tono: Directo, entusiasta.
Elementos: Reforzar promesa del webinar (3 secretos), listar qué aprenderán (3-4 bullets), 2 PASOS obligatorios: 1) Unirse grupo WhatsApp 2) Agregar al calendario. CTA: ambos links.

### CORREO 3: FALTAN 5 DÍAS
📩 Timing: D-5, 2:00pm
Propósito: Romper creencias limitantes, activar mentalidad.
Tono: Desafiante pero empático.
Elementos: Confrontar excusas comunes ("no tengo dinero", "no es el momento"), ejercicio práctico (escribir creencias limitantes y transformarlas en afirmaciones de poder), invitar a responder el email. CTA: link grupo + calendario.

### CORREO 4: FALTAN 4 DÍAS
📩 Timing: D-4, 2:00pm
Propósito: Diferenciación - "Tú no eres como la mayoría".
Tono: Motivacional, empoderador.
Elementos: Contraste entre "la mayoría se rinde" vs "tú sigues aquí", listar 3 promesas del webinar, pregunta reflexiva: "¿Te vas a rendir antes de entrar?". CTA: grupo WhatsApp.

### CORREO 5: FALTAN 3 DÍAS
📩 Timing: D-3, 2:00pm
Propósito: Coherencia - reflejar por qué no tienen resultados.
Tono: Directo, sin rodeos.
Elementos: Diagnóstico sincero (quieren resultados pero no confían, quieren libertad pero actúan con miedo), reforzar qué van a aprender, frase ancla: "No puedes escalar lo que no estás dispuesto a sostener". CTA: grupo + calendario.

### CORREO 6: FALTAN 2 DÍAS - STORYTELLING PERSONAL
📩 Timing: D-2, 2:00pm
Propósito: Conexión emocional profunda con historia del experto.
Tono: Vulnerable, personal, esperanzador.
Elementos: Historia personal del experto (fracasos, intentos fallidos, la frustración), el turning point (descubrir un sistema paso a paso), promesa de que en el webinar compartirá ese camino. Este es el email MÁS EMOCIONAL de la secuencia pre-webinar. CTA: grupo WhatsApp.

### CORREO 7: ES MAÑANA
📩 Timing: D-1, 2:00pm
Propósito: Anticipación máxima, elevar la importancia.
Tono: Profundo, filosófico pero práctico.
Elementos: Reflexión sobre el sistema (los resultados llegan cuando entiendes cómo funciona, no por esfuerzo), listar 4 grandes aprendizajes del webinar, frase cierre: "Tú decides si mañana es solo otro día... o el día en que todo cambia". CTA: grupo + calendario.

### CORREO 8: ES HOY
📩 Timing: Día D, 12:00pm
Propósito: Recordatorio directo, urgencia.
Tono: Directo, urgente, sin rodeos.
Elementos: "HOY a las [HORA] es la MasterClass." Mensaje corto y poderoso. "Esta clase no se repetirá." Confrontación: "O sigues buscando excusas... o te conectas hoy." CTA: grupo WhatsApp.

### CORREO 9: FALTAN 3 HORAS
📩 Timing: Día D, 5:00pm (3hrs antes)
Propósito: Último recordatorio con promesa de valor.
Tono: Entusiasta, anticipatorio.
Elementos: "Faltan solo 3 HORAS", reforzar qué aprenderán (3 bullets poderosos), "Las personas que actúan son las que cambian su vida." CTA: link del webinar.

### CORREO 10: ESTAMOS EN VIVO
📩 Timing: Día D, 5 min antes de empezar
Propósito: Llevar al webinar YA.
Tono: Urgente, máxima energía.
Elementos: "Estamos en vivo", link directo, link alternativo texto, frase corta: "Estás a una decisión de distancia." CTA: link webinar.

### CORREO 11: OFERTA + BONOS DE URGENCIA
📩 Timing: Día D, 90 min después de iniciar (post-revelación oferta)
Propósito: Presentar la oferta completa a quienes vieron el webinar.
Tono: Agradecido, generoso, urgente.
Elementos: Agradecimiento por asistir, recordar el momento de inflexión, presentar "${productName}" con STACK COMPLETO (listar cada módulo/componente), listar BONOS exclusivos detallados, bonos de urgencia 24hrs (ej: clases en vivo, soporte personalizado). CTA: link de compra.

### CORREO 12: NUEVO REGALO - DÍA SIGUIENTE
📩 Timing: D+1, 9:00am
Propósito: Reactivar con escasez - deadline hoy 10PM.
Tono: Urgente pero amigable.
Elementos: "¡Hoy es tu última oportunidad!", detallar los 2 bonos que desaparecen hoy, deadline claro "HASTA LAS 10 PM". CTA: link de compra.

### CORREO 13: SOPORTE - DÍA SIGUIENTE
📩 Timing: D+1, 2:00pm
Propósito: Manejar objeciones con soporte humano.
Tono: Empático, servicial.
Elementos: "¿Tienes preguntas?", validar que es normal tener dudas, ofrecer link de soporte para hablar con el equipo, recordar deadline de bonos. CTAs: link soporte + link de compra.

### CORREO 14: GARANTÍA - DÍA SIGUIENTE
📩 Timing: D+1, 5:00pm
Propósito: Reversión de riesgo total.
Tono: Confiado, tranquilizador.
Elementos: "Yo asumo el riesgo por ti", ${guaranteePeriod} días para probar sin riesgo, detallar qué pueden hacer en ese período (explorar módulos, clases en vivo, aplicar), "Te regreso el 100% sin preguntas." CTA: link de compra.

### CORREO 15: ÚLTIMO AVISO - DÍA SIGUIENTE
📩 Timing: D+1, 8:00pm (2hrs antes del cierre)
Propósito: Escasez final - últimas 2 horas.
Tono: Urgente, directo, emocional.
Elementos: "Estás a punto de perder tu regalo", solo quedan 2 HORAS, listar bonos que desaparecen, simplificar: "es más simple de lo que crees, solo necesitas un paso a paso." CTA: link de compra.

═══════════════════════════════════════════════════════════════════════
FORMATO DE SALIDA - PARTE 2
═══════════════════════════════════════════════════════════════════════

Usa estos encabezados EXACTOS en Markdown:

# SECUENCIA DE CORREOS ELECTRÓNICOS
## Correo 1: Bienvenida + Ebook
## Correo 2: Confirmación
## Correo 3: Faltan 5 Días
## Correo 4: Faltan 4 Días
## Correo 5: Faltan 3 Días
## Correo 6: Faltan 2 Días
## Correo 7: Es Mañana
## Correo 8: Es Hoy
## Correo 9: Faltan 3 Horas
## Correo 10: Estamos en Vivo
## Correo 11: Oferta + Bonos
## Correo 12: Nuevo Regalo
## Correo 13: Soporte
## Correo 14: Garantía
## Correo 15: Último Aviso

Para CADA correo incluye: **ASUNTO:** | **PRE-ENCABEZADO:** | **CUERPO:** (completo) | **CTA:**

REGLAS:
1. TONO: Altamente emocional, cercano, latino. Como un hermano mayor que genuinamente quiere ayudar.
2. PROGRESIÓN: La urgencia sube de suave (D-5) a máxima (D+1).
3. STORYTELLING: El email de D-2 debe ser el más emocional con la historia del experto.
4. VARIABLES: Usar las variables dinámicas correctas (%FIRSTNAME%, {{fecha_del_webinar}}, etc.)
5. FORMATO EMAIL: Párrafos cortos (2-3 líneas), espaciado generoso, emojis moderados.
6. CULTURALMENTE ADAPTADO para ${getCountryName(country)}: expresiones locales, valores culturales, moneda, referencias.
7. Cada email debe funcionar INDEPENDIENTEMENTE.
8. Los CTAs deben ser CLAROS y usar las variables de links correctas.
9. NO repetir el mismo mensaje - cada email tiene un ÁNGULO ÚNICO.
10. COHERENCIA: Los emails deben referenciar los "3 Secretos" y la promesa central del webinar.

¡GENERA LOS 15 CORREOS COMPLETOS AHORA!
`;
}

// ═══════════════════════════════════════════════════════════════
// PARTE 3: 30 COMUNICADOS WHATSAPP + DESCRIPCIÓN DE GRUPO
// ═══════════════════════════════════════════════════════════════

function buildAutowebinarPrompt_Part3(ep: any, ap: any, ps: any, pi: any, country: string): string {
  const sharedContext = buildAutowebinarSharedContext(ep, ap, ps, pi, country);
  const productName = pi?.name || 'El Producto';
  const guaranteePeriod = pi?.guaranteePeriod || '60';

  return `
${sharedContext}

═══════════════════════════════════════════════════════════════════════
INSTRUCCIONES DE GENERACIÓN - PARTE 3 de 3
Genera: 30 Comunicados de WhatsApp + Descripción del Grupo
CONTEXTO: Ya se generaron Landing Page, Guión del Webinar y 15 Emails.
Los comunicados son COMPLEMENTARIOS a los emails (más cortos y directos).
═══════════════════════════════════════════════════════════════════════

████████████████████████████████████████████████████████████████████████
SECCIÓN 3: SECUENCIA DE 30 COMUNICADOS DE WHATSAPP
████████████████████████████████████████████████████████████████████████

Genera los 30 comunicados con esta estructura para CADA UNO:
- **TIMING:** (día relativo y hora exacta: D-5, D-4, D-3, D-2, D-1, Día D, D+1)
- **MENSAJE:** (texto completo con emojis, negritas con asteriscos *texto*)
- **MULTIMEDIA:** (si aplica: [VIDEO], [AUDIO], [IMAGEN] con guión/brief COMPLETO inline)

IMPORTANTE: Los guiones de multimedia (videos, audios, briefs de imagen) están INCLUIDOS
INLINE dentro de los comunicados que los necesitan. Genera el guión completo dentro del comunicado.

FORMATO WhatsApp:
- Usar *asteriscos* para negritas
- Usar _guiones bajos_ para cursivas
- Emojis estratégicos (🔥🚨⏰✅❌💰🎁🚀💡📅📌🔗)
- Mensajes concisos pero impactantes (máx 150 palabras por comunicado)
- Variables: {{nombre}}, {{fecha_del_webinar}}, {{link_grupo}}, {{link_calendario}}, {{link_webinar}}, {{link_compra}}, {{link_soporte}}

---

### PRE-WEBINAR (Calentamiento)

**COM 1: BIENVENIDA GRUPO**
📱 Timing: Al llenarse el grupo
Propósito: Primera impresión, establecer expectativa.
Elementos: Bienvenida con energía 🔥, mencionar "Los 3 secretos para [PROMESA]", fecha y hora, link calendario. Mensaje del experto con personalidad.

**COM 2: D-5**
📱 Timing: D-5, 11:00am
Propósito: Primer valor + anticipación.
Elementos: Error más común del nicho, anticipar que en la MasterClass lo resolverán, fecha + link calendario. Tono educativo-curioso.

**COM 3: D-4**
📱 Timing: D-4, 8:00pm
Propósito: Romper excusas, motivar.
Elementos: Listar excusas comunes con ❌, contrapunto: "Pero tú sigues aquí. Eso ya te pone por encima del promedio." Fecha + calendario.

**COM 4: D-3**
📱 Timing: D-3, 8:00pm
Propósito: Diagnóstico sincero.
Elementos: "Si hoy tus resultados no están donde deberían... no es por falta de ganas", listar problemas con 📍, MasterClass como solución, tono directo.

**COM 5: D-2**
📱 Timing: D-2, 12:00pm
Propósito: Infoxicación como enemigo.
Elementos: "¿Sientes que entre tanta información no sabes por dónde empezar?", "Lo que te falta no es motivación. Es un paso a paso claro." Fecha exacta.

### ES MAÑANA (3 comunicados)

**COM 6: D-1 - ZONAS HORARIAS**
📱 Timing: D-1, 12:00pm
[VIDEO] GUIÓN para video del experto o embajador (30 seg max, energía alta, fondo limpio):
Genera guión palabra por palabra. El experto emocionado mirando a cámara dice que mañana es la MasterClass e invita a verificar la zona horaria.
Elementos: Tabla de zonas horarias por país (🇺🇸🇲🇽🇬🇹🇸🇻🇨🇷🇨🇴🇵🇪🇵🇦🇪🇨🇩🇴🇻🇪🇵🇾🇵🇷🇨🇱🇺🇾🇦🇷🇪🇸), link recordatorio calendario.

**COM 7: D-1 - TESTIMONIO**
📱 Timing: D-1, 4:00pm
[VIDEO] Brief de video testimonio (15-30 seg, formato vertical, subtitulado):
Video de un caso de éxito real diciendo su resultado más impactante.
Elementos: Frase del testimonio en negritas, "todo empezó asistiendo a esta MasterClass", fecha + link.

**COM 8: D-1 - RESULTADOS**
📱 Timing: D-1, 8:00pm
[IMAGEN] Brief para diseñador:
Screenshot de dashboard de ventas/resultados impactantes. Datos reales. Formato cuadrado, con marca de agua sutil de ${productName}.
Elementos: "¿Te imaginas haber logrado [RESULTADO] en solo [TIEMPO]?", "Estos resultados los tienen personas que ya hacen parte de ${productName}", fecha MasterClass.

### DÍA DEL WEBINAR

**COM 9: Día D - ES HOY**
📱 Timing: Día D, 9:00am
[VIDEO] GUIÓN para video del experto (45 seg max, casual, con energía):
Genera guión palabra por palabra. El experto mirando a cámara, tono cercano y emocionado, dice que hoy es la MasterClass, menciona la promesa central, los 3 temas clave y pide activar el recordatorio.
Comunicado texto después del video: 🚨 "IMPORTANTE: MIRA EL VIDEO" + recordatorio hora + promesa + CTA.

**COM 10: Día D - FALTAN 4 HORAS**
📱 Timing: Día D, 4:00pm
Elementos: "En 4 horas..." + revelación de los 3 secretos + fecha/hora + link registro. Corto y directo.

**COM 11: Día D - FALTA 1 HORA**
📱 Timing: Día D, 7:00pm
Elementos: "En 1 hora inicia la MASTERCLASS 🔥", mencionar los 3 temas principales del webinar (usar los temas de los 3 Secretos del producto, NO valores genéricos), link webinar.

**COM 12: Día D - FALTAN 10 MINUTOS**
📱 Timing: Día D, 7:50pm
Elementos: "SOLO 10 MINUTOS PARA COMENZAR ⌛", link acceso, instrucción: "Ten tu cuaderno listo y apunta todo. Porque el que no apunta... no dispara. 📖✏️"

**COM 13: Día D - ESTAMOS EN VIVO 1**
📱 Timing: Día D, 7:55pm
Elementos: 🚨 "¡ESTAMOS EN VIVO!" 🚨, "Estás a un clic de distancia de TRANSFORMAR TU FUTURO 🔥", link webinar.

**COM 14: Día D - ESTAMOS EN VIVO 2**
📱 Timing: Día D, 8:00pm
Elementos: "¿Te lo vas a perder?" 😱, "Solo faltas tú 👀", link directo webinar, "Si llegas tarde, te lo pierdes. 🔥"

**COM 15: Día D - VAS TARDE 1**
📱 Timing: Día D, 8:10pm
Elementos: "¡VAS TARDE, PERO AÚN PUEDES ENTRAR! ⏳🔥", la MasterClass ya comenzó, link directo. Tono urgente pero esperanzador.

**COM 16: Día D - VAS TARDE 2**
📱 Timing: Día D, 8:15pm
Elementos: "¿Es en serio?" 🤦‍♂️ (tono más fuerte, incredulidad), "Estoy revelando los secretos y no puedo creer que no estés aquí", link. Tono de reclamo amistoso.

**COM 17: Día D - VAS TARDE 3**
📱 Timing: Día D, 8:20pm
Elementos: Pregunta gancho sobre el resultado deseado 🤑, "Te cuento cómo lograrlo en la MasterClass... ya comenzamos pero todavía puedes entrar", link.

**COM 18: Día D - VAS TARDE 4**
📱 Timing: Día D, 8:30pm
Elementos: "¿Por qué no estás logrando [RESULTADO]? 🚨 Justo ahora estoy revelando la razón principal...", FOMO máximo, link. Último llamado.

### OFERTA (Post-revelación en vivo)

**COM 19: Día D - INSCRIPCIONES ABIERTAS**
📱 Timing: Día D, ~9:15pm (al revelar oferta)
Elementos: "🎁 NUEVO REGALO DESBLOQUEADO", por acceder HOY a ${productName}: listar bonos con ✅, link de compra, "P.D: Este regalo estará disponible solo por 24 horas."

### DÍA SIGUIENTE - CIERRE (11 comunicados de urgencia progresiva)

**COM 20: D+1 - HOY DESAPARECE EL REGALO**
📱 Timing: D+1, 8:00am
Elementos: "🚨 ¡Última oportunidad!", último día para acceder con bonos, listar bonos con ✅, "disponible solo hasta HOY a las 10:00 pm", link compra.

**COM 21: D+1 - TESTIMONIOS VIDEO**
📱 Timing: D+1, 10:00am
[VIDEO] Brief de video testimonios (compilación 2-3 testimonios cortos, 10-15 seg c/u, formato vertical, subtitulado, con nombre y resultado en pantalla).
Elementos: "Estos son los resultados de personas que decidieron dejar de improvisar", "Tú puedes ser el próximo caso de éxito con ${productName}", recordar deadline bonos.

**COM 22: D+1 - SOPORTE**
📱 Timing: D+1, 12:00pm
Elementos: "¿Tienes preguntas o necesitas ayuda? ❓", validar dudas como normales, link soporte, recordar bonos disponibles, link compra.

**COM 23: D+1 - GARANTÍA**
📱 Timing: D+1, 2:00pm
Elementos: "🚨 YO ASUMO EL RIESGO POR TI...", garantía de ${guaranteePeriod} días, "Te devolveré el 100% sin preguntas ni condiciones 🔐", link compra, "No tienes nada que perder y todo por ganar 🔥"

**COM 24: D+1 - TESTIMONIOS IMAGEN**
📱 Timing: D+1, 4:00pm
[IMAGEN] Brief para diseñador:
Collage/carrusel de 3-4 screenshots de ganancias reales de estudiantes/clientes. Dashboards, transferencias, métricas. Formato vertical para WhatsApp, con marca de ${productName}. Profesional pero auténtico.
Elementos: "¿Y si esas fueran TUS ganancias?", contraste lifestyle (Netflix vs construir negocio), link compra.

**COM 25: D+1 - FALTAN 4 HORAS**
📱 Timing: D+1, 6:00pm
[VIDEO] GUIÓN para video del experto (30 seg, fondo neutro, mirada directa):
Genera guión palabra por palabra. El experto serio y urgente dice que esto se acaba en 4 horas, menciona lo que pierden si no actúan, y da CTA directo.
Comunicado texto: "⬆️ MIRA EL VIDEO ⬆️", se acaba en 4 horas, link compra + link soporte para dudas.

**COM 26: D+1 - FALTAN 2 HORAS**
📱 Timing: D+1, 8:00pm
[AUDIO] GUIÓN para nota de voz del experto (45 seg, natural, sin leer):
Genera guión palabra por palabra. Tono conversacional, como hablándole a un amigo. Urgencia, menciona los bonos, contraste entre actuar o seguir igual, CTA con deadline 10PM.
Comunicado: "Escucha hasta el final 👆", 2 horas, link compra, deadline 10PM.

**COM 27: D+1 - FALTA 1 HORA**
📱 Timing: D+1, 9:00pm
Elementos: "⏰ Estás a punto de perder tu regalo...", "Solo te queda 1 HORA y desaparece para siempre", listar bonos con ✅, "${productName} es el paso a paso exacto para [RESULTADO]", link compra, "No lo pienses más... ¡Haz clic ahora! 🚀"

**COM 28: D+1 - FALTAN 30 MINUTOS**
📱 Timing: D+1, 9:30pm
[AUDIO] GUIÓN para nota de voz del experto (25 seg, emocional, directo):
Genera guión palabra por palabra. Tono intenso pero genuino. Presión final: solo quedan 30 minutos, si no lo hace hoy mañana seguirá en el mismo lugar.
Comunicado: "ESCUCHA CON ATENCIÓN... ☝️", 30 minutos, link compra.

**COM 29: D+1 - FALTAN 15 MINUTOS**
📱 Timing: D+1, 9:45pm
Elementos: "🚨 Solo 15 minutos para cerrar las inscripciones 🚨", "En 15 minutos cerraremos las puertas", último CTA, "Es ahora o sigues como estás. Toma acción. 🚀"

**COM 30: D+1 - GRACIAS / CIERRE**
📱 Timing: D+1, 10:00pm
Elementos: "¡Eso fue todo! 🙌", agradecer a los que entraron 🙏, "Los cupos con bonos exclusivos se han agotado 🔴", felicitar a la comunidad, "Ahora empieza lo bueno 🔥", cierre con energía positiva.

████████████████████████████████████████████████████████████████████████
SECCIÓN 4: DESCRIPCIÓN DEL GRUPO WHATSAPP
████████████████████████████████████████████████████████████████████████

Genera la descripción del grupo WhatsApp con:
- "⬇️ IMPORTANTE: LEE ESTO ⬇️"
- Bienvenida al grupo exclusivo de la MasterClass
- Qué recibirán (información en primicia, enlace para clase en vivo, recursos exclusivos)
- Fecha y hora del webinar
- "El grupo permanecerá cerrado, solo confíen en mensajes oficiales"
- Asegúrense de estar listos

═══════════════════════════════════════════════════════════════════════
FORMATO DE SALIDA - PARTE 3
═══════════════════════════════════════════════════════════════════════

Usa estos encabezados EXACTOS en Markdown:

# SECUENCIA DE COMUNICADOS WHATSAPP
## Com 1: Bienvenida Grupo
## Com 2: D-5
## Com 3: D-4
## Com 4: D-3
## Com 5: D-2
## Com 6: D-1 Zonas Horarias
## Com 7: D-1 Testimonio
## Com 8: D-1 Resultados
## Com 9: Es Hoy
## Com 10: Faltan 4 Horas
## Com 11: Falta 1 Hora
## Com 12: Faltan 10 Min
## Com 13: En Vivo 1
## Com 14: En Vivo 2
## Com 15: Vas Tarde 1
## Com 16: Vas Tarde 2
## Com 17: Vas Tarde 3
## Com 18: Vas Tarde 4
## Com 19: Oferta
## Com 20: D+1 Regalo
## Com 21: D+1 Testimonios
## Com 22: D+1 Soporte
## Com 23: D+1 Garantía
## Com 24: D+1 Testimonios Imagen
## Com 25: D+1 Faltan 4h
## Com 26: D+1 Faltan 2h
## Com 27: D+1 Falta 1h
## Com 28: D+1 Faltan 30min
## Com 29: D+1 Faltan 15min
## Com 30: Cierre

# DESCRIPCIÓN DEL GRUPO WHATSAPP

REGLAS:
1. TONO: Altamente emocional, cercano, latino. Como un hermano mayor que genuinamente quiere ayudar.
2. PROGRESIÓN: La urgencia sube de suave (D-5) a máxima (últimos 15 min D+1).
3. VARIABLES: Usar las variables dinámicas correctas ({{nombre}}, {{fecha_del_webinar}}, etc.)
4. FORMATO WHATSAPP: *negritas*, _cursivas_, emojis estratégicos, mensajes concisos (máx 150 palabras).
5. CULTURALMENTE ADAPTADO para ${getCountryName(country)}: expresiones locales, valores culturales.
6. Cada comunicado debe funcionar INDEPENDIENTEMENTE.
7. Los CTAs deben ser CLAROS y usar las variables de links correctas.
8. NO repetir el mismo mensaje - cada comunicado tiene un ÁNGULO ÚNICO.
9. MULTIMEDIA: Los guiones de [VIDEO], [AUDIO] e [IMAGEN] van INLINE en cada comunicado. Genera guiones COMPLETOS palabra por palabra.
10. COHERENCIA: Los comunicados deben referenciar los "3 Secretos" y la promesa central.

¡GENERA LOS 30 COMUNICADOS Y LA DESCRIPCIÓN DEL GRUPO AHORA!
`;
}

// ═══════════════════════════════════════════════════════════════
// HIGH TICKET VSL ECOSYSTEM (COMPLETE COPY GENERATION)
// ═══════════════════════════════════════════════════════════════

function buildHighTicketVSLPrompt(ep: any, ap: any, ps: any, pi: any, ht: any, country: string): string {
  // Helper functions for formatting
  const getServiceTypeName = (type: string | undefined): string => {
    const types: Record<string, string> = {
      'coaching-1on1': 'Coaching 1 a 1',
      'coaching-group': 'Coaching Grupal',
      'mentorship': 'Mentoría',
      'consulting': 'Consultoría',
      'done-for-you': 'Done For You',
      'mastermind': 'Mastermind',
      'other': 'Servicio Premium'
    };
    return types[type || ''] || 'Servicio Premium';
  };

  const getProgramDurationName = (duration: string | undefined): string => {
    const durations: Record<string, string> = {
      '30-days': '30 días',
      '60-days': '60 días',
      '90-days': '90 días',
      '6-months': '6 meses',
      '12-months': '12 meses',
      'custom': 'Personalizado'
    };
    return durations[duration || ''] || '90 días';
  };

  const getCallFormatName = (format: string | undefined): string => {
    const formats: Record<string, string> = {
      'zoom': 'Videollamada por Zoom',
      'phone': 'Llamada telefónica',
      'in-person': 'Presencial'
    };
    return formats[format || ''] || 'Videollamada';
  };

  const getWhoConductsName = (who: string | undefined): string => {
    const conductors: Record<string, string> = {
      'you': 'ti mismo',
      'team': 'tu equipo',
      'closer': 'un closer de ventas'
    };
    return conductors[who || ''] || 'ti mismo';
  };

  const getConsciousnessStrategyHighTicket = (level: number | undefined): string => {
    const strategies: Record<number, string> = {
      0: `🟦 INCONSCIENTE - Raramente compran high ticket
Estrategia: Educar primero con contenido gratuito, luego traer a VSL`,
      1: `🟨 PROBLEM AWARE - Saben que tienen un problema pero no dimensionan el COSTO
Estrategia: AGITAR mostrando costo de oportunidad económico real, crear urgencia temporal`,
      2: `🟧 SOLUTION AWARE - Saben que existen soluciones, evaluando opciones
Estrategia: Posicionar TU PROCESO como único, diferenciarte de "cursos" y "coaching genérico"`,
      3: `🟥 PRODUCT AWARE - Te conocen pero tienen objeciones sobre inversión
Estrategia: DESTRUIR objeciones con casos de éxito, mostrar ROI claro, establecer exclusividad`,
      4: `🟪 MOST AWARE - Listos, solo necesitan validar que eres el indicado
Estrategia: Calificar MUY bien, mostrar selectividad, proceso consultivo`
    };
    return strategies[level ?? 2] || strategies[2];
  };

  const getCountryCulturalNotesHighTicket = (countryCode: string): string => {
    const notes: Record<string, string> = {
      mexico: `
🇲🇽 MÉXICO HIGH TICKET:
- Mencionar "construir un legado para tu familia"
- Usar "inversión en tu futuro" (no "gasto")
- Referencias a emprendimiento como "libertad financiera"
- Testimonios de diferentes estados (CDMX, Guadalajara, Monterrey)
- Tono: Cercano pero profesional, usar "tú"
- Mencionar estabilidad vs inseguridad
`,
      colombia: `
🇨🇴 COLOMBIA HIGH TICKET:
- Énfasis en "rebusque inteligente" y "emprendimiento estratégico"
- Mencionar "romper el techo de cristal"
- Usar casos de éxito de varias ciudades
- Tono: Motivacional pero realista, "parce" sutil
- Referencias a superación y crecimiento
`,
      argentina: `
🇦🇷 ARGENTINA HIGH TICKET:
- Hablar de "proteger tu poder adquisitivo"
- Mencionar "generar en dólares" o "ingresos dolarizados"
- Referencias a crisis económica SUPERADA
- Tono: Directo, sin vueltas, "che" ocasional
- Enfatizar estabilidad en contexto inestable
`,
      spain: `
🇪🇸 ESPAÑA HIGH TICKET:
- Tono MÁS profesional, menos emocional
- Mencionar "mercado europeo" y "estándares internacionales"
- Referencias a emprendimiento digital profesional
- Usar "tú" (nunca "vos" ni "usted")
- Casos de éxito de ciudades principales
`,
      multiple: `
🌎 MULTINACIONAL HIGH TICKET:
- Español neutro, evitar regionalismos
- Usar USD como moneda universal
- Referencias culturales amplias de Latinoamérica
- Casos de éxito de mínimo 5 países diferentes
- Tono: Universal pero cálido y profesional
`
    };
    return notes[countryCode] || notes.multiple;
  };

  // Extract values with defaults
  const minRevenue = ht?.qualificationCriteria?.minimumMonthlyRevenue || 5000;
  const investMin = ht?.investmentRange?.min || 3000;
  const investMax = ht?.investmentRange?.max || 10000;
  const expertName = ep?.voice?.name || 'El Experto';
  const programDuration = getProgramDurationName(ht?.programDuration);
  const serviceType = getServiceTypeName(ht?.serviceType);
  const callDuration = ht?.strategicCallInfo?.duration || 45;
  const callFormat = getCallFormatName(ht?.strategicCallInfo?.format);
  const whoConducts = getWhoConductsName(ht?.strategicCallInfo?.whoConducts);

  return `
═══════════════════════════════════════════════════════════════
🎯 GENERACIÓN COMPLETA: VSL HIGH TICKET + ECOSISTEMA DE COPYS
═══════════════════════════════════════════════════════════════

MISIÓN CRÍTICA:
Generar TODO el ecosistema de copys necesario para un embudo VSL High Ticket completo:
- 3 Versiones del VSL (con hooks diferentes)
- 3 Variaciones de Página de Captura
- 1 Página VSL completa
- 6 Emails de seguimiento (18 subject lines)
- 45 Scripts de Ads de Testeo
- 21 Ads de Remarketing

OBJETIVO DE CONVERSIÓN: 5-15% de viewers califiquen y agenden llamada
INVERSIÓN DEL SERVICIO: $${investMin}-${investMax}

═══════════════════════════════════════════════════════════════
INFORMACIÓN DEL PROYECTO
═══════════════════════════════════════════════════════════════

**SERVICIO:**
Tipo: ${ht?.serviceType === 'other' ? ht?.serviceTypeOther : serviceType}
Duración: ${ht?.programDuration === 'custom' ? ht?.programDurationCustom : programDuration}
Inversión: $${investMin} - $${investMax}
Nombre del producto: "${pi?.name || 'El Programa'}"
Problema que soluciona: "${pi?.audienceProblem || 'Problema principal de la audiencia'}"
Solución: "${pi?.solution || 'Solución principal'}"
Oferta basada en transformación: "${pi?.transformationOffer || 'Oferta de transformación'}"
${pi?.benefitBullets?.length ? `Bullets de beneficios:\n${pi.benefitBullets.map((b: string, i: number) => `${i + 1}. ${b}`).join('\n')}` : ''}
${pi?.keywords?.length ? `Palabras clave: ${pi.keywords.join(', ')}` : ''}

**CALIFICACIÓN DEL CLIENTE IDEAL:**
- Ingreso mensual mínimo: $${minRevenue}
- Experiencia requerida: ${ht?.qualificationCriteria?.requiredExperience || 'Negocio establecido'}
- Compromiso esperado: ${ht?.qualificationCriteria?.commitmentExpected || 'Implementación completa'}

**LLAMADA ESTRATÉGICA:**
- Duración: ${callDuration} minutos
- Formato: ${callFormat}
- Conducida por: ${whoConducts}

**PAÍS OBJETIVO:** ${getCountryName(country)}

═══════════════════════════════════════════════════════════════
PILAR 1: EXPERTO COMO CONSULTOR SELECTIVO
═══════════════════════════════════════════════════════════════

**IDENTIDAD:**
Nombre: ${expertName}
Tono: ${ep?.voice?.adjectives?.join(', ') || 'Profesional, Consultivo, Selectivo'}
Longitud de frases: ${ep?.voice?.sentenceLength || 'Variada'}
Humor: ${ep?.voice?.humorLevel || 'Medio'}

**HISTORIA DE TRANSFORMACIÓN:**
Momento más bajo: "${ep?.story?.lowestPoint || 'Historia pendiente'}"
Descubrimiento: "${ep?.story?.breakthrough || 'Breakthrough pendiente'}"
Situación actual: "${ep?.story?.current || 'Situación actual pendiente'}"

**CREENCIAS (usar sutilmente):**
${ep?.beliefs?.beliefs?.map((b: string, i: number) => `${i + 1}. "${b}"`).join('\n') || '1. Creencia pendiente'}

Enemigo común: "${ep?.beliefs?.commonEnemy || 'Sistemas obsoletos'}"
Promesa central: "${ep?.beliefs?.centralPromise || 'Transformación garantizada'}"

═══════════════════════════════════════════════════════════════
PILAR 2: AVATAR CUALIFICADO
═══════════════════════════════════════════════════════════════

**NIVEL DE CONCIENCIA:** ${ap?.consciousnessLevel ?? 2}

${getConsciousnessStrategyHighTicket(ap?.consciousnessLevel)}

**DOLOR PRIMARIO (mencionar 5+ veces):**
"${ap?.pains?.primary || 'El dolor principal del avatar'}"

**DOLORES POR DIMENSIÓN:**

💰 ECONÓMICOS (Costo de Oportunidad):
${ap?.pains?.economic?.map((p: string) => `• "${p}"`).join('\n') || '• Dolor económico pendiente'}

😔 EMOCIONALES (Frustración de Potencial):
${ap?.pains?.emotional?.map((p: string) => `• "${p}"`).join('\n') || '• Dolor emocional pendiente'}

👥 SOCIALES (Percepción vs Realidad):
${ap?.pains?.social?.map((p: string) => `• "${p}"`).join('\n') || '• Dolor social pendiente'}

🪞 IDENTIDAD (Brecha Ser vs Querer Ser):
${ap?.pains?.identity?.map((p: string) => `• "${p}"`).join('\n') || '• Dolor de identidad pendiente'}

**TRANSFORMACIÓN DESEADA:**
"${ap?.desires?.identityTransformation || 'La transformación que buscan'}"

**RESULTADOS TANGIBLES:**
- Económico: ${ap?.desires?.tangibleResults?.economic || 'Resultado económico'}
- Estilo de vida: ${ap?.desires?.tangibleResults?.lifestyle || 'Estilo de vida'}
- Relaciones: ${ap?.desires?.tangibleResults?.relationships || 'Relaciones'}

**OBJECIONES A DESTRUIR:**
${ap?.objections?.map((obj: any, i: number) => `
${i + 1}. "${obj.exact_words}"
   Raíz: ${obj.root_cause}
   Destrucción: ${obj.destruction}
`).join('\n') || '1. Objeción pendiente'}

**LENGUAJE DEL AVATAR:**
${ap?.language?.phrases?.join(', ') || 'palabras clave'}

═══════════════════════════════════════════════════════════════
PILAR 3: ESTRATEGIA DE PERSUASIÓN HIGH TICKET
═══════════════════════════════════════════════════════════════

**GATILLOS MENTALES ACTIVADOS:**
${ps?.mentalTriggers?.filter((t: any) => t.enabled).map((t: any) => `
✅ ${t.name}: ${t.application}
`).join('\n') || 'Gatillos pendientes'}

**GATILLOS CRÍTICOS PARA HIGH TICKET:**
- Exclusividad (mencionar 5+ veces)
- Inversión bidireccional
- Proceso consultivo (no venta)
- Calificación mutua

═══════════════════════════════════════════════════════════════
ADAPTACIÓN CULTURAL PARA ${country.toUpperCase()}
═══════════════════════════════════════════════════════════════

${getCountryCulturalNotesHighTicket(country)}

═══════════════════════════════════════════════════════════════
SECCIÓN 1: VSL SCRIPTS (3 VERSIONES COMPLETAS)
═══════════════════════════════════════════════════════════════

Genera 3 versiones COMPLETAS del VSL de 15-20 minutos:

## 🎯 VERSIÓN A: HOOK PATRÓN INTERRUPT

### [00:00-02:00] Hook A - Patrón Interrupt

REGLAS:
- NO empezar con "Hola, soy..."
- Pregunta provocativa o afirmación controversial
- Calificar desde el segundo 1
- Mencionar nivel mínimo: $${minRevenue}/mes

PLANTILLA:
"[00:00]
¿Sabes cuál es la diferencia entre alguien que genera $${minRevenue}/mes
y alguien que genera $[3-5x ese número]/mes?

[PAUSA 3 SEG]

[00:08]
No es talento. No es suerte. No es cuántas horas trabajan.

[PAUSA 2 SEG]

[00:12]
Es UN solo sistema que el segundo grupo conoce y el primero ni siquiera sabe que existe.

[Continuar siguiendo la estructura completa del VSL high ticket...]"

[TONO:] Intrigante, provocativo, selectivo
[B-ROLL:] Solo rostro, fondo neutro

### [02:00-06:00] Historia de Transformación
[Contenido basado en ${ep?.story?.lowestPoint}, ${ep?.story?.breakthrough}, ${ep?.story?.current}]

### [06:00-10:00] Agitación del Problema
[Agitar las 4 dimensiones de dolor con costo de oportunidad]

### [10:00-14:00] Presentación del Proceso
[Presentar PROCESO en 3-4 fases, NO producto]

### [14:00-17:00] Prueba Social
[Mínimo 3 testimonios con números ANTES/DESPUÉS]

### [17:00-19:00] Filtrado + Calificación
[Establecer criterios: ingreso mínimo $${minRevenue}, inversión $${investMin}-${investMax}]

### [19:00-20:00] CTA Consultivo
[CTA de 2 pasos: formulario → llamada de ${callDuration} minutos]

---

## 🎯 VERSIÓN B: HOOK SOCIAL PROOF STORY

### [00:00-02:00] Hook B - Testimonial Story

REGLAS:
- Empezar con historia específica de cliente
- NO revelar quién habla hasta después
- Ultra-específico: números, ciudad, tiempo

PLANTILLA:
"[00:00]
Hace 8 meses, María estaba sentada frente a su computadora
mirando los números de su negocio.

[PAUSA 2 SEG]

[00:05]
Por tercer año consecutivo, su facturación estaba estancada en $${minRevenue}/mes.

[Continuar con historia completa...]"

[TONO:] Narrativo, empático, inspirador
[B-ROLL:] Fotos/videos del cliente, resultados

[Continuar con secciones 02:00-20:00 igual que Versión A, adaptando transiciones]

---

## 🎯 VERSIÓN C: HOOK PAIN AGITATION

### [00:00-02:00] Hook C - Pain Agitation

REGLAS:
- Empezar verbalizando EL DOLOR EXACTO
- Usar palabras exactas del avatar
- Sentimiento visceral primero

PLANTILLA:
"[00:00]
"${ap?.pains?.primary || 'El dolor principal del avatar'}"

[PAUSA DRAMÁTICA 4 SEG]

[00:08]
Sé exactamente cómo se siente eso.

[PAUSA 2 SEG]

[00:11]
Despertar cada mañana sabiendo que trabajas tan duro como siempre,
pero los números en tu cuenta bancaria no cambian.

[Continuar agitando el dolor...]"

[TONO:] Empático, vulnerable, esperanzador
[B-ROLL:] Imágenes representando el dolor

[Continuar con secciones 02:00-20:00 igual que Versión A, adaptando transiciones]

═══════════════════════════════════════════════════════════════
SECCIÓN 2: PÁGINAS DE CAPTURA (3 VARIACIONES)
═══════════════════════════════════════════════════════════════

## 📄 PÁGINA DE CAPTURA A: TRÁFICO FRÍO

**Para:** Audiencia que NO te conoce

**HEADLINE:**
[Generar headline ultra-poderoso basado en dolor primario o deseo aspiracional]
Fórmula: "Cómo [Resultado Deseado] Sin [Obstáculo Principal] (Aunque [Objeción Común])"

Ejemplo:
"Cómo Romper el Techo de los $${minRevenue}/Mes Sin Trabajar Más Horas (Aunque Ya Hayas Intentado Todo)"

**SUBHEADLINE:**
[Clarificar la promesa + añadir credibilidad]
Fórmula: "[Quién] revela el [método único] que [X personas] están usando para [resultado específico] en [tiempo]"

**BULLETS DE BENEFICIOS (5-7):**
□ Descubre el sistema exacto que [resultado específico]
□ Por qué [método común] nunca funcionará (y qué hacer en su lugar)
□ El error #1 que mantiene a emprendedores estancados en $${minRevenue}/mes
□ Cómo [caso de éxito] rompió su techo y llegó a $[3x]/mes en [tiempo]
□ La estrategia contraintuitiva que [beneficio inesperado]
□ Por qué necesitas [requisito] ANTES de [acción común]
□ [Bonus]: El framework de 3 pasos para [resultado rápido]

**CTA BUTTON:**
"VER VIDEO GRATIS AHORA"

**COPY DEL CTA:**
"👉 Este video solo estará disponible hasta [fecha]. Míralo ahora antes de que lo quite."

**SOCIAL PROOF MINI:**
"Únete a los [número] emprendedores que ya descubrieron este sistema"

**COPY DE PRIVACIDAD:**
"🔒 100% privado. No spam. Cancela cuando quieras."

---

## 📄 PÁGINA DE CAPTURA B: TRÁFICO TIBIO

**Para:** Audiencia que ya vio tu contenido pero no te conoce bien

**HEADLINE:**
[Más directo, asumir cierto conocimiento previo]
Fórmula: "El Sistema [Adjetivo] para [Resultado] que Ya Está Funcionando en [Lugar]"

Ejemplo:
"El Sistema Probado para Romper tu Techo de Ingresos que Ya Están Usando ${country === 'mexico' ? 'Cientos de Emprendedores Mexicanos' : 'Emprendedores en ' + getCountryName(country)}"

**SUBHEADLINE:**
"Si ya estás generando al menos $${minRevenue}/mes pero sientes que llegaste a un techo, este video te mostrará exactamente cómo romperlo."

**BULLETS:** [Similares a Captura A pero más específicos]

**CTA BUTTON:**
"QUIERO VER EL SISTEMA COMPLETO"

---

## 📄 PÁGINA DE CAPTURA C: TRÁFICO CALIENTE

**Para:** Audiencia que te conoce, tiene engagement previo

**HEADLINE:**
[Muy directo, casi como conversación]
Fórmula: "[Nombre], ¿Listo para [Resultado]?"

Ejemplo:
"¿Listo para Romper tu Techo de Ingresos de Una Vez por Todas?"

**SUBHEADLINE:**
"He preparado un video especial mostrando el sistema exacto que uso con mis clientes privados para escalar de $${minRevenue} a $[3-5x] al mes."

**BULLETS:** [Más personalizados, asumen que ya hay confianza]

**CTA BUTTON:**
"SÍ, MUÉSTRAME EL SISTEMA"

═══════════════════════════════════════════════════════════════
SECCIÓN 3: PÁGINA VSL COMPLETA
═══════════════════════════════════════════════════════════════

## 📺 PÁGINA VSL (Donde se aloja el video)

### ARRIBA DEL VIDEO:

**HEADLINE:**
[Reforzar el hook más fuerte del VSL]
"Cómo [Número] Emprendedores de ${getCountryName(country)} Rompieron el Techo de $${minRevenue}/Mes (El Sistema Completo Revelado)"

**SUBHEADLINE:**
"En este video de ${callDuration === 45 ? '20' : '15'} minutos, descubrirás el método exacto que mis clientes están usando para escalar sus negocios sin trabajar más horas."

**PRE-FRAME COPY (Opcional):**
"⚠️ IMPORTANTE: Este video contiene información sensible sobre estrategias de escalamiento que no comparto públicamente. Por favor, míralo completo antes de decidir si es para ti o no."

---

### DEBAJO DEL VIDEO:

**RESUMEN DE LA OFERTA:**

"## ¿Qué Incluye Trabajar Conmigo?

Cuando califiques para trabajar conmigo, esto es lo que obtienes:

✅ **${ht?.serviceType === 'coaching-1on1' ? 'Coaching 1 a 1 Personalizado' : serviceType}** durante ${programDuration}

✅ **Estrategia Personalizada** diseñada específicamente para tu negocio (no plantillas genéricas)

✅ **Implementación Guiada** paso a paso con ${ht?.strategicCallInfo?.whoConducts === 'you' ? 'mi acompañamiento directo' : 'acompañamiento de mi equipo'}

✅ **Acceso Directo** ${ht?.strategicCallInfo?.format === 'zoom' ? 'vía Zoom' : ht?.strategicCallInfo?.format === 'phone' ? 'vía teléfono' : 'presencial'} para sesiones de ${callDuration} minutos

✅ **Sistema Probado** que ya ha generado resultados en [número] negocios similares al tuyo

**Inversión:** Entre $${investMin} y $${investMax} (dependiendo de tu situación específica)

⚠️ **IMPORTANTE:** No trabajo con todo el mundo. Solo acepto clientes que:
- Ya generan mínimo $${minRevenue}/mes
- ${ht?.qualificationCriteria?.requiredExperience || 'Tienen experiencia en su área'}
- Están listos para ${ht?.qualificationCriteria?.commitmentExpected || 'compromiso serio'}"

---

**SECCIÓN DE GARANTÍA:**

"## Mi Compromiso Contigo

No te voy a prometer resultados mágicos o rápidos. Eso sería deshonesto.

Lo que SÍ te garantizo es:

✅ Un sistema probado que ha funcionado en [número] negocios
✅ Mi ${ht?.strategicCallInfo?.whoConducts === 'you' ? 'atención personal' : 'supervisión directa del equipo'} durante todo el proceso
✅ Estrategias específicas para TU situación (no fórmulas genéricas)
✅ Honestidad brutal: si no veo que puedo ayudarte, te lo diré

Y si en algún momento sientes que no estoy cumpliendo mi parte, hablamos y lo resolvemos. Simple."

---

**TESTIMONIOS EN TEXTO (3-5):**

### 💬 Lo Que Dicen Mis Clientes

**María González - ${country === 'mexico' ? 'Ciudad de México' : getCountryName(country)}**
"Antes de trabajar con ${expertName}, estaba generando $8,000/mes pero no lograba escalar. En 4 meses llegué a $32,000/mes consistentes. Pero lo más valioso fue el SISTEMA que ahora tengo para seguir creciendo."
⭐⭐⭐⭐⭐

**Carlos Rodríguez - [Ciudad]**
"Llevaba 3 años estancado en el mismo nivel. En 90 días rompí ese techo. No fue magia, fue seguir el sistema paso a paso con el acompañamiento correcto."
⭐⭐⭐⭐⭐

**Ana Martínez - [Ciudad]**
"Lo que más me gustó fue la honestidad. ${expertName} no me prometió resultados instantáneos. Me dijo exactamente qué esperar y cumplió. Hoy mi negocio es completamente diferente."
⭐⭐⭐⭐⭐

[Generar 2 testimonios más siguiendo el mismo patrón]

---

**FAQ (5-8 Preguntas):**

### ❓ Preguntas Frecuentes

**P: ¿Esto funciona si estoy en [industria específica]?**
R: El sistema funciona independiente de la industria. He trabajado con [listar 3-5 industrias]. Lo importante no es QUÉ vendes, sino CÓMO escalas.

**P: ¿Cuánto tiempo toma ver resultados?**
R: La mayoría de mis clientes empiezan a ver cambios significativos entre la semana 4 y 8. Pero resultados consistentes toman ${ht?.programDuration === '90-days' ? '90 días completos' : 'el programa completo'}. No hay atajos.

**P: ¿Necesito invertir en publicidad?**
R: Depende de tu negocio. En la llamada estratégica analizamos tu situación específica y determinamos qué necesitas. Para algunos sí, para otros no.

**P: ¿Qué pasa si no califico?**
R: Si después de revisar tu formulario veo que no puedo ayudarte en este momento, te lo digo honestamente. Prefiero ser directo que tomar tu dinero sabiendo que no funcionará.

**P: ¿Ofreces garantía de reembolso?**
R: No. Porque esto no es un curso pasivo. Es trabajo 1 a 1 donde yo invierto tanto tiempo como tú. Si llegas a la llamada y decides que no es para ti, perfecto. Pero una vez que empezamos, ambos estamos comprometidos.

**P: ¿Por qué la inversión es entre $${investMin} y $${investMax}?**
R: Porque cada negocio es diferente. En la llamada estratégica analizamos tu situación específica y determinamos el nivel de acompañamiento que necesitas. Algunos requieren más, otros menos.

**P: ¿Cuántos clientes aceptas al mismo tiempo?**
R: ${ht?.strategicCallInfo?.whoConducts === 'you' ? 'Como trabajo personalmente con cada cliente, solo acepto 5-8 nuevos clientes por trimestre.' : 'Mi equipo puede manejar hasta 15-20 clientes simultáneamente, pero yo superviso cada caso personalmente.'}

**P: ¿Qué diferencia esto de otros programas de coaching?**
R: Tres cosas: 1) No acepto a cualquiera - solo clientes que SÉ que puedo ayudar. 2) No uso plantillas genéricas - todo es personalizado. 3) No prometo resultados mágicos - prometo un sistema probado y acompañamiento real.

---

**URGENCIA/ESCASEZ COPY:**

"## ⏰ Solo Acepto [Número] Clientes Nuevos Este ${ht?.programDuration === '90-days' ? 'Trimestre' : 'Semestre'}

Debido a la naturaleza personalizada del trabajo, solo puedo trabajar con un número limitado de clientes ${ht?.programDuration === '90-days' ? 'por trimestre' : 'al mismo tiempo'}.

Actualmente tengo [X] espacios disponibles.

Si quieres uno de ellos, completa el formulario abajo AHORA."

---

**CTA FINAL REFORZADO:**

"## 👇 Siguiente Paso: Agenda Tu Llamada Estratégica GRATIS

Si cumples los criterios que mencioné en el video, el siguiente paso es simple:

**1.** Completa el formulario abajo (son solo [número] preguntas, toma 3 minutos)

**2.** Mi equipo revisará tus respuestas en las próximas 24-48 horas

**3.** Si veo que puedo ayudarte, te contactaremos para agendar tu llamada estratégica de ${callDuration} minutos

**4.** En esa llamada, analizamos tu situación específica y determinamos si trabajar juntos tiene sentido para AMBOS

No hay compromiso hasta ese momento. La llamada es 100% gratis.

[BOTÓN GRANDE: "COMPLETAR FORMULARIO Y AGENDAR LLAMADA"]

⚠️ **Recuerda:** Solo calificas si ya generas mínimo $${minRevenue}/mes y estás listo para invertir entre $${investMin} y $${investMax} en tu transformación."

---

**COMENTARIOS FALSOS (10-15):**

### 💬 Comentarios

**Juan P. - Hace 2 horas**
"Acabo de ver el video completo. Ese sistema de [mencionar concepto del video] tiene mucho sentido. Ya completé el formulario, espero calificar 🤞"
👍 24

**María R. - Hace 5 horas**
"¿Alguien más piensa que $${investMin} es mucho? 😅"

  **↳ Carlos M. - Hace 4 horas**
  "Al principio también pensé eso, pero hice los números. Si te ayuda a romper tu techo y pasar de $${minRevenue} a $[2-3x], se paga solo en 2-3 meses. Es inversión, no gasto."
  👍 18

  **↳ Ana L. - Hace 3 horas**
  "Exacto. Yo gasté más en cursos que no me sirvieron para nada. Prefiero invertir bien una vez."
  👍 12

**Pedro S. - Hace 8 horas**
"Muy buen video. ¿Pero funciona para [industria específica]? Porque yo estoy en [X]"

  **↳ ${expertName} - Hace 7 horas**
  "Sí, he trabajado con varios negocios de [esa industria]. Lo importante es que ya tengas la base (mínimo $${minRevenue}/mes). Si calificas, en la llamada vemos cómo aplicarlo a tu caso específico."
  👍 8

**Laura T. - Hace 1 día**
"¡Gracias por este video! Justo lo que necesitaba escuchar. Estoy en $${minRevenue}/mes desde hace 2 años y ya me estaba resignando 😔"
👍 31

**Roberto F. - Hace 1 día**
"Completé el formulario ayer y me contactaron hoy. Llamada agendada para mañana. Ya les contaré cómo va 👊"
👍 15

**Carmen G. - Hace 2 días**
"Ese punto sobre [concepto del video] me voló la cabeza 🤯. Nunca lo había visto desde esa perspectiva."
👍 22

**Diego M. - Hace 2 días**
"¿Esto es solo para ${getCountryName(country)} o también sirve para otros países?"

  **↳ ${expertName} - Hace 1 día**
  "El sistema funciona en cualquier país, pero me especializo en ${getCountryName(country)} porque conozco el mercado, la cultura y los desafíos específicos. Si estás en otro país, igual completa el formulario y vemos si puedo ayudarte."
  👍 5

**Sandra K. - Hace 3 días**
"Yo trabajé con ${expertName} hace 6 meses. Literal cambió mi negocio. Si califican, háganlo. Vale cada peso."
👍 47

  **↳ Juan P. - Hace 2 días**
  "¿De verdad? ¿Cuánto tiempo te tomó ver resultados?"

  **↳ Sandra K. - Hace 2 días**
  "Las primeras 4 semanas fueron setup (estrategia, planificación). A partir de la semana 5-6 empecé a ver cambios reales. No fue mágico, fue trabajar el sistema paso a paso."
  👍 19

**Miguel A. - Hace 3 días**
"¿Alguien sabe si acepta pagos en cuotas? Porque me interesa pero no tengo los $${investMax} de una"

  **↳ Equipo ${expertName} - Hace 3 días**
  "Eso se discute en la llamada estratégica según tu caso específico. Completa el formulario y lo vemos."
  👍 6

**Patricia L. - Hace 4 días**
"Lo que más me gustó es que no promete resultados en 30 días. Ya me cansé de los 'gurus' que prometen millones en 2 semanas 🙄"
👍 38

**Ricardo N. - Hace 4 días**
"¿Necesito tener equipo ya? Porque ahorita trabajo solo"

  **↳ ${expertName} - Hace 3 días**
  "No necesariamente. Depende de tu modelo de negocio. Hay clientes que escalan solos primero y luego contratan, otros necesitan contratar para escalar. Lo vemos en la llamada."
  👍 7

**Elena V. - Hace 5 días**
"Completé el formulario hace 2 días y me dijeron que no califico todavía porque genero menos de $${minRevenue}/mes 😔 Me dijeron que siga construyendo y vuelva en unos meses. Al menos fueron honestos."
👍 16

  **↳ Carlos M. - Hace 5 días**
  "Exacto, eso habla bien. No te aceptan solo por tu dinero."
  👍 9

**Fernando H. - Hace 5 días**
"Excelente contenido. Se nota la experiencia. Ya me suscribí para ver más videos 👍"
👍 12

[Generar 1-2 comentarios más siguiendo el mismo patrón de conversación natural]

═══════════════════════════════════════════════════════════════
SECCIÓN 4: EMAILS DE SEGUIMIENTO (6 EMAILS)
═══════════════════════════════════════════════════════════════

## 📧 EMAIL 1: "¿Viste el video?" (Envío: 2 horas después de opt-in)

**SUBJECT LINES (3 opciones para testear):**
1. "[Nombre], ¿ya viste el video? 👀"
2. "Tu acceso al video expira pronto"
3. "¿Qué te pareció el sistema?"

**PREVIEW TEXT:**
"Solo quería asegurarme de que pudiste verlo completo..."

**CUERPO DEL EMAIL:**

Hola [Nombre],

Vi que te registraste para ver mi video sobre cómo romper el techo de $${minRevenue}/mes.

Solo quería asegurarme de que:

1️⃣ Lo pudiste ver completo (son ${callDuration === 45 ? '20' : '15'} minutos, sé que no es poco tiempo)

2️⃣ Entendiste el sistema del que hablo

3️⃣ Sabes cuál es el siguiente paso

Si todavía no lo has visto, aquí está el link:
[LINK AL VIDEO]

Y si ya lo viste pero tienes dudas, responde este email. Leo cada respuesta personalmente.

Ah, y si ya estás listo para agendar tu llamada estratégica, el formulario está al final del video.

¿Nos vemos en la llamada?

${expertName}

PD: El video solo estará disponible hasta [fecha]. Después de eso lo bajo porque contiene estrategias que prefiero no compartir públicamente por tiempo indefinido.

---

## 📧 EMAIL 2: Derribar Objeción #1 (Envío: Día 1 - 24 horas después)

**OBJECIÓN A DESTRUIR:** ${ap?.objections?.[0]?.exact_words || '"No tengo tiempo"'}

**SUBJECT LINES:**
1. "¿Crees que ${ap?.objections?.[0]?.exact_words}?"
2. "La verdad sobre ${ap?.objections?.[0]?.exact_words}"
3. "[Nombre], déjame mostrarte algo..."

**PREVIEW TEXT:**
"Esta es la objeción #1 que escucho (y por qué no es verdad)..."

**CUERPO DEL EMAIL:**

[Nombre],

"${ap?.objections?.[0]?.exact_words}"

Esto es lo que el 80% de las personas me dicen cuando les hablo sobre trabajar juntos.

Y lo entiendo.

Yo también lo pensaba.

Pero déjame contarte sobre Carlos...

[HISTORIA COMPLETA]
Carlos también pensaba "${ap?.objections?.[0]?.exact_words}".

Llevaba 3 años generando $${minRevenue}/mes trabajando 60+ horas a la semana.

Cuando le hablé sobre mi sistema, me dijo: "${ap?.objections?.[0]?.exact_words}".

Pero entonces le mostré algo que cambió su perspectiva...

${ap?.objections?.[0]?.destruction || 'La destrucción de la objeción'}

Hoy, 6 meses después, Carlos genera $[3x la cantidad]/mes trabajando MENOS horas.

¿Cómo?

Porque entendió que ${ap?.objections?.[0]?.root_cause || 'la raíz del problema'}.

Y eso es exactamente lo que te mostraré en la llamada estratégica.

Si todavía no has completado el formulario, hazlo ahora:
[LINK AL FORMULARIO]

Y si ya lo completaste, mi equipo te contactará en las próximas 24-48 horas.

Nos vemos pronto,
${expertName}

PD: ¿Quieres saber el momento exacto en que Carlos decidió trabajar conmigo? Cuando calculó cuánto dinero estaba PERDIENDO cada mes por no hacer el cambio. En 90 días, lo que invirtió ya se había pagado solo. Y luego siguió creciendo.

---

## 📧 EMAIL 3: Derribar Objeción #2 (Envío: Día 2)

**OBJECIÓN A DESTRUIR:** ${ap?.objections?.[1]?.exact_words || '"Es muy caro"'}

**SUBJECT LINES:**
1. "Hablemos de números..."
2. "¿$${investMin} es caro? Déjame mostrarte algo"
3. "El costo REAL de no hacer nada"

**PREVIEW TEXT:**
"La inversión parece alta... hasta que haces esta cuenta..."

**CUERPO DEL EMAIL:**

[Nombre],

Déjame ser directo contigo.

Cuando le digo a las personas que la inversión para trabajar conmigo es entre $${investMin} y $${investMax}, la reacción más común es:

"${ap?.objections?.[1]?.exact_words}"

Y lo entiendo.

Es una inversión significativa.

Pero déjame mostrarte una perspectiva diferente...

**El Costo de NO Hacer Nada:**

Si estás generando $${minRevenue}/mes ahora,
pero PODRÍAS estar generando $[3x ese número]/mes,
cada mes que no actúas estás perdiendo $[diferencia].

En un año, eso son $[diferencia × 12] que NUNCA vas a recuperar.

Comparado con eso, ¿$${investMin}-${investMax} es caro?

**La Historia de Ana:**

Ana tenía la misma objeción que tú.

"${ap?.objections?.[1]?.exact_words}"

Pero entonces hizo los números y se dio cuenta:

Si el sistema la ayudaba a pasar de $${minRevenue} a $[2-3x] al mes (que era conservador basado en los resultados de otros clientes), la inversión se pagaría sola en 2-3 meses.

Y después de eso, todo sería ganancia.

Decidió arriesgarse.

Hoy, 8 meses después, genera $[4-5x el número original]/mes consistentemente.

Y me dice: "Fue la mejor inversión que hice en mi negocio. Solo me arrepiento de no haberlo hecho antes."

${ap?.objections?.[1]?.destruction || 'La destrucción de la objeción'}

**Aquí está mi propuesta:**

Agenda la llamada estratégica (es gratis).

En esa llamada, te voy a mostrar EXACTAMENTE:

1️⃣ Cuál es tu cuello de botella actual
2️⃣ Qué resultado realista puedes esperar
3️⃣ En cuánto tiempo recuperarías la inversión

Y después de eso, tú decides si tiene sentido o no.

¿Te parece justo?

[LINK AL FORMULARIO]

Hagámoslo,
${expertName}

PD: No todos califican. Si después de revisar tu formulario no veo que puedo ayudarte, te lo diré honestamente. Prefiero eso a tomar tu dinero sabiendo que no funcionará.

---

## 📧 EMAIL 4: Historia de Transformación (Envío: Día 3)

**SUBJECT LINES:**
1. "De $${minRevenue} a $[3-5x] en ${ht?.programDuration === '90-days' ? '120 días' : '6 meses'}"
2. "La historia de María"
3. "[Nombre], esto te va a inspirar..."

**PREVIEW TEXT:**
"Esta es la historia de transformación más impactante que he visto..."

**CUERPO DEL EMAIL:**

[Nombre],

Quiero contarte sobre María.

No porque sea un caso excepcional.

Sino porque probablemente te vas a ver reflejado en su historia.

**Hace 10 meses, María:**

- Generaba $${minRevenue}/mes (igual que tú)
- Trabajaba 60+ horas a la semana
- Sentía que había llegado a su techo
- Veía a otros avanzar mientras ella se quedaba estancada

Intentó todo lo que se supone que funciona:

❌ Contrató un coach de negocios ($3,000 que no generaron resultados)
❌ Tomó 4 cursos online (otros $2,500 desperdiciados)
❌ Invirtió en publicidad ($5,000 sin ROI claro)

Total desperdiciado: $10,500

Y seguía en $${minRevenue}/mes.

**Hasta que descubrió algo:**

El problema no era su trabajo.
El problema no era su producto.
El problema no era su industria.

El problema era EL SISTEMA que estaba usando.

**Y cuando cambió el sistema, todo cambió.**

Mes 1: $${minRevenue} → $[1.5x]
Mes 2: $[1.5x] → $[2x]
Mes 3: $[2x] → $[2.5x]
Mes 4: $[2.5x] → $[3.2x] (y aquí se estabilizó)

Hoy, 10 meses después:

✅ Genera consistentemente $[3.2x] al mes
✅ Trabaja 35 horas a la semana (casi la mitad)
✅ Tiene un sistema que puede escalar aún más
✅ Y lo más importante: tiene CONTROL de su negocio

**¿Qué hizo diferente?**

Tres cosas:

1️⃣ Dejó de buscar "hacks" mágicos y empezó a construir un SISTEMA real

2️⃣ Invirtió en el acompañamiento correcto (alguien que ya había escalado negocios similares)

3️⃣ Siguió el sistema paso a paso sin desviarse

Eso es todo.

Nada mágico.
Nada complicado.
Solo un sistema probado + acompañamiento correcto + ejecución consistente.

**Y esto es exactamente lo mismo que voy a hacer contigo si calificas.**

¿Listo para tu propia historia de transformación?

[LINK AL FORMULARIO]

Construyámosla juntos,
${expertName}

PD: María me escribió la semana pasada: "${ep?.beliefs?.centralPromise || 'La promesa central'}. Ojalá hubiera empezado antes." No cometas el mismo error. Empieza ahora.

---

## 📧 EMAIL 5: Urgencia + Escasez (Envío: Día 4)

**SUBJECT LINES:**
1. "Solo quedan [X] espacios"
2. "[Nombre], esto cierra pronto..."
3. "Última oportunidad para agendar"

**PREVIEW TEXT:**
"Los espacios se están llenando más rápido de lo esperado..."

**CUERPO DEL EMAIL:**

[Nombre],

Noticias:

Los espacios para trabajar conmigo este ${ht?.programDuration === '90-days' ? 'trimestre' : 'semestre'} se están llenando más rápido de lo que esperaba.

Cuando abrí este ciclo, tenía [número original] espacios disponibles.

Hoy solo quedan [número restante].

**¿Por qué te digo esto?**

No para presionarte.

Sino porque si realmente quieres romper tu techo de $${minRevenue}/mes, necesitas actuar AHORA.

No "la próxima semana".
No "cuando tenga más tiempo".
No "cuando esté más preparado".

AHORA.

**Porque aquí está la verdad incómoda:**

Cada día que pasa sin hacer el cambio es un día más que pierdes.

No solo pierdes dinero (aunque eso también).

Pierdes IMPULSO.
Pierdes CONFIANZA.
Pierdes la VENTANA DE OPORTUNIDAD.

**Tres escenarios posibles:**

**Escenario 1:** Actúas ahora
→ Agendas tu llamada esta semana
→ Empezamos a trabajar en las próximas 2 semanas
→ En ${ht?.programDuration === '90-days' ? '90 días' : '6 meses'} estás en otro nivel

**Escenario 2:** Lo dejas para después
→ "La próxima semana lo hago"
→ Pasa una semana, dos, un mes...
→ En ${ht?.programDuration === '90-days' ? '90 días' : '6 meses'} estás exactamente donde estás hoy

**Escenario 3:** Decides que no es para ti
→ Y está bien, no es para todo el mundo
→ Pero al menos tomaste una DECISIÓN
→ Y puedes seguir buscando otra solución

**¿Cuál de los 3 escenarios quieres vivir?**

Si es el Escenario 1, completa el formulario AHORA:
[LINK AL FORMULARIO]

Si es el Escenario 3, responde este email y dime por qué no es para ti. Tomaré tu feedback para mejorar.

Y si es el Escenario 2... bueno, ya sabes cómo termina esa historia.

La decisión es tuya,
${expertName}

PD: Literalmente solo quedan [número] espacios. Una vez que se llenen, no volveré a abrir hasta [próximo ciclo, ej: "enero"]. Y no sé si para entonces tu situación será la misma o habrás perdido esa ventana de oportunidad. Tú decides.

---

## 📧 EMAIL 6: Last Call (Envío: Día 5)

**SUBJECT LINES:**
1. "Última oportunidad, [Nombre]"
2. "Esto cierra en 24 horas"
3. "No quiero que te arrepientas después..."

**PREVIEW TEXT:**
"Este es mi último email sobre esto. Después, la oportunidad se cierra."

**CUERPO DEL EMAIL:**

[Nombre],

Este es mi último email sobre trabajar juntos.

No voy a seguir insistiendo.

O estás listo, o no lo estás.

Y ambas opciones están bien.

**Si ESTÁS listo:**

Completa el formulario en las próximas 24 horas:
[LINK AL FORMULARIO]

Mi equipo revisará tu información y te contactará para agendar tu llamada estratégica.

En esa llamada, determinamos si tiene sentido trabajar juntos.

Simple.

**Si NO estás listo:**

También está bien.

Tal vez no es el momento.
Tal vez la inversión es muy alta para ti ahora.
Tal vez simplemente no sientes que sea lo correcto.

Cualquiera que sea la razón, lo respeto.

Solo te pido una cosa:

No te quedes en el mismo lugar por miedo o por indecisión.

Si no es esto, que sea ALGO.

Porque el peor escenario posible no es tomar la decisión "equivocada".

El peor escenario es no tomar ninguna decisión y seguir exactamente donde estás ahora dentro de 6 meses.

**Un último recordatorio:**

Hace 5 días te mostré un video con el sistema completo.

Hace 4 días te conté sobre Carlos y cómo rompió su techo.

Hace 3 días te expliqué por qué la inversión no es "cara" cuando la comparas con el costo de NO actuar.

Hace 2 días te mostré la historia de María.

Ayer te dije que los espacios se están acabando.

Hoy te digo: esta es tu última oportunidad en este ciclo.

**La pelota está en tu cancha.**

¿Nos vemos en la llamada?

${expertName}

PD: Si no completaste el formulario en las próximas 24 horas, asumiré que no es el momento para ti y no volverás a recibir emails míos sobre esto. Te deseo el mejor de los éxitos en tu negocio. Y si más adelante sientes que es el momento, siempre puedes contactarme directamente.

═══════════════════════════════════════════════════════════════
SECCIÓN 5: ADS DE TESTEO (15 ADS × 3 DURACIONES = 45 SCRIPTS)
═══════════════════════════════════════════════════════════════

## 🎬 ESTRUCTURA DE GENERACIÓN DE ADS

Para cada ad, genera:
1. Script de video (15 seg, 30 seg, 60 seg)
2. Copy del post
3. Headline
4. CTA
5. Sugerencia de creatividad

---

### 📱 AD #1: HOOK DOLOR + ÁNGULO EMOCIONAL

**TARGET:** Personas estancadas en $${minRevenue}/mes

**VERSIÓN 15 SEGUNDOS:**
\`\`\`
SCRIPT VIDEO:
[00:00-00:03] "¿Te sientes atrapado generando los mismos $${minRevenue} al mes?"
[00:03-00:08] "Yo estuve ahí. Y entendí que el problema no era yo."
[00:08-00:12] "Era el sistema que usaba."
[00:12-00:15] "Cambié el sistema y todo cambió. Video completo en el link."

COPY DEL POST:
Durante 3 años estuve exactamente donde tú estás ahora.

Trabajando duro.
Generando lo mismo.
Sintiéndome cada vez más frustrado.

Hasta que descubrí que el problema no era MI trabajo.

Era el SISTEMA.

👉 Hice un video mostrando exactamente qué cambié y cómo puedes hacer lo mismo.

Míralo completo aquí: [LINK]

HEADLINE:
"Cómo Romper el Techo de $${minRevenue}/Mes (El Sistema Completo)"

CTA:
"Ver video gratis →"

CREATIVIDAD SUGERIDA:
- Tú hablando directo a cámara
- Fondo neutro o de oficina
- Subtítulos grandes y legibles
- Thumbnail: Tu rostro + texto "$${minRevenue}/mes?"
\`\`\`

---

**VERSIÓN 30 SEGUNDOS:**
\`\`\`
SCRIPT VIDEO:
[00:00-00:03] "¿Te sientes atrapado generando los mismos $${minRevenue} al mes?"
[00:03-00:10] "Yo estuve ahí durante 3 años. No importaba cuánto trabajara, el techo no se movía."
[00:10-00:18] "Hasta que entendí que el problema no era yo, ni mi producto, ni mi industria. Era el SISTEMA que estaba usando."
[00:18-00:26] "Cambié ese sistema y en ${ht?.programDuration === '90-days' ? '90 días' : '6 meses'} rompí ese techo. Hoy genero [3x esa cantidad]."
[00:26-00:30] "Hice un video completo mostrando el sistema. Link en comentarios."
\`\`\`

---

**VERSIÓN 60 SEGUNDOS:**
\`\`\`
SCRIPT VIDEO:
[00:00-00:03] "¿Te sientes atrapado generando los mismos $${minRevenue} al mes?"
[00:03-00:12] "Déjame contarte mi historia. Durante 3 años, no importaba cuánto trabajara, el techo no se movía. Siempre $${minRevenue}/mes."
[00:12-00:22] "Intenté todo: cursos, coaches, publicidad. Nada funcionaba. Y cada año que pasaba, me convencía más de que 'así son las cosas'."
[00:22-00:35] "Hasta que un día entendí algo que lo cambió todo: el problema no era MI trabajo. No era mi producto. No era mi industria. Era el SISTEMA completo que estaba usando."
[00:35-00:48] "Cambié ese sistema y en ${ht?.programDuration === '90-days' ? '90 días' : '6 meses'} rompí ese techo. Hoy genero [3x]/mes consistentemente. Y lo más importante: tengo un sistema que puedo escalar aún más."
[00:48-00:57] "Hice un video de ${callDuration === 45 ? '20' : '15'} minutos mostrando exactamente ese sistema. El mismo que uso con mis clientes privados."
[00:57-01:00] "Link en comentarios. Míralo completo antes de que lo quite."
\`\`\`

---

[CONTINUAR GENERANDO ADS #2-#15 con diferentes hooks y ángulos:]
- AD #2: HOOK DESEO + ÁNGULO ASPIRACIONAL
- AD #3: HOOK CURIOSIDAD + ÁNGULO LÓGICO
- AD #4: HOOK SOCIAL PROOF + ÁNGULO EMOCIONAL
- AD #5: HOOK CONTROVERSIA + ÁNGULO RACIONAL
- AD #6: HOOK ESTADÍSTICA + ÁNGULO EMOCIONAL
- AD #7: HOOK PROBLEMA ESPECÍFICO + ÁNGULO ASPIRACIONAL
- AD #8: HOOK PREGUNTA RETÓRICA + ÁNGULO LÓGICO
- AD #9: HOOK CASO DE ÉXITO + ÁNGULO RACIONAL
- AD #10: HOOK ENEMIGO COMÚN + ÁNGULO EMOCIONAL
- AD #11: HOOK PROMESA AUDAZ + ÁNGULO ASPIRACIONAL
- AD #12: HOOK COMPARACIÓN + ÁNGULO LÓGICO
- AD #13: HOOK URGENCIA TEMPORAL + ÁNGULO RACIONAL
- AD #14: HOOK REVELACIÓN + ÁNGULO EMOCIONAL
- AD #15: HOOK DESAFÍO + ÁNGULO ASPIRACIONAL

═══════════════════════════════════════════════════════════════
SECCIÓN 6: ADS DE REMARKETING (21 ADS COMPLETOS)
═══════════════════════════════════════════════════════════════

## 🎯 REMARKETING SET #1: TESTIMONIALES (3 Variaciones)

### 🎬 RMK AD #1: Testimonio María (Video)

**AUDIENCIA:** Personas que vieron el VSL pero no completaron formulario

**SCRIPT VIDEO (30 segundos):**
\`\`\`
[00:00-00:05] [MARÍA HABLANDO] "Hace 8 meses estaba exactamente donde tú estás ahora."
[00:05-00:12] "Generaba $${minRevenue}/mes, trabajaba sin parar, y sentía que no iba a ningún lado."
[00:12-00:22] "Decidí trabajar con ${expertName} y fue la mejor decisión que tomé. Hoy genero [3x] al mes."
[00:22-00:27] "No fue mágico. Fue seguir el sistema paso a paso."
[00:27-00:30] "Si yo pude, tú también puedes. El link está en comentarios."
\`\`\`

---

## 🎯 REMARKETING SET #2: URGENCIA (3 Variaciones)
- RMK AD #4: Espacios Limitados
- RMK AD #5: Precio Sube
- RMK AD #6: Bonos Expiran

## 🎯 REMARKETING SET #3: ESCASEZ (3 Variaciones)
- RMK AD #7: Últimos Cupos
- RMK AD #8: No Volveré a Abrir
- RMK AD #9: Última Oportunidad Este Año

## 🎯 REMARKETING SET #4: SOPORTE WHATSAPP (3 Variaciones)
- RMK AD #10: Dudas Respondidas
- RMK AD #11: Chat Directo
- RMK AD #12: Preguntas Frecuentes

## 🎯 REMARKETING SET #5: GARANTÍA (3 Variaciones)
- RMK AD #13: Garantía de Resultados
- RMK AD #14: Sin Riesgo
- RMK AD #15: Compromiso Mutuo

## 🎯 REMARKETING SET #6: DESTRUCCIÓN DE OBJECIONES (6 Variaciones)
- RMK AD #16: "No Tengo Tiempo"
- RMK AD #17: "Es Muy Caro"
- RMK AD #18: "No Sé Si Funciona Para Mí"
- RMK AD #19: "Ya Intenté Todo"
- RMK AD #20: "Necesito Pensarlo"
- RMK AD #21: "¿Y Si No Funciona?"

═══════════════════════════════════════════════════════════════
REGLAS CRÍTICAS DE GENERACIÓN
═══════════════════════════════════════════════════════════════

✅ HACER:
- Calificar desde el segundo 1
- Mencionar rango de inversión explícitamente
- Usar lenguaje de exclusividad (no es para todos)
- Presentar PROCESO, no producto
- Testimonios con números antes/después
- CTA de 2 pasos (formulario → llamada)
- Énfasis en "sesión estratégica" (no "llamada de ventas")
- Mencionar "para ambos" (mutua calificación)
- Ser honesto sobre tiempo y esfuerzo requerido

❌ NO HACER:
- Prometer resultados rápidos o fáciles
- Usar lenguaje de "disponible para todos"
- Mencionar precio final específico (solo rango)
- Crear urgencia artificial
- Presionar para compra inmediata
- Usar stack de valor detallado
- Ofrecer garantía de reembolso
- Decir "compra ahora"

═══════════════════════════════════════════════════════════════
MÉTRICAS DE ÉXITO ESPERADAS
═══════════════════════════════════════════════════════════════

Con este ecosistema correctamente implementado, deberías ver:

- 5-15% de viewers completan el formulario
- 60-80% de esos son prospectos calificados
- 30-50% de llamadas estratégicas cierran venta

Ejemplo: 1,000 views → 50-150 formularios → 30-120 calificados → 15-60 llamadas → 5-30 ventas

Esto es 0.5-3% de conversión FINAL (views a ventas),
pero con prospectos ULTRA-CALIFICADOS que pagan $${investMin}+

═══════════════════════════════════════════════════════════════
GENERA AHORA EL ECOSISTEMA COMPLETO DE COPYS HIGH TICKET.

Longitud total estimada: ~15,000-20,000 palabras
Formato: Markdown con secciones claramente separadas
Incluir: Todas las secciones descritas arriba

¡GENERA TODO EL ECOSISTEMA AHORA!
`;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getConsciousnessStrategy(level?: number): string {
  const strategies: Record<number, string> = {
    0: `🟦 INCONSCIENTE - No saben que tienen un problema
Estrategia: Educar con historias de terceros, crear conciencia del problema`,
    
    1: `🟨 PROBLEM AWARE - Saben que tienen un problema
Estrategia: AGITAR el dolor profundamente, mostrar consecuencias, presentar tu solución como LA salida`,
    
    2: `🟧 SOLUTION AWARE - Saben que existen soluciones
Estrategia: Presentar TU método como único, diferenciarte de "otros métodos", dar mecanismo único`,
    
    3: `🟥 PRODUCT AWARE - Conocen tu producto pero dudan
Estrategia: DESTRUIR objeciones agresivamente, prueba social masiva, urgencia real`,
    
    4: `🟪 MOST AWARE - Listos para comprar, solo necesitan empujón
Estrategia: Crear urgencia real, facilitar compra, reforzar decisión correcta`
  };
  return strategies[level ?? 1] || strategies[1];
}

function getCountryName(country: string): string {
  const names: Record<string, string> = {
    mexico: 'México 🇲🇽',
    colombia: 'Colombia 🇨🇴',
    argentina: 'Argentina 🇦🇷',
    spain: 'España 🇪🇸',
    chile: 'Chile 🇨🇱',
    peru: 'Perú 🇵🇪',
    multiple: 'múltiples países hispanohablantes 🌎',
  };
  return names[country] || 'Hispanoamérica';
}

function getCountryDetails(country: string): string {
  const details: Record<string, string> = {
    mexico: `
- Moneda en ejemplos: Pesos mexicanos (MXN)
- Referencias culturales: Familia es prioridad #1, emprendimiento digital en auge
- Expresiones locales: "chamba", "varo", "jale"
- Testimonios: Incluir mínimo 3 de México`,
    
    colombia: `
- Moneda en ejemplos: Pesos colombianos (COP)
- Referencias culturales: Cultura emprendedora fuerte, "rebusque"
- Expresiones locales: "parce", "plata", "chimba"
- Testimonios: Incluir variedad de ciudades (Bogotá, Medellín, Cali)`,
    
    argentina: `
- Moneda en ejemplos: Pesos argentinos (ARS) o USD
- Referencias culturales: Crisis económica, inflación, búsqueda de dólares
- Expresiones locales: "laburo", "guita", "morfar"
- Testimonios: Incluir variedad de provincias`,
    
    spain: `
- Moneda en ejemplos: Euros (EUR)
- Referencias culturales: Mercado digital maduro, profesionalización
- Expresiones locales: "curro", "pasta", "tío/tía"
- Testimonios: Incluir ciudades principales (Madrid, Barcelona, Valencia)`,

    chile: `
- Moneda en ejemplos: Pesos chilenos (CLP)
- Referencias culturales: Emprendimiento tech, estabilidad
- Expresiones locales: "pega", "lucas", "bacán"
- Testimonios: Incluir Santiago y regiones`,

    peru: `
- Moneda en ejemplos: Soles (PEN)
- Referencias culturales: Resiliencia, emprendimiento familiar
- Expresiones locales: "chamba", "plata", "chévere"
- Testimonios: Incluir Lima y provincias`,
    
    multiple: `
- Usar español neutro (evitar localismos)
- Moneda en USD para ser universal
- Referencias culturales amplias de Latinoamérica
- Testimonios de mínimo 5 países diferentes`
  };
  return details[country] || details.multiple;
}

function getCountryCulturalNotes(country: string): string {
  const notes: Record<string, string> = {
    mexico: `
🇲🇽 MÉXICO - ADAPTACIÓN CULTURAL PROFUNDA:

TONO EMOCIONAL REQUERIDO:
- Cálido y cercano, como un amigo que genuinamente quiere verte triunfar
- Vulnerabilidad real mezclada con esperanza y motivación
- Usar historias que toquen el corazón antes de vender

VALORES CULTURALES A TOCAR:
- FAMILIA: "Tu familia merece que les des más de lo que tú tuviste"
- SUPERACIÓN: "Demostrar que sí se puede, contra todo pronóstico"
- ORGULLO: "Ser el orgullo de tus papás, de tu comunidad"
- TRABAJO DURO: Validar su esfuerzo antes de ofrecer solución

AMPLIFICADORES DE DOLOR (usar con empatía):
- "Estás cansado de vivir al día sin poder darle gustos a los tuyos"
- "Trabajas más que nadie pero el dinero nunca parece alcanzar"
- "Ves cómo otros avanzan mientras tú sigues en el mismo lugar"
- "Quieres más para tus hijos de lo que tuviste tú"

AMPLIFICADORES DE DESEO (pintar futuro vívido):
- "Imagina decirle a tu familia: 'Vámonos de vacaciones, yo invito'"
- "Despertar sin la angustia de cómo vas a pagar la quincena"
- "Ser dueño de tu tiempo para estar presente con tus hijos"
- "Construir algo que trascienda, un legado para tu familia"

PATRÓN LINGÜÍSTICO:
- Usar "tú" siempre (nunca voseo)
- Expresiones naturales: "la neta", "está chido", "échale ganas", "órale"
- Evitar: "coger" (usar "tomar"), palabras demasiado formales
- Ciudades para testimonios: CDMX, Guadalajara, Monterrey, Puebla, Tijuana

ELEMENTOS DE CONFIANZA:
- Factura fiscal mexicana disponible
- Soporte en horario México (CST)
- Comunidad de emprendedores mexicanos
- Pagos en pesos aceptados`,

    colombia: `
🇨🇴 COLOMBIA - ADAPTACIÓN CULTURAL PROFUNDA:

TONO EMOCIONAL REQUERIDO:
- Motivador y alegre, con la energía colombiana pero sincera
- Optimismo contagioso pero realista
- Celebrar la recursividad y el empuje colombiano

VALORES CULTURALES A TOCAR:
- RECURSIVIDAD: "Ese rebusque tuyo merece dar mejores frutos"
- ALEGRÍA: Mantener energía positiva incluso hablando de dolor
- EMPRENDIMIENTO: Colombia tiene cultura emprendedora fuerte
- COMUNIDAD: Sentirse parte de algo más grande

AMPLIFICADORES DE DOLOR (usar con empatía):
- "Estás cansado de rebuscártela sin ver los frutos de tu esfuerzo"
- "Ves cómo otros están saliendo adelante mientras tú sigues igual"
- "Trabajas como un berraco pero la plata no rinde"
- "Sientes que mereces más pero no sabes cómo lograrlo"

AMPLIFICADORES DE DESEO (pintar futuro vívido):
- "Imagina tener un negocio que te dé para vivir bien y ayudar a tu familia"
- "Ser ese emprendedor exitoso que inspira a otros en tu comunidad"
- "Poder viajar, conocer, darte los gustos que siempre postergaste"
- "Demostrar que con trabajo inteligente sí se puede"

PATRÓN LINGÜÍSTICO:
- Usar "tú" (el voseo existe pero no es universal)
- Expresiones naturales: "bacano", "chimba" (con cuidado), "parce" (moderado)
- Evitar: regionalismos muy paisas si es audiencia nacional
- Ciudades: Bogotá, Medellín, Cali, Barranquilla, Cartagena

ELEMENTOS DE CONFIANZA:
- Pagos en pesos colombianos
- Soporte vía WhatsApp directo
- Casos de éxito colombianos específicos
- Comunidad activa con encuentros`,

    argentina: `
🇦🇷 ARGENTINA - ADAPTACIÓN CULTURAL PROFUNDA:

TONO EMOCIONAL REQUERIDO:
- Directo y sin vueltas, los argentinos valoran la honestidad brutal
- Emocional pero no cursi - más "real" y crudo
- Validar la frustración con el contexto económico

VALORES CULTURALES A TOCAR:
- INDEPENDENCIA: "Ser dueño de tu destino, no de un sistema roto"
- INTELIGENCIA: "Trabajar inteligente, no solo duro"
- REBELDÍA SANA: Contra un sistema que parece en su contra
- FAMILIA: Proteger a los tuyos de la incertidumbre

AMPLIFICADORES DE DOLOR (usar con empatía):
- "Laburando como loco para que la inflación se coma todo"
- "Viendo cómo el dólar sube y tu sueldo queda siempre atrás"
- "Atrapado en un sistema que parece diseñado para que no avances"
- "Sabés que sos capaz de más pero las circunstancias no te dejan"

AMPLIFICADORES DE DESEO (pintar futuro vívido):
- "Imaginate generar en dólares y blindarte de la economía"
- "Tener un negocio que no dependa de lo que pase en el país"
- "Ser dueño de tu tiempo y tu guita, sin que nadie te diga qué hacer"
- "Poder planear a largo plazo sin que la incertidumbre te arruine"

PATRÓN LINGÜÍSTICO - CRÍTICO:
- USAR "VOS" Y VOSEO: "tenés", "podés", "querés", "mirá", "fijate", "pensá"
- Expresiones: "boludo" (entre amigos), "guita", "laburo", "está buenísimo"
- EVITAR: tuteo (suena falso), "coger" (usar "agarrar"), "coche" (decir "auto")
- Ciudades: Buenos Aires, Córdoba, Rosario, Mendoza

ELEMENTOS DE CONFIANZA:
- Precio en dólares (estabilidad)
- Acceso sin restricciones desde Argentina
- Comunidad de emprendedores argentinos
- Sin necesidad de tarjeta internacional`,

    spain: `
🇪🇸 ESPAÑA - ADAPTACIÓN CULTURAL PROFUNDA:

TONO EMOCIONAL REQUERIDO:
- Profesional pero con calidez humana
- Emocional pero sin exageraciones "americanas"
- Más contenido, menos hipérbole, pero igual de conectado

VALORES CULTURALES A TOCAR:
- PROFESIONALISMO: Calidad y seriedad en lo que se hace
- EQUILIBRIO: Vida personal y profesional balanceada
- INDEPENDENCIA: Ser tu propio jefe, no depender de otros
- ESTABILIDAD: Construir algo sólido y duradero

AMPLIFICADORES DE DOLOR (usar con empatía):
- "Estás hasta las narices de trabajar para otros sin ver recompensa"
- "Llevas años en el mismo punto mientras ves a otros avanzar"
- "El mercado cada vez más competido y tú sin diferenciarte"
- "Sabes que puedes más pero no encuentras el camino"

AMPLIFICADORES DE DESEO (pintar futuro vívido):
- "Tener un negocio digital profesional que te dé libertad"
- "Trabajar desde donde quieras sin depender de una oficina"
- "Alcanzar la estabilidad que mereces por tu esfuerzo"
- "Ser reconocido como experto en tu campo"

PATRÓN LINGÜÍSTICO:
- Usar "tú" siempre (nunca voseo)
- Expresiones naturales: "mola", "curro", "flipar", "tío/tía"
- EVITAR: americanismos, regionalismos latinoamericanos, voseo
- Ciudades: Madrid, Barcelona, Valencia, Sevilla, Bilbao

ELEMENTOS DE CONFIANZA:
- Factura española/europea
- Cumplimiento RGPD total
- Soporte en horario español
- Casos de éxito del mercado español`,

    chile: `
🇨🇱 CHILE - ADAPTACIÓN CULTURAL PROFUNDA:

TONO EMOCIONAL REQUERIDO:
- Cercano y práctico, con humor sutil
- Emocional pero enfocado en resultados
- Validar el pragmatismo chileno

VALORES CULTURALES A TOCAR:
- EMPRENDIMIENTO: Chile tiene fuerte cultura de startups
- ESTABILIDAD: Construir algo sólido y predecible
- PRAGMATISMO: Soluciones que funcionan, no teoría
- FAMILIA: Darles lo mejor a los tuyos

AMPLIFICADORES DE DOLOR (usar con empatía):
- "Trabajando duro pero el sueldo no alcanza para lo que quieres"
- "Viendo cómo el costo de vida sube y tus ingresos no"
- "Sintiéndote estancado en un trabajo que no te llena"
- "Queriendo emprender pero sin saber por dónde partir"

AMPLIFICADORES DE DESEO (pintar futuro vívido):
- "Tener la tranquilidad financiera para planear tu futuro"
- "Un negocio propio que te dé independencia"
- "Poder darle a tu familia la vida que merecen"
- "Ser tu propio jefe y manejar tu tiempo"

PATRÓN LINGÜÍSTICO:
- Usar "tú" (el voseo existe pero evitarlo para claridad)
- Expresiones: "bacán", "cachai" (moderado), "po", "al tiro"
- Evitar: chilenismos muy cerrados
- Ciudades: Santiago, Valparaíso, Concepción, La Serena

ELEMENTOS DE CONFIANZA:
- Pagos en pesos chilenos
- Soporte en horario Chile
- Casos de éxito chilenos
- Factura chilena disponible`,

    peru: `
🇵🇪 PERÚ - ADAPTACIÓN CULTURAL PROFUNDA:

TONO EMOCIONAL REQUERIDO:
- Cálido y esperanzador, con respeto pero cercanía
- Emocional y motivador, celebrando la resiliencia peruana
- Conectar con el espíritu emprendedor

VALORES CULTURALES A TOCAR:
- RESILIENCIA: El peruano sale adelante contra todo
- FAMILIA: Todo esfuerzo es por los tuyos
- EMPRENDIMIENTO: Espíritu de superación
- COMUNIDAD: Ayudarse entre todos

AMPLIFICADORES DE DOLOR (usar con empatía):
- "Trabajas sin parar pero sientes que no avanzas"
- "Ves oportunidades pero no sabes cómo aprovecharlas"
- "Quieres más para tu familia pero el dinero no alcanza"
- "Te esfuerzas más que muchos pero los resultados no llegan"

AMPLIFICADORES DE DESEO (pintar futuro vívido):
- "Construir un negocio que te dé estabilidad y crecimiento"
- "Poder darle a tu familia la vida que sueñas para ellos"
- "Ser un ejemplo de superación en tu comunidad"
- "Tener la libertad de decidir tu propio camino"

PATRÓN LINGÜÍSTICO:
- Usar "tú" siempre (no voseo)
- Expresiones: "chévere", "pata", "causa", "qué tal"
- Evitar: jerga muy limeña si es audiencia nacional
- Ciudades: Lima, Arequipa, Trujillo, Cusco, Piura

ELEMENTOS DE CONFIANZA:
- Pagos en soles
- Soporte vía WhatsApp
- Comunidad de emprendedores peruanos
- Casos de éxito locales`,

    usa: `
🇺🇸 USA (LATINOS) - ADAPTACIÓN CULTURAL PROFUNDA:

TONO EMOCIONAL REQUERIDO:
- Motivador y empático con la experiencia del inmigrante/latino
- Emocional pero empoderador
- Conectar con el sueño de "hacerla" en USA

VALORES CULTURALES A TOCAR:
- OPORTUNIDAD: Viniste aquí buscando más
- FAMILIA: Los que dejaste atrás y los que tienes aquí
- SUPERACIÓN: Demostrar que valió la pena el sacrificio
- COMUNIDAD LATINA: Unidos por experiencia compartida

AMPLIFICADORES DE DOLOR (usar con empatía):
- "Viniste a este país buscando más pero sientes que no has llegado"
- "Trabajas más duro que nadie pero parece que no es suficiente"
- "Extrañas a tu familia y quieres demostrarles que valió la pena"
- "El costo de vida te come todo lo que ganas"

AMPLIFICADORES DE DESEO (pintar futuro vívido):
- "Crear un negocio que te dé la vida americana que soñaste"
- "Poder ayudar a tu familia allá y vivir bien aquí"
- "Ser un ejemplo de éxito para tu comunidad latina"
- "Tener estabilidad sin depender de un solo empleo"

PATRÓN LINGÜÍSTICO:
- Usar "tú" (español neutro)
- Mezclar términos en inglés cuando sea natural
- Evitar regionalismos de un solo país, spanglish excesivo
- Ciudades: Miami, Los Angeles, Houston, New York, Chicago

ELEMENTOS DE CONFIANZA:
- Precios en USD
- Soporte en español en tu zona horaria
- Comunidad de latinos en USA
- Funciona en cualquier estado`,

    multiple: `
🌎 MULTINACIONAL - ADAPTACIÓN CULTURAL PROFUNDA:

TONO EMOCIONAL REQUERIDO:
- Cálido y universal, conectando con valores compartidos latinos
- Emocional pero accesible para todos los países
- Evitar regionalismos pero mantener calidez

VALORES CULTURALES UNIVERSALES:
- FAMILIA: Valor #1 en toda Latinoamérica
- EMPRENDIMIENTO: El deseo de salir adelante
- LIBERTAD: Ser dueño de tu tiempo y destino
- COMUNIDAD: Sentirse parte de algo más grande

AMPLIFICADORES DE DOLOR (universales):
- "Sientes que trabajas mucho pero no ves los resultados que mereces"
- "Ves cómo otros avanzan y te preguntas qué estás haciendo mal"
- "Quieres más para ti y tu familia pero no sabes cómo lograrlo"
- "Estás cansado de intentar cosas que no funcionan"

AMPLIFICADORES DE DESEO (universales):
- "Tener un negocio que funcione sin importar dónde estés"
- "La libertad de manejar tu tiempo y tus ingresos"
- "Poder darle a tu familia la vida que merecen"
- "Ser parte de una comunidad de emprendedores que se apoyan"

PATRÓN LINGÜÍSTICO:
- Usar "tú" siempre como estándar
- Español neutro latinoamericano
- EVITAR: voseo, regionalismos fuertes, expresiones de un solo país
- Testimonios de: México, Colombia, Argentina, Chile, Perú, España

ELEMENTOS DE CONFIANZA:
- Precios en USD (moneda universal)
- Soporte en múltiples zonas horarias
- Comunidad internacional hispanohablante
- Casos de éxito de diferentes países`
  };
  return notes[country] || notes.multiple;
}

// ═══════════════════════════════════════════════════════════════
// SALEADS.AI VSL PROMPT
// ═══════════════════════════════════════════════════════════════

function buildSaleADSVSLPrompt(saleadsConfig: any, country: string): string {
  const expert = saleadsConfig.expert || {};
  const angle = saleadsConfig.angle || {};
  const avatar = saleadsConfig.avatar || {};
  const targetDuration = saleadsConfig.targetDuration || 20;

  return `
═══════════════════════════════════════════════════════════════
🤖 VSL SALEADS.AI - GENERACIÓN OPTIMIZADA
═══════════════════════════════════════════════════════════════

PRODUCTO: SaleADS.ai
Plataforma SaaS de publicidad digital automatizada con IA

PRECIO Y OFERTA:
- Precio regular: $59 USD/mes
- OFERTA ESPECIAL: 1er MES GRATIS al vincular tarjeta
- Sin cargo hasta el día 30
- Cancela cuando quieras antes del día 30 y no pagas nada

PLAN PRO (el del VSL):
✅ 8 campañas publicitarias por mes
✅ 1 negocio vinculado
✅ 10 estrategias profesionales de alta conversión
✅ AI Copywriter 24/7
✅ AI Strategist 24/7
✅ Automatic AI Optimizer
✅ Dashboard básico
✅ Soporte estándar
✅ Procesamiento prioritario

PROPUESTA DE VALOR CENTRAL:
"Tu agente de IA que trabaja 24/7 para optimizar tus ventas"

DIFERENCIADORES CLAVE:
1. 70% más barato que contratar agencia
2. Sin experiencia en marketing necesaria
3. De la idea a campaña activa en <5 minutos
4. Optimización automática 24/7
5. Transparencia total (sin cajas negras)
6. Multi-plataforma: Meta, Google, TikTok en un solo lugar

IDENTIDAD DE MARCA:
- Tono: Conversacional, motivador, empoderador, anti-agencia
- Personalidad: Cercano pero profesional, optimista, moderno pero accesible
- VOZ: La IA habla en primera persona como "tu agente"

MENSAJES CLAVE:
- "Publicidad profesional, simplicidad extrema"
- "No necesitas ser experto, solo necesitas SaleADS"
- "De la complejidad a la claridad en 3 clics"
- "Democratizando la publicidad, un clic a la vez"

═══════════════════════════════════════════════════════════════
CONFIGURACIÓN DE ESTE VSL
═══════════════════════════════════════════════════════════════

EXPERTO/NARRADOR:
Tipo: ${expert.expertType || 'founder'}
Nombre: ${expert.name || 'Juan Osorio'}
Credenciales: ${expert.credentials || '+$20M USD invertidos en publicidad, 319K seguidores, Founder de SaleADS.ai'}
Historia: ${expert.transformationStory || 'Fundó 3 agencias de marketing y descubrió que la IA puede democratizar lo que antes era exclusivo'}
Por qué SaleADS: ${expert.whyUseSaleADS || 'Para democratizar la publicidad profesional y que todos puedan competir'}
Tono: ${expert.toneOfVoice || 'Directo, anti-agencia, motivador, empoderador'}

ÁNGULO DE COMUNICACIÓN:
Nombre: ${angle.angleName || 'Anti-Agencia + Democratización'}
Enemigo: ${angle.mainEnemy || 'Agencias que cobran $2,000/mes sin transparencia ni resultados garantizados'}
Big Idea: ${angle.bigIdea || 'La publicidad profesional no debe costar $2,000/mes cuando la IA puede hacerlo por $59/mes'}
Promesa: ${angle.mainPromise || 'Campañas profesionales optimizadas 24/7 por menos de $2/día'}
Hook 30seg: ${angle.hook30sec || '¿Sigues pagando $2,000/mes a una agencia cuando la IA puede hacer lo mismo (o mejor) por $59/mes?'}

AVATAR OBJETIVO:
Tipo: ${avatar.isSpecific ? 'Específico' : 'General (todos los emprendedores/negocios)'}
${avatar.isSpecific ? `
Industria: ${avatar.industry || 'No especificada'}
Nivel: ${avatar.experienceLevel || 'Todos los niveles'}
Frustración: ${avatar.mainFrustration || 'Complejidad y alto costo de la publicidad digital'}
Deseo: ${avatar.primaryDesire || 'Generar ventas sin gastar fortunas en agencias'}
` : ''}

CONFIGURACIÓN TÉCNICA:
Duración objetivo: ${targetDuration} minutos
País: ${getCountryName(country)}
CTA: 1 MES GRATIS vinculando tarjeta (luego $59/mes)

═══════════════════════════════════════════════════════════════
ESTRUCTURA DEL VSL (${targetDuration} MINUTOS)
═══════════════════════════════════════════════════════════════

IMPORTANTE: Genera el VSL completo siguiendo esta estructura exacta.

## [00:00-01:00] HOOK ULTRA-PODEROSO

REGLAS DEL HOOK:
- NO empezar con "Hola, soy [nombre]"
- Empezar con la pregunta/afirmación del ángulo
- Calificar: Para negocios que gastan en ads o quieren empezar
- Crear curiosidad inmediata
- Mencionar el enemigo sutilmente

PLANTILLA AJUSTADA AL ÁNGULO:

"${angle.hook30sec || '[Hook basado en el ángulo seleccionado]'}"

[PAUSA 3 SEG]

"Si estás gastando en publicidad digital y sientes que:
- Pagas demasiado sin resultados claros
- No entiendes qué funciona y qué no
- Dependes de terceros que no te explican nada
- O simplemente quieres empezar pero todo parece muy complejo...

Los próximos ${targetDuration} minutos podrían cambiar completamente cómo haces publicidad.

Pero necesito ser honesto desde ya..."

[PAUSA 2 SEG]

"Esto NO es para todo el mundo.

Si buscas resultados mágicos sin hacer nada, este video no es para ti.
Si no estás dispuesto a invertir aunque sea $59/mes en tu negocio, tampoco.

Pero si estás listo para tomar control de tu publicidad digital
con una herramienta que REALMENTE trabaja para ti...

Entonces sigamos."

[TONO:] ${expert.toneOfVoice || 'Directo, sin rodeos, honesto'}
[B-ROLL:] Persona hablando a cámara, fondo limpio

## [01:00-04:00] PRESENTACIÓN + HISTORIA DE TRANSFORMACIÓN

"Mi nombre es ${expert.name || 'Juan Osorio'}.

${expert.credentials || 'He invertido más de $20M USD en publicidad digital, tengo 319K seguidores y fundé 3 agencias de marketing.'}

Pero no siempre fue así...

[HISTORIA PERSONAL ADAPTADA AL ÁNGULO]

${expert.transformationStory || `
Hace años, trabajaba con clientes que pagaban $2,000, $5,000, hasta $10,000 al mes por publicidad.

Y sabes qué descubrí?

Que el 80% de lo que hacíamos podía ser automatizado.
Que la complejidad era artificial.
Que las agencias cobraban más por OPACIDAD que por RESULTADOS.

Y eso me molestó profundamente.

Porque vi a cientos de emprendedores y pequeños negocios que NECESITABAN publicidad digital,
pero no podían pagar esos precios.

Así que me hice una pregunta:

¿Qué pasaría si democratizamos la publicidad profesional?
¿Qué pasaría si una IA pudiera hacer el trabajo de una agencia completa
por una fracción del costo?
`}

Y esa pregunta se convirtió en SaleADS.ai.

Tu agente de IA que trabaja 24/7 para optimizar tus ventas."

[TONO:] Vulnerable, honesto, con propósito
[B-ROLL:] Fotos del recorrido, pantallas de resultados, dashboard de SaleADS

## [04:00-08:00] AGITACIÓN DEL PROBLEMA

"Déjame mostrarte lo que REALMENTE está pasando en la industria...

${angle.mainEnemy || 'Las agencias tradicionales tienen un modelo de negocio roto'}:

[ENEMIGO ESPECÍFICO SEGÚN ÁNGULO - GENERAR SEGÚN ${angle.angleName}]

1. Te cobran comisión sobre tu inversión publicitaria
   (mientras más gastas, más ganan ellos, ¿ves el conflicto de interés?)

2. Todo es opaco
   (no sabes realmente qué están haciendo ni por qué)

3. Tienen horarios de oficina
   (tu competencia no duerme, pero tu agencia sí)

4. Cobran por el TIEMPO, no por los RESULTADOS
   (te facturan aunque no vendas nada)

Y mientras tanto...

TU COMPETENCIA está usando IA.
Las grandes marcas están automatizando.
El mercado está evolucionando.

Pero tú sigues:
- Pagando de más
- Sin transparencia
- Dependiendo de terceros
- Sin control real

[PAUSA 3 SEG]

Pero no tiene que ser así.

Y te voy a demostrar por qué."

[TONO:] Confrontador pero empático
[B-ROLL:] Comparativas, números, dashboards complejos vs SaleADS simple

## [08:00-12:00] PRESENTACIÓN DE SALEADS.AI

"SaleADS.ai no es una agencia.
No es un curso.
No es otro dashboard complicado.

Es tu AGENTE DE IA personal que trabaja 24/7 optimizando tus campañas.

Déjame mostrarte exactamente cómo funciona:

[5 DIFERENCIADORES CLAVE]

**1. AGENTE DE IA CONVERSACIONAL**

En lugar de formularios y menús complicados,
hablas con la IA como hablarías con un experto.

Le dices qué vendes, a quién, y cuál es tu objetivo.
Ella hace las preguntas correctas y crea tu campaña.

Todo en menos de 5 minutos.

**2. OPTIMIZACIÓN AUTÓNOMA 24/7**

Mientras tú duermes, la IA:
- Analiza qué anuncios funcionan mejor
- Ajusta presupuestos automáticamente
- Prueba diferentes audiencias
- Modifica pujas en tiempo real
- Optimiza para TU objetivo (ventas, leads, etc.)

No tienes que hacer NADA.

**3. TRANSPARENCIA TOTAL**

Nada de cajas negras.
Ves exactamente:
- Dónde va cada centavo
- Qué está funcionando y por qué
- Qué cambios hace la IA y por qué
- Métricas claras, sin jerga técnica

Control total, cero sorpresas.

**4. TODO EN UN SOLO LUGAR**

¿Meta Ads? ✓
¿Google Ads? ✓
¿TikTok Ads? ✓

Todo desde un solo dashboard.
La IA distribuye tu presupuesto automáticamente
donde está generando mejores resultados.

**5. TU ÉXITO = NUESTRO ÉXITO**

No cobramos comisión sobre tu inversión publicitaria.
El precio es fijo: $59/mes.

Gastes $100 o $10,000 en ads, pagas lo mismo.

¿Por qué?

Porque nuestro modelo de negocio está alineado con TUS resultados,
no con cuánto gastas."

[TONO:] Educativo, claro, empoderador
[B-ROLL:] Demo real de la plataforma, capturas de pantalla, proceso paso a paso

## [12:00-15:00] PRUEBA SOCIAL

"No quiero que me creas solo porque yo lo digo.

Quiero que veas resultados reales:

[INCLUIR 2-3 TESTIMONIOS TIPO CASO DE ESTUDIO]

Estos son usuarios reales que transformaron sus resultados
usando el mismo sistema que vas a poder probar gratis.

[FIN DE SECCIÓN DE PRUEBA SOCIAL]"

## [15:00-18:00] LA OFERTA + GARANTÍA

"Ahora, déjame mostrarte exactamente cómo puedes acceder a SaleADS.ai:

**EL PLAN PRO** (el que recomiendo para empezar):

Incluye:
✅ 8 campañas publicitarias por mes
✅ 1 negocio conectado
✅ 10 estrategias profesionales pregrabadas
✅ Tu Agente de IA (Copywriter + Strategist) 24/7
✅ Optimizador automático
✅ Dashboard simple y claro
✅ Soporte estándar
✅ Procesamiento prioritario

Precio regular: $59 USD/mes

Pero aquí está la parte importante...

[PAUSA 2 SEG]

**PUEDES PROBARLO COMPLETAMENTE GRATIS EL PRIMER MES**

Solo vincula tu tarjeta (para verificar tu cuenta)
y tienes 30 días COMPLETOS para probarlo.

Si antes del día 30 decides que no es para ti,
cancelas y NO SE TE COBRA NADA.

Cero riesgo.

¿Por qué hacemos esto?

Porque confiamos en la tecnología.
Sabemos que cuando la pruebes, no vas a querer volver a la forma antigua.

[PAUSA 2 SEG]

Compáralo:

Agencia tradicional: $2,000 - $10,000/mes
SaleADS.ai: $59/mes (primer mes gratis)

Eso es 70-98% más barato.

Y no es 70% del servicio.
Es la MISMA tecnología (o mejor) porque es IA,
no humanos cansados cometiendo errores a las 3am.

[PAUSA 2 SEG]

Pero déjame ser claro:

Esto NO es para todos.

Si esperas resultados sin poner tu parte (definir tu oferta, tener algo que vender),
esto no te va a servir.

Si no estás dispuesto a darle aunque sea 30 días al sistema,
no te registres.

Pero si estás listo para tomar control de tu publicidad digital,
para competir de igual a igual con las grandes marcas,
para dejar de depender de agencias caras...

Entonces esto es exactamente lo que necesitas."

[TONO:] Directo, honesto, sin presión falsa
[B-ROLL:] Comparativa de precios, pantalla de planes, calculadora de ahorro

## [18:00-${targetDuration}:00] CTA FINAL

"Aquí está exactamente qué hacer ahora:

**PASO 1:** Haz clic en el botón debajo de este video

**PASO 2:** Crea tu cuenta (toma 2 minutos)

**PASO 3:** Vincula tu tarjeta (solo para verificar, no se cobra hasta el día 31)

**PASO 4:** La IA te va a hacer unas preguntas simples sobre tu negocio

**PASO 5:** En menos de 5 minutos, tu primera campaña estará activa

Y durante los próximos 30 días,
la IA va a estar trabajando 24/7 optimizando para TUS objetivos.

[PAUSA 2 SEG]

Si en cualquier momento antes del día 30 decides cancelar,
lo haces con 2 clics y listo. Sin cargos.

Pero mi apuesta es que no vas a querer cancelar.

Porque vas a ver:
- Tus primeros resultados
- La simplicidad del sistema
- El ahorro vs una agencia
- La transparencia total

Y vas a entender por qué esto es el futuro de la publicidad digital.

[PAUSA 2 SEG]

El 2026 ya empezó.

¿Vas a seguir pagando de más por complejidad innecesaria?
¿O vas a tomar control con la tecnología correcta?

La decisión es tuya.

Haz clic en el botón ahora.
Prueba 30 días gratis.
Y decide después.

Nos vemos del otro lado.

${expert.name || 'Juan Osorio'}
Founder, SaleADS.ai

P.D: Recuerda, esto es 1 MES COMPLETAMENTE GRATIS.
No tienes nada que perder y una ventaja competitiva enorme que ganar.

[BOTÓN GRANDE: EMPEZAR MI MES GRATIS]"

[TONO:] Motivador, directo, sin presión
[B-ROLL:] Botón de CTA animado, cuenta regresiva (opcional), última pantalla con beneficios

═══════════════════════════════════════════════════════════════
ADAPTACIÓN CULTURAL PARA ${country.toUpperCase()}
═══════════════════════════════════════════════════════════════

${getCountryCulturalNotesSaleADS(country)}

═══════════════════════════════════════════════════════════════
NOTAS FINALES DE GENERACIÓN
═══════════════════════════════════════════════════════════════

- Usar lenguaje en primera persona cuando sea la IA quien habla
- Mantener tono conversacional, nunca técnico o frío
- Enfatizar democratización y accesibilidad
- Números específicos, nunca vagos
- Transparencia total sobre precio y proceso
- Sin hype falso, promesas realistas
- CTA claro: 1 mes gratis, sin riesgo

¡GENERA AHORA EL VSL COMPLETO SIGUIENDO ESTA ESTRUCTURA!
`;
}

function getCountryCulturalNotesSaleADS(country: string): string {
  const notes: Record<string, string> = {
    mexico: `
🇲🇽 ADAPTACIÓN PARA MÉXICO:
- Usar "tú" (nunca "usted" formal)
- Mencionar "peso mexicano" pero dar precios en USD
- Referencias a emprendimiento como "salir adelante"
- Tono: Cercano, motivador, anti-establishment
- Ejemplos de negocios locales mexicanos
`,
    colombia: `
🇨🇴 ADAPTACIÓN PARA COLOMBIA:
- Usar "tú" con ocasional "parce" muy sutil
- Mencionar "peso colombiano" pero dar precios en USD
- Énfasis en "emprendimiento inteligente"
- Tono: Motivacional, aspiracional
- Casos de Bogotá, Medellín, otras ciudades
`,
    argentina: `
🇦🇷 ADAPTACIÓN PARA ARGENTINA:
- Usar "vos" y conjugaciones correspondientes
- Precios en USD (dólar blue como referencia mental)
- Énfasis en "hacerla con las propias" 
- Tono: Directo, sin vueltas, práctico
- Contexto de economía complicada = más relevante
`,
    spain: `
🇪🇸 ADAPTACIÓN PARA ESPAÑA:
- Usar "tú" formal pero cercano
- Precios en EUR cuando sea posible
- Énfasis en eficiencia y profesionalismo
- Tono: Más formal pero accesible
- Ejemplos de PyMEs españolas
`,
    usa: `
🇺🇸 ADAPTACIÓN PARA USA (Español):
- Español neutro pero con términos en inglés cuando sea apropiado
- Precios solo en USD
- Enfoque en "competir en el mercado americano"
- Tono: Profesional pero accesible
- Casos de diferentes estados/ciudades latinas
`,
    multiple: `
🌎 ADAPTACIÓN MULTINACIONAL:
- Español completamente neutro
- Precios en USD (moneda universal)
- Casos de mínimo 3 países diferentes
- Tono: Universal pero cálido
- Evitar regionalismos
`
  };
  return notes[country] || notes.multiple;
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION & ESTIMATION
// ═══════════════════════════════════════════════════════════════

function validateCopy(content: string, project: any): any {
  const contentLower = content.toLowerCase();
  const expertName = project.expert_profile?.voice?.name?.toLowerCase() || '';
  const painPrimary = project.avatar_profile?.pains?.primary?.toLowerCase()?.slice(0, 30) || '';
  const productName = project.product_info?.name?.toLowerCase() || '';
  const funnelType = project.funnel_type || 'vsl';

  // Menciones básicas
  const expertMentioned = expertName && contentLower.includes(expertName);
  const painMentioned = painPrimary && contentLower.includes(painPrimary);
  const productMentioned = productName && contentLower.includes(productName);

  // Conteos
  const painCount = painPrimary ? (contentLower.match(new RegExp(escapeRegex(painPrimary), 'g')) || []).length : 0;
  const productCount = productName ? (contentLower.match(new RegExp(escapeRegex(productName), 'g')) || []).length : 0;
  const wordCount = content.split(/\s+/).length;

  // Validaciones de estructura (Perfect Webinar / frameworks)
  const hasSecrets = /secreto\s*(#?\s*)?(1|2|3|uno|dos|tres)/gi.test(content);
  const hasStack = /stack|valor\s+total|normalmente|regularmente/gi.test(content);
  const hasGuarantee = /garant[íi]a|reembolso|devoluci[oó]n|sin\s+riesgo/gi.test(content);
  const hasCTA = /clic|click|bot[oó]n|registr|inscrib|compr[ae]/gi.test(content);
  const hasTestimonials = /testimonio|caso\s+de\s+[ée]xito|cliente|result/gi.test(content);

  // Validaciones de tono emocional
  const hasEmotionalHook = /imagina|sientes|cansado|frustrad|mereces|sue[ñn]o/gi.test(content);
  const hasVulnerability = /moment[oa]\s+m[aá]s\s+bajo|difícil|luch[eé]|fall[eé]/gi.test(content);
  const hasFutureProjection = /imagina|dentro\s+de\s+\d+|visualiza|cierra\s+los\s+ojos/gi.test(content);
  const hasFamilyReference = /familia|hijos?|padres?|esposa?|pareja/gi.test(content);

  // Validaciones de urgencia y escasez
  const hasUrgency = /[úu]ltim[oa]s?|ahora|hoy|termina|cierra|expira/gi.test(content);
  const hasScarcity = /limitad[oa]s?|cupos?|plazas?|solo\s+\d+|pocos/gi.test(content);

  // Validaciones culturales
  const hasTimestamps = /\[\d{2}:\d{2}/g.test(content);
  const hasToneNotes = /\[TONO:\]/gi.test(content);
  const hasBrollNotes = /\[B-ROLL:\]|\[SLIDE:\]/gi.test(content);
  const hasPauses = /\[PAUSA/gi.test(content);

  // Calcular scores por pilar
  let pilar1Score = 70; // Base
  if (expertMentioned) pilar1Score += 10;
  if (hasVulnerability) pilar1Score += 10;
  if (hasToneNotes) pilar1Score += 5;
  if (hasPauses) pilar1Score += 5;

  let pilar2Score = 70; // Base
  if (painMentioned) pilar2Score += 5;
  if (painCount >= 3) pilar2Score += 5;
  if (painCount >= 5) pilar2Score += 5;
  if (hasEmotionalHook) pilar2Score += 5;
  if (hasFamilyReference) pilar2Score += 5;
  if (hasFutureProjection) pilar2Score += 5;

  let pilar3Score = 70; // Base
  if (productMentioned) pilar3Score += 5;
  if (productCount >= 5) pilar3Score += 5;
  if (hasStack) pilar3Score += 5;
  if (hasGuarantee) pilar3Score += 5;
  if (hasUrgency) pilar3Score += 5;
  if (hasScarcity) pilar3Score += 5;

  // Validaciones específicas para AutoWebinar completo
  let hasEmailSequence = false;
  let hasWhatsAppSequence = false;
  let hasGroupDescription = false;
  let hasVideoScripts = false;
  let hasAudioScripts = false;
  let hasImageBriefs = false;
  let hasLandingPage = false;
  let hasDesignRecommendations = false;
  let emailCount = 0;
  let comCount = 0;

  if (funnelType === 'autowebinar') {
    // Detectar landing page
    hasLandingPage = /landing\s*page|hero\s*section|headline\s*principal/gi.test(content);
    hasDesignRecommendations = /recomendaciones\s*de\s*dise[ñn]o|tipograf[íi]a|layout|mobile/gi.test(content);

    // Detectar correos
    const emailMatches = content.match(/##\s*Correo\s*\d+/gi);
    emailCount = emailMatches ? emailMatches.length : 0;
    hasEmailSequence = emailCount >= 10;

    // Detectar comunicados WhatsApp
    const comMatches = content.match(/##\s*Com\s*\d+/gi);
    comCount = comMatches ? comMatches.length : 0;
    hasWhatsAppSequence = comCount >= 20;

    // Detectar descripción del grupo
    hasGroupDescription = /descripci[oó]n\s*(del\s*)?grupo/gi.test(content);

    // Detectar guiones multimedia
    hasVideoScripts = /##\s*Video\s*\d+/gi.test(content) || /gui[oó]n\s*(de\s*)?video/gi.test(content) || /\[VIDEO\]/gi.test(content);
    hasAudioScripts = /##\s*Audio\s*\d+/gi.test(content) || /gui[oó]n\s*(de\s*)?(audio|nota\s*de\s*voz)/gi.test(content) || /\[AUDIO\]/gi.test(content) || /\[NOTA DE VOZ\]/gi.test(content);
    hasImageBriefs = /##\s*Brief\s*Imagen/gi.test(content) || /brief\s*(para\s*)?dise[ñn]ador/gi.test(content) || /\[IMAGEN\]/gi.test(content);
  }

  // Bonus por estructura de webinar
  if (funnelType === 'autowebinar' && hasSecrets) {
    pilar1Score += 5;
    pilar2Score += 5;
  }

  // Bonus por testimonios
  if (hasTestimonials) {
    pilar2Score += 5;
    pilar3Score += 5;
  }

  // Bonus por ecosistema completo de autowebinar
  if (funnelType === 'autowebinar') {
    if (hasLandingPage) pilar1Score += 5;
    if (hasDesignRecommendations) pilar1Score += 3;
    if (hasEmailSequence) pilar3Score += 5;
    if (hasWhatsAppSequence) pilar3Score += 5;
    if (hasVideoScripts) pilar1Score += 3;
    if (hasAudioScripts) pilar1Score += 2;
  }

  // Cap scores at 100
  pilar1Score = Math.min(100, pilar1Score);
  pilar2Score = Math.min(100, pilar2Score);
  pilar3Score = Math.min(100, pilar3Score);

  // Generar sugerencias contextuales
  const suggestions: string[] = [];

  if (!expertMentioned) suggestions.push('Menciona más el nombre del experto para crear conexión personal');
  if (painCount < 5) suggestions.push(`Refuerza el dolor primario (actual: ${painCount}, recomendado: 5+)`);
  if (productCount < 10) suggestions.push(`Menciona más el nombre del producto (actual: ${productCount}, recomendado: 10+)`);
  if (!hasEmotionalHook) suggestions.push('Agrega un hook más emocional al inicio');
  if (!hasVulnerability) suggestions.push('Incluye más vulnerabilidad en la historia de transformación');
  if (!hasFutureProjection) suggestions.push('Pinta el futuro de forma más vívida ("Imagina dentro de 90 días...")');
  if (!hasFamilyReference) suggestions.push('Conecta con valores familiares (código reptiliano LATAM)');
  if (!hasStack) suggestions.push('Implementa el Value Stack de Hormozi (apilar valor)');
  if (!hasGuarantee) suggestions.push('Enfatiza más la garantía para invertir el riesgo');
  if (!hasUrgency && !hasScarcity) suggestions.push('Agrega urgencia o escasez real');
  if (!hasTestimonials) suggestions.push('Incluye más testimonios específicos de países hispanohablantes');
  if (funnelType === 'autowebinar' && !hasSecrets) suggestions.push('Estructura el contenido en "3 Secretos" (Perfect Webinar)');
  if (!hasTimestamps) suggestions.push('Agrega timestamps [MM:SS] para facilitar producción');
  if (!hasToneNotes) suggestions.push('Incluye notas de [TONO:] para guiar al locutor');

  // Sugerencias específicas para autowebinar completo
  if (funnelType === 'autowebinar') {
    if (!hasLandingPage) suggestions.push('Falta la landing page de captación con estructura y copy optimizado');
    if (!hasDesignRecommendations) suggestions.push('Faltan recomendaciones de diseño (tipografía, colores, layout, mobile)');
    if (!hasEmailSequence) suggestions.push(`Secuencia de emails incompleta (detectados: ${emailCount}/15)`);
    if (!hasWhatsAppSequence) suggestions.push(`Secuencia WhatsApp incompleta (detectados: ${comCount}/30)`);
    if (!hasGroupDescription) suggestions.push('Falta la descripción del grupo de WhatsApp');
    if (!hasVideoScripts) suggestions.push('Faltan guiones de video');
    if (!hasAudioScripts) suggestions.push('Faltan guiones de audio/notas de voz');
    if (!hasImageBriefs) suggestions.push('Faltan briefs de imagen para diseñador');
  }

  // Determinar grade
  const avgScore = (pilar1Score + pilar2Score + pilar3Score) / 3;
  let grade = 'D';
  if (avgScore >= 90) grade = 'A';
  else if (avgScore >= 80) grade = 'B';
  else if (avgScore >= 70) grade = 'C';

  return {
    pilar1Score,
    pilar2Score,
    pilar3Score,
    overallScore: Math.round(avgScore),
    grade,
    metrics: {
      painMentions: painCount,
      productMentions: productCount,
      wordCount,
      hasSecrets,
      hasStack,
      hasGuarantee,
      hasCTA,
      hasEmotionalHook,
      hasVulnerability,
      hasFamilyReference,
      hasFutureProjection,
      hasUrgency,
      hasScarcity,
      hasTestimonials,
      hasTimestamps,
      hasToneNotes,
      hasBrollNotes,
      // Métricas de AutoWebinar completo
      ...(funnelType === 'autowebinar' ? {
        hasLandingPage,
        hasDesignRecommendations,
        emailsDetected: emailCount,
        comunicadosDetected: comCount,
        hasEmailSequence,
        hasWhatsAppSequence,
        hasGroupDescription,
        hasVideoScripts,
        hasAudioScripts,
        hasImageBriefs,
        totalDeliverables: (hasLandingPage ? 1 : 0) + emailCount + comCount + (hasGroupDescription ? 1 : 0) + (hasVideoScripts ? 3 : 0) + (hasAudioScripts ? 2 : 0) + (hasImageBriefs ? 2 : 0),
      } : {}),
    },
    suggestions: suggestions.slice(0, 8), // Máximo 8 sugerencias para autowebinar
  };
}

// Helper para escapar caracteres especiales en regex
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function estimateConversion(project: any): any {
  const baseRate = 2.0;
  const levelBonus = (project.avatar_profile?.consciousnessLevel || 1) * 0.4;
  const triggersCount = project.persuasion_strategy?.mentalTriggers?.filter((t: any) => t.enabled).length || 3;
  const triggersBonus = triggersCount * 0.1;
  const bonusesCount = project.product_info?.bonuses?.length || 0;
  const bonusesBonus = Math.min(bonusesCount * 0.15, 0.6);
  
  const estimated = baseRate + levelBonus + triggersBonus + bonusesBonus;
  
  return {
    min: Math.max(1.5, Number((estimated - 0.6).toFixed(2))),
    max: Math.min(8.0, Number((estimated + 1.2).toFixed(2))),
    factors: {
      base: baseRate,
      consciousnessLevel: levelBonus,
      mentalTriggers: triggersBonus,
      bonuses: bonusesBonus,
    }
  };
}

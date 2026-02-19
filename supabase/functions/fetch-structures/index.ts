/**
 * fetch-structures edge function
 *
 * GET  → Returns all active content structures from DB
 * POST → { action: "seed" } inserts initial structures if table is empty
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Seed data: initial structures ───────────────────────────────────────────

const INITIAL_STRUCTURES = [
  {
    name: "VSL Alta Conversión (12 Bloques)",
    type: "vsl",
    description: "Estructura probada de VSL de 20-30 minutos. Máxima conversión para ofertas digitales, coaching y cursos. Funciona con audiencias frías y templadas.",
    target_audiences: ["emprendedores", "coaches", "infoproductores", "consultores"],
    is_active: true,
    blocks: [
      {
        id: "hook",
        name: "Hook de Apertura",
        objective: "Capturar atención en los primeros 30 segundos e impedir que el espectador se vaya",
        instructions: `Crea el hook de apertura del VSL. DEBE cumplir TODOS estos criterios:
- Empieza con una afirmación sorprendente, estadística impactante, o pregunta que genere curiosidad inmediata
- Habla directamente al dolor más profundo o al deseo más fuerte del avatar
- Crea un loop abierto que solo se cierra al final del VSL
- NO menciones el producto todavía
- Duración sugerida: 30-60 segundos cuando se lea en voz alta
- Tono: urgente, directo, sin rodeos`,
        required_inputs: ["target_audience", "main_pain", "main_desire", "expert_name"],
      },
      {
        id: "problem_identification",
        name: "Identificación del Problema",
        objective: "Hacer que el espectador se sienta completamente visto y comprendido",
        instructions: `Describe el problema principal que vive la audiencia en detalle visceral:
- Nombra el problema exactamente como lo describe el avatar (usa sus palabras, no términos técnicos)
- Describe el día a día del problema: qué sienten al despertar, qué piensan durante el día, qué les quita el sueño
- Valida su experiencia: "No es tu culpa que..."
- Incluye las consecuencias reales de seguir sin resolver este problema (económicas, emocionales, relacionales)
- NO ofrezcas la solución todavía`,
        required_inputs: ["main_pain", "target_audience", "pain_consequences"],
      },
      {
        id: "pain_agitation",
        name: "Agitación del Dolor",
        objective: "Amplificar el dolor para que la necesidad de solución sea urgente e innegable",
        instructions: `Agita el dolor con lenguaje visceral y emocional:
- Proyecta el futuro si NO actúan: "Si sigues así, en 6 meses vas a..."
- Usa comparaciones que duelen: "Mientras tú [situación actual], hay personas que [contraste]"
- Menciona el costo real de la inacción (tiempo, dinero, relaciones, salud mental)
- Destruye las falsas soluciones que ya han intentado y no funcionaron
- Finaliza con una pregunta que haga al espectador querer desesperadamente la solución`,
        required_inputs: ["main_pain", "failed_solutions", "pain_consequences"],
      },
      {
        id: "expert_story",
        name: "Historia del Experto",
        objective: "Establecer autoridad y conexión emocional a través de una historia de transformación real",
        instructions: `Cuenta la historia del experto siguiendo esta estructura exacta:
1. ANTES: El momento más bajo (específico, con fecha/lugar si es posible, emocionalmente honesto)
2. EL QUIEBRE: El momento exacto que cambió todo (el insight, la decisión, el encuentro)
3. EL CAMINO: Los intentos, errores y aprendizajes del proceso
4. LA TRANSFORMACIÓN: El resultado concreto y medible que lograron
5. EL PUENTE: "Y fue ahí cuando me di cuenta de que no podía guardarme esto para mí..."
Tono: conversacional, vulnerable, sin exagerar. La historia debe hacer que el espectador diga "eso me pasa a mí también"`,
        required_inputs: ["expert_name", "expert_lowest_point", "expert_breakthrough", "expert_results"],
      },
      {
        id: "unique_mechanism",
        name: "Mecanismo Único de la Solución",
        objective: "Presentar el método/sistema del experto como algo nuevo y diferente a todo lo que el espectador ya conoce",
        instructions: `Presenta el mecanismo único (el "secret sauce") del producto:
- Dale un nombre memorable y específico al método (ej: "El Sistema de las 3 Palancas", "El Método LASER")
- Explica POR QUÉ las soluciones tradicionales no funcionan (destrucción de creencias)
- Introduce la nueva forma de ver el problema ("El verdadero problema no es X, es Y")
- Explica la lógica del mecanismo en términos simples (máximo 3 pasos o componentes)
- Conecta el mecanismo con los resultados que quiere el avatar
- NO hagas el pitch todavía`,
        required_inputs: ["product_name", "unique_mechanism", "product_solution"],
      },
      {
        id: "product_presentation",
        name: "Presentación del Producto",
        objective: "Revelar el producto como la implementación natural y más eficiente del mecanismo único",
        instructions: `Presenta el producto con máximo impacto:
- Comienza con: "Y fue así como creé [nombre del producto]"
- Describe qué ES el producto en 1-2 oraciones simples
- Explica qué hace exactamente (no qué es — el resultado, no el proceso)
- Lista los componentes/módulos/bonos principales con su beneficio específico
- Usa el stack de credenciales: cuántas personas lo han usado, resultados obtenidos
- Mantén el tono conversacional, no de folleto`,
        required_inputs: ["product_name", "product_description", "product_components", "social_proof_numbers"],
      },
      {
        id: "social_proof",
        name: "Prueba Social",
        objective: "Eliminar el escepticismo mostrando que otras personas como el espectador ya obtuvieron resultados reales",
        instructions: `Presenta la prueba social de forma narrativa, no solo como lista de testimonios:
- Cuenta 2-3 historias específicas de clientes (nombre, situación de partida, resultado concreto con números)
- Usa el formato: "Fulano llegó a nosotros con X problema. En Y semanas/meses, logró Z resultado específico"
- Si tienes capturas o datos, descríbelos: "mira esta captura de pantalla donde Juan muestra..."
- Incluye prueba social cuantitativa: número de estudiantes, casos de éxito, años de experiencia
- Cierra con una reflexión que conecte al espectador con las historias`,
        required_inputs: ["testimonials", "social_proof_numbers", "client_results"],
      },
      {
        id: "value_stack",
        name: "Stack de Valor",
        objective: "Hacer que el precio parezca ridículamente bajo comparado con el valor total entregado",
        instructions: `Construye el stack de valor de mayor a menor:
1. Presenta el producto principal con su valor real (no el precio, el VALOR): "Si fueras a contratar a alguien para que te ayude con esto 1 a 1, pagarías fácilmente X..."
2. Agrega cada bono con su valor individual: "Y encima de eso, incluyo [BONO 1] valorado en $..."
3. Calcula el valor total acumulado: "En total estás recibiendo $X,XXX en valor..."
4. Contrasta con el precio: "Pero hoy no vas a pagar $X,XXX..."
5. Crea anticipación antes de revelar el precio real
Nota: Si no hay valores específicos, usa [INSERTAR VALOR] con estimados razonables`,
        required_inputs: ["product_price", "bonuses", "value_comparison"],
      },
      {
        id: "price_anchor",
        name: "Precio y Anclaje",
        objective: "Revelar el precio de manera que parezca una decisión obvia e irresistible",
        instructions: `Revela el precio con máximo impacto psicológico:
- Usa el contraste: "No vas a pagar $X,XXX... ni $XXX... hoy lo tienes por solo..."
- Revela el precio con confianza, no disculpándote por él
- Desglosa el precio en términos diarios/semanales si aplica: "eso es menos que un café al día..."
- Compara con el costo de NO resolver el problema: "Sigues perdiendo $X al mes por [problema]"
- Si hay opción de pago: presenta ambas opciones claramente`,
        required_inputs: ["product_price", "payment_plan", "cost_of_inaction"],
      },
      {
        id: "guarantee",
        name: "Garantía",
        objective: "Eliminar todo el riesgo percibido de la decisión de compra",
        instructions: `Presenta la garantía con convicción absoluta:
- Nómbrala de forma poderosa: "Garantía de Resultados o Tu Dinero de Regreso"
- Explica exactamente los términos: qué cubre, cuánto tiempo, cómo se solicita
- Voltea la carga del riesgo: "Yo asumo TODO el riesgo. Tú no tienes nada que perder"
- Explica por qué confías en dar esta garantía: porque el producto funciona
- Usa lenguaje fuerte: "Si no [resultado específico] en [tiempo], te devuelvo cada centavo SIN preguntas"`,
        required_inputs: ["guarantee_period", "guarantee_description", "product_name"],
      },
      {
        id: "urgency_scarcity",
        name: "Urgencia y Escasez",
        objective: "Motivar la acción inmediata eliminando la procrastinación",
        instructions: `Crea urgencia y escasez reales (NUNCA falsas — solo usa lo que sea verdad):
- Si hay fecha límite: explica exactamente cuándo vence y qué se pierde
- Si hay cupos limitados: explica por qué son limitados (capacidad, atención personal)
- Si hay precio especial: explica que es un precio de lanzamiento que subirá
- Remarca el costo de esperar: "Cada día que pasa sin resolver esto te está costando..."
- Crea una decisión binaria: "Tienes dos opciones en este momento..."
Si no hay escasez real, usa urgencia basada en el costo de la inacción`,
        required_inputs: ["urgency_reason", "scarcity_reason", "main_pain"],
      },
      {
        id: "final_cta",
        name: "CTA Final",
        objective: "Guiar al espectador exactamente hacia la acción de compra con máxima claridad",
        instructions: `Crea el llamado a la acción final con máxima claridad y motivación:
- Describe el botón/paso exacto: "Haz clic en el botón [color/texto] que ves debajo de este video"
- Describe qué pasa después del clic: "Llegarás a una página segura donde..."
- Resumen de todo lo que reciben: menciona el producto + bonos principales en 3-4 líneas
- Cierra con una imagen poderosa del futuro que les espera si actúan: "Imagina que en 90 días..."
- Última línea de urgencia: reafirma por qué deben actuar HOY
- Despedida directa y energética`,
        required_inputs: ["product_name", "cta_url_description", "main_desire"],
      },
    ],
  },
  {
    name: "Anuncio Facebook/Instagram (6 Bloques)",
    type: "facebook-ad",
    description: "Estructura de anuncio de alta conversión para Meta Ads. Optimizada para interrumpir el scroll y generar acción inmediata. Funciona para leads fríos.",
    target_audiences: ["emprendedores", "profesionales", "cualquier audiencia de Meta Ads"],
    is_active: true,
    blocks: [
      {
        id: "scroll_hook",
        name: "Hook de 3 Segundos",
        objective: "Detener el scroll en los primeros 3 segundos con un patrón de interrupción irresistible",
        instructions: `Crea el hook inicial del anuncio (primeras 1-2 oraciones visibles antes del "ver más"):
- OPCIÓN A — Pregunta disruptiva: "¿Por qué [profesión/persona] en [país] están [resultado sorprendente]...?"
- OPCIÓN B — Afirmación contraintuitiva: "El [método tradicional] está destruyendo tu [resultado deseado]"
- OPCIÓN C — Número específico: "Cómo [nombre/empresa] generó $X en [tiempo corto] sin [objeción común]"
- OPCIÓN D — Empatía directa: "Si eres [avatar específico] y estás harto de [pain point], esto es para ti"
El hook debe hacer que el avatar diga "eso me habla a mí directamente". Máximo 20 palabras.`,
        required_inputs: ["target_audience", "main_pain", "main_result"],
      },
      {
        id: "problem_hook",
        name: "Amplificación del Problema",
        objective: "Confirmar que entendemos exactamente el problema del lector y validar su frustración",
        instructions: `En 3-5 oraciones cortas, valida el problema del avatar:
- Usa el lenguaje exacto que usa la audiencia (sus palabras, no términos técnicos)
- Nombra la frustración específica, no el problema genérico
- "Si eres como la mayoría de [avatar], probablemente ya intentaste [solución fallida] y..."
- Cierra con: "El problema no es [lo que creen]... el problema real es [verdad oculta]"
Máximo 80 palabras. Oraciones cortas. Mucho espacio en blanco para facilitar la lectura en móvil.`,
        required_inputs: ["main_pain", "failed_solutions", "target_audience"],
      },
      {
        id: "solution_promise",
        name: "Promesa de Solución",
        objective: "Introducir la solución con una promesa específica, creíble y deseable",
        instructions: `Presenta la solución en 2-3 oraciones:
- "Descubrí que la clave para [resultado] es [mecanismo único en términos simples]"
- Haz una promesa específica: números, tiempo, condición ("sin experiencia previa", "desde casa", etc.)
- Crea curiosidad sobre cómo: "Y lo mejor es que no requiere [objeción principal]"
NO menciones el precio todavía. La promesa debe ser lo suficientemente específica para ser creíble, pero lo suficientemente intrigante para querer saber más.`,
        required_inputs: ["unique_mechanism", "main_result", "main_objection"],
      },
      {
        id: "credibility",
        name: "Credibilidad Rápida",
        objective: "Establecer por qué esta persona/empresa tiene autoridad para hacer esta promesa",
        instructions: `En 2-3 oraciones establece credibilidad de forma casual, no arrogante:
- "He ayudado a más de X [personas/empresas] a lograr [resultado]"
- O: "Fui de [situación difícil] a [resultado actual] en [tiempo]"
- O: "[Nombre/empresa] tiene [años de experiencia/casos de éxito/reconocimientos]"
- Incluye 1-2 nombres o resultados específicos de clientes si tienes permiso
Tono: conversacional, como contándolo a un amigo, no como un CV.`,
        required_inputs: ["expert_name", "social_proof_numbers", "expert_results"],
      },
      {
        id: "clear_offer",
        name: "Oferta Clara",
        objective: "Describir exactamente qué van a recibir y por qué vale la pena hacer clic",
        instructions: `Describe la oferta en 3-4 bullet points con el formato beneficio → resultado:
- "✅ [Componente/módulo]: para que puedas [resultado específico]"
- Incluye el bonus o incentivo principal si lo hay
- Menciona el precio o el tipo de acceso (gratis, de pago, llamada, etc.)
- "Todo esto por solo $X" o "Acceso completamente gratis"
Claro, directo, sin rodeos. El espectador debe entender exactamente qué va a pasar cuando haga clic.`,
        required_inputs: ["product_name", "product_components", "product_price"],
      },
      {
        id: "ad_cta",
        name: "CTA del Anuncio",
        objective: "Una sola acción clara que elimine toda fricción para hacer clic",
        instructions: `Una sola oración de CTA + 1 oración de urgencia opcional:
- "Haz clic en [botón/enlace] para [acción específica]: [link o instrucción]"
- Si es urgente: "Solo disponible hasta [fecha/cupos]"
- Si hay objeción de compromiso: "Sin tarjeta de crédito" / "Cancela cuando quieras" / "100% gratuito"
NUNCA uses "Haz clic aquí" solo. Siempre especifica qué van a obtener del otro lado.`,
        required_inputs: ["cta_action", "urgency_reason"],
      },
    ],
  },
  {
    name: "Webinar Automatizado (10 Bloques)",
    type: "webinar",
    description: "Estructura de webinar de 60-90 minutos para vender productos de alto valor. Ideal para ofertas de $497 en adelante. Combina educación genuina con venta consultiva.",
    target_audiences: ["coaches", "consultores", "infoproductores de alto ticket"],
    is_active: true,
    blocks: [
      {
        id: "webinar_hook",
        name: "Hook de Apertura + Promesa",
        objective: "Retener a los asistentes desde el primer minuto estableciendo el valor de estar presentes",
        instructions: `Abre el webinar con máximo impacto en los primeros 2 minutos:
1. Agradecer la presencia de forma breve y genuina
2. La promesa principal: "Al final de este webinar vas a [resultado específico y medible]"
3. Credibilidad rápida: por qué esta persona puede enseñar esto
4. Crear anticipación: "Voy a compartir [algo sorprendente/contraintuitivo] que la mayoría no conoce"
5. Instrucción de engagement: "Escribe en el chat de dónde eres / cuál es tu mayor desafío con [tema]"`,
        required_inputs: ["expert_name", "main_promise", "webinar_topic"],
      },
      {
        id: "story_context",
        name: "Historia + Contexto",
        objective: "Conectar emocionalmente con la audiencia y establecer el contexto del problema",
        instructions: `Presenta la historia de transformación del experto en 5-7 minutos:
- El antes: situación específica, fecha, emociones (máximo específico, máximo vulnerable)
- El quiebre: el momento exacto que cambió todo
- El descubrimiento: la solución que encontró
- Los resultados: concretos, con números, en tiempo específico
- El puente: "Y cuando vi que esto funcionaba para mí, empecé a enseñárselo a otros..."
- Prueba social rápida: 2-3 resultados de clientes en 30 segundos`,
        required_inputs: ["expert_name", "expert_story", "expert_results"],
      },
      {
        id: "big_idea",
        name: "La Gran Idea (Reencuadre)",
        objective: "Cambiar la manera en que la audiencia ve el problema para que la solución sea inevitable",
        instructions: `Presenta el reencuadre conceptual central del webinar:
- "La razón por la que la mayoría falla en [área] NO es [razón común]... es [razón real]"
- Explica el Marco Mental correcto vs el incorrecto
- Usa una analogía o metáfora poderosa para ilustrar
- "Una vez que entiendes esto, todo cambia. Y eso es exactamente lo que vamos a hacer hoy"
Este es el insight transformacional del webinar. La audiencia debe sentir que acaban de aprender algo que no podían desaprender.`,
        required_inputs: ["unique_mechanism", "common_misconception", "webinar_topic"],
      },
      {
        id: "content_block_1",
        name: "Contenido Principal — Pilar 1",
        objective: "Entregar el primer pilar de contenido que sustenta la promesa principal",
        instructions: `Desarrolla el primer pilar de contenido educativo con valor real:
- Nombre del pilar: debe sonar como un framework (ej: "El Primer Pilar: Claridad de Oferta")
- Explicación del concepto (3-5 minutos)
- Ejemplo real o case study
- Ejercicio o reflexión rápida para la audiencia
- Conexión con el resultado final prometido
IMPORTANTE: El contenido debe ser valioso por sí mismo, no un teaser. Enséñalo de verdad.`,
        required_inputs: ["content_pillar_1", "case_study", "target_audience"],
      },
      {
        id: "content_block_2",
        name: "Contenido Principal — Pilar 2",
        objective: "Entregar el segundo pilar que profundiza y complementa el primero",
        instructions: `Desarrolla el segundo pilar con conexión lógica al primero:
- Transición: "Ahora que tienes claro [Pilar 1], el siguiente paso es..."
- Explica el segundo componente del framework
- Incluye el error más común que comete la gente aquí
- Caso de estudio o ejemplo diferente al del Pilar 1
- Pregunta de reflexión para la audiencia`,
        required_inputs: ["content_pillar_2", "common_mistake", "target_audience"],
      },
      {
        id: "content_block_3",
        name: "Contenido Principal — Pilar 3",
        objective: "El tercer pilar que completa el framework y crea el puente hacia la oferta",
        instructions: `Desarrolla el tercer pilar que naturalmenteconduce a la oferta:
- Transición: "Y el tercer elemento, el que lo une todo, es..."
- Presenta el tercer componente
- Muestra cómo los 3 pilares trabajan juntos
- "Cuando aplicas los 3 pilares juntos, el resultado es..."
- Cierre natural: "Y esto es exactamente lo que hacemos en [nombre del programa]..."
Este pilar debe crear un gancho natural hacia la presentación de la oferta.`,
        required_inputs: ["content_pillar_3", "combined_result", "product_name"],
      },
      {
        id: "qa_transition",
        name: "Transición a la Oferta",
        objective: "Pasar de la sección de contenido a la presentación de la oferta de forma natural y sin fricción",
        instructions: `Crea la transición que lleva de la educación a la oferta:
- "Ya vieron los 3 pilares. La pregunta es: ¿cómo implementar todo esto sin [obstáculo principal]?"
- Reconoce la posible duda: "Sé lo que algunos están pensando: 'Esto suena bien, pero...'"
- Propón la solución: "Por eso creé [nombre del programa]"
- Introduce el cambio de sección: "En los próximos minutos voy a mostrarte exactamente cómo..."
Tono: conversacional, sin cambiar bruscamente a modo vendedor.`,
        required_inputs: ["main_objection", "product_name", "implementation_challenge"],
      },
      {
        id: "offer_presentation",
        name: "Presentación de la Oferta",
        objective: "Presentar el programa/producto completo con todo su valor y hacer que la decisión sea obvia",
        instructions: `Presenta la oferta completa con stack de valor:
1. Nombra el programa con confianza
2. Explica qué hace en 2 oraciones (resultado, no proceso)
3. Lista los módulos/componentes con su beneficio específico
4. Agrega bonos uno a uno con su valor
5. Stack de valor total vs precio real
6. Garantía (explícala con convicción, no disculpándote)
7. Revela el precio con contraste: "No es X... ni Y... es solo Z"
8. Instrucciones de compra claras`,
        required_inputs: ["product_name", "product_components", "bonuses", "product_price", "guarantee_period"],
      },
      {
        id: "objection_handling",
        name: "Manejo de Objeciones en Vivo",
        objective: "Eliminar las objeciones principales que impiden la compra",
        instructions: `Aborda las 3-4 objeciones principales de forma directa:
- Formato: "Sé que algunos están pensando '[objeción exacta]'. Y entiendo eso, porque yo también..."
- Para cada objeción: nombrarla, validarla, destruirla con lógica y/o historia
- Objeciones típicas: precio/dinero, tiempo, "ya intenté algo similar", "no sé si funciona para mí"
- Cierra: "Si esa es tu única razón para no entrar, entonces esa no es la razón real. La razón real es [la verdad]"`,
        required_inputs: ["main_objections", "objection_responses"],
      },
      {
        id: "webinar_close",
        name: "Cierre Final + Urgencia",
        objective: "Cerrar el webinar motivando la acción inmediata con claridad y urgencia real",
        instructions: `Cierra el webinar con máxima energía y claridad:
1. Resumen poderoso de lo que aprendieron hoy (30 segundos)
2. La decisión binaria: "Tienes dos opciones: [opción A sin el programa] o [opción B con el programa]"
3. Urgencia real: explica exactamente por qué deben decidir hoy
4. Instrucciones de compra paso a paso: "Para entrar, haz clic en..."
5. Qué pasa después del registro: próximos pasos claros
6. Despedida energética con visión del futuro que les espera`,
        required_inputs: ["main_desire", "urgency_reason", "cta_action", "next_steps"],
      },
    ],
  },
];

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // GET: return all active structures
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("content_structures")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // If empty, auto-seed
      if (!data || data.length === 0) {
        await seedStructures(supabase);
        const { data: seeded, error: seedError } = await supabase
          .from("content_structures")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: true });
        if (seedError) throw seedError;
        return jsonResponse({ success: true, structures: mapStructures(seeded ?? []) });
      }

      return jsonResponse({ success: true, structures: mapStructures(data) });
    }

    // POST: seed or admin actions
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));

      if (body.action === "seed") {
        // Delete existing and re-seed
        await supabase.from("content_structures").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await seedStructures(supabase);
        return jsonResponse({ success: true, message: "Estructuras sembradas correctamente" });
      }

      // Create or update structure
      if (body.structure) {
        const { data, error } = body.structure.id
          ? await supabase.from("content_structures").update({ ...body.structure, updated_at: new Date().toISOString() }).eq("id", body.structure.id).select().single()
          : await supabase.from("content_structures").insert(body.structure).select().single();
        if (error) throw error;
        return jsonResponse({ success: true, structure: data });
      }
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  } catch (err) {
    console.error("fetch-structures error:", err);
    return jsonResponse({ success: false, error: (err as Error).message }, 500);
  }
});

async function seedStructures(supabase: any) {
  const { error } = await supabase.from("content_structures").insert(INITIAL_STRUCTURES);
  if (error) throw error;
}

function mapStructures(rows: any[]) {
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    description: r.description,
    targetAudiences: r.target_audiences ?? [],
    blocks: r.blocks ?? [],
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

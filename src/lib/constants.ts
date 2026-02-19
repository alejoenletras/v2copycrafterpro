import { StepConfig, FunnelType, SelectedDNAs, WizardStep } from '@/types';

export const ALL_WIZARD_STEPS: StepConfig[] = [
  { id: 'funnel-type',        label: 'Tipo de Embudo',             shortLabel: 'Embudo',     pilar: 0, pilarName: 'Inicio' },
  { id: 'vsl-mode-selection', label: 'Modo de Generación',         shortLabel: 'Modo',       pilar: 0, pilarName: 'Inicio' },
  { id: 'url-input',          label: 'URLs y Contenido',           shortLabel: 'URLs',       pilar: 0, pilarName: 'Auto' },
  { id: 'extracted-brief',    label: 'Brief Extraído',             shortLabel: 'Brief',      pilar: 0, pilarName: 'Auto' },
  { id: 'high-ticket-info',   label: 'Config. High Ticket',        shortLabel: 'High Ticket',pilar: 0, pilarName: 'Inicio' },
  { id: 'dna-selection',      label: 'DNAs de Campaña',            shortLabel: 'DNAs',       pilar: 0, pilarName: 'DNAs' },
  { id: 'expert-voice',       label: 'Voz del Experto',            shortLabel: 'Voz',        pilar: 1, pilarName: 'Experto' },
  { id: 'expert-story',       label: 'Historia de Transformación', shortLabel: 'Historia',   pilar: 1, pilarName: 'Experto' },
  { id: 'expert-beliefs',     label: 'Creencias y Promesa',        shortLabel: 'Creencias',  pilar: 1, pilarName: 'Experto' },
  { id: 'avatar-consciousness',label: 'Nivel de Consciencia',      shortLabel: 'Consciencia',pilar: 2, pilarName: 'Avatar' },
  { id: 'avatar-pains',       label: 'Dolores del Avatar',         shortLabel: 'Dolores',    pilar: 2, pilarName: 'Avatar' },
  { id: 'avatar-desires',     label: 'Deseos del Avatar',          shortLabel: 'Deseos',     pilar: 2, pilarName: 'Avatar' },
  { id: 'avatar-objections',  label: 'Objeciones Reales',          shortLabel: 'Objeciones', pilar: 2, pilarName: 'Avatar' },
  { id: 'persuasion-triggers',label: 'Gatillos Mentales',          shortLabel: 'Gatillos',   pilar: 3, pilarName: 'Persuasión' },
  { id: 'product-info',       label: 'Información del Producto',   shortLabel: 'Producto',   pilar: 3, pilarName: 'Persuasión' },
  { id: 'review',             label: 'Revisar y Generar',          shortLabel: 'Generar',    pilar: 0, pilarName: 'Final' },
];

// Kept for backwards compatibility
export const WIZARD_STEPS = ALL_WIZARD_STEPS;

// SaleADS specific steps (shortened wizard)
export const SALEADS_WIZARD_STEPS: StepConfig[] = [
  { id: 'funnel-type',   label: 'Tipo de Embudo',         shortLabel: 'Embudo', pilar: 0, pilarName: 'Inicio' },
  { id: 'saleads-config',label: 'Configuración SaleADS',  shortLabel: 'Config', pilar: 0, pilarName: 'SaleADS' },
  { id: 'review',        label: 'Revisar y Generar',       shortLabel: 'Generar',pilar: 0, pilarName: 'Final' },
];

// VSL Auto mode: 5 steps only
export const VSL_AUTO_WIZARD_STEPS: StepConfig[] = [
  { id: 'funnel-type',        label: 'Tipo de Embudo',     shortLabel: 'Embudo', pilar: 0, pilarName: 'Inicio' },
  { id: 'vsl-mode-selection', label: 'Modo de Generación', shortLabel: 'Modo',   pilar: 0, pilarName: 'Inicio' },
  { id: 'url-input',          label: 'URLs y Contenido',   shortLabel: 'URLs',   pilar: 0, pilarName: 'Auto' },
  { id: 'extracted-brief',    label: 'Brief Extraído',     shortLabel: 'Brief',  pilar: 0, pilarName: 'Auto' },
  { id: 'review',             label: 'Revisar y Generar',  shortLabel: 'Generar',pilar: 0, pilarName: 'Final' },
];

// Steps to skip per DNA type
const EXPERT_STEPS: WizardStep[] = ['expert-voice', 'expert-story', 'expert-beliefs'];
const AUDIENCE_STEPS: WizardStep[] = ['avatar-consciousness', 'avatar-pains', 'avatar-desires', 'avatar-objections'];
const PRODUCT_STEPS: WizardStep[] = ['product-info'];

export function getActiveWizardSteps(
  funnelType?: FunnelType,
  selectedDNAs?: SelectedDNAs,
  vslType?: string,
  vslMode?: string
): StepConfig[] {
  if (funnelType === 'vsl-saleads') return SALEADS_WIZARD_STEPS;

  // Auto mode for VSL: short 5-step flow
  if (funnelType === 'vsl' && vslMode === 'auto') {
    return VSL_AUTO_WIZARD_STEPS;
  }

  const stepsToSkip: WizardStep[] = [];

  // Auto-mode steps never appear in manual flows
  stepsToSkip.push('url-input', 'extracted-brief');

  // vsl-mode-selection appears only for VSL
  if (funnelType !== 'vsl') {
    stepsToSkip.push('vsl-mode-selection');
  }

  // High-ticket step only for VSL high-ticket
  if (!(funnelType === 'vsl' && vslType === 'high-ticket')) {
    stepsToSkip.push('high-ticket-info');
  }

  // Skip steps covered by selected DNAs
  if (selectedDNAs?.expert) stepsToSkip.push(...EXPERT_STEPS);
  if (selectedDNAs?.audience) stepsToSkip.push(...AUDIENCE_STEPS);
  if (selectedDNAs?.product) stepsToSkip.push(...PRODUCT_STEPS);

  return ALL_WIZARD_STEPS.filter(step => !stepsToSkip.includes(step.id));
}

// Gatillos mentales básicos
export const MENTAL_TRIGGERS = [
  { name: 'Reciprocidad', description: 'Dar valor primero genera obligación de devolver', example: 'Regala contenido gratuito antes de vender' },
  { name: 'Prueba Social', description: 'Si otros lo hicieron y les fue bien, yo también puedo', example: 'Testimonios, casos de éxito, números' },
  { name: 'Autoridad', description: 'Confiamos en expertos y figuras de autoridad', example: 'Credenciales, menciones en medios, premios' },
  { name: 'Escasez', description: 'Lo que es raro o limitado es más valioso', example: 'Cupos limitados, edición especial' },
  { name: 'Urgencia', description: 'Actuar ahora vs postergar genera acción inmediata', example: 'Oferta termina en 24h, precio sube mañana' },
  { name: 'Contraste', description: 'Comparar dos cosas hace más fácil decidir', example: 'Antes/después, con vs sin tu producto' },
  { name: 'Anclaje', description: 'El primer número que ven define la percepción de valor', example: 'Valor real $5,000, hoy solo $997' },
  { name: 'Compromiso y Consistencia', description: 'Pequeños compromisos llevan a grandes compras', example: 'Micro-compromisos, quizzes, opt-ins' },
  { name: 'Simpatía', description: 'Compramos de personas que nos caen bien', example: 'Historia personal, vulnerabilidad, humor' },
  { name: 'Novedad', description: 'Lo nuevo activa dopamina y curiosidad', example: 'Método nunca antes visto, descubrimiento reciente' },
];

// Gatillos mentales avanzados basados en frameworks de Brunson, Hormozi, Edwards y Klarić
export const MENTAL_TRIGGERS_ADVANCED = [
  {
    name: 'Destrucción de Creencias Falsas',
    description: 'Los 3 Secretos de Brunson que destruyen creencias sobre el vehículo, capacidad interna y factores externos',
    example: '"Sé que piensas que esto no funciona para ti, pero déjame mostrarte por qué estás equivocado..."',
    timing: 'Sección de contenido (minutos 5-40)',
    emotionalIntensity: 'muy_alta',
    latinoamericanTip: 'En LATAM las creencias limitantes sobre dinero y "no ser suficiente" son muy fuertes - atacarlas con empatía'
  },
  {
    name: 'Value Stack (Hormozi)',
    description: 'Apilar valor componente por componente hasta que el precio parezca ridículo',
    example: '"Módulo 1 vale $497... Módulo 2 vale $397... Los bonos valen $1,200... Valor total: $3,000. Hoy solo $497"',
    timing: 'Presentación de oferta',
    emotionalIntensity: 'alta',
    latinoamericanTip: 'Mostrar el ahorro comparado con alternativas locales (cursos presenciales, universidades, etc.)'
  },
  {
    name: 'Código Reptiliano - Familia',
    description: 'Apelar al instinto de protección y provisión familiar (Klarić)',
    example: '"Tu familia merece que les des más. Tus hijos merecen un padre/madre que pueda estar presente..."',
    timing: 'Hook inicial y cierre emocional',
    emotionalIntensity: 'muy_alta',
    latinoamericanTip: 'La familia es el código cultural #1 en LATAM - usarlo con autenticidad, no manipulación'
  },
  {
    name: 'Código Reptiliano - Seguridad',
    description: 'Apelar al miedo de perder estabilidad y el deseo de seguridad financiera',
    example: '"Imagina nunca más preocuparte por si llega el dinero a fin de mes..."',
    timing: 'Agitación del problema',
    emotionalIntensity: 'muy_alta',
    latinoamericanTip: 'En economías inestables (Argentina, Venezuela) este código es extremadamente poderoso'
  },
  {
    name: 'Pertenencia a Tribu',
    description: 'Necesidad humana de ser parte de una comunidad de personas similares',
    example: '"Únete a la comunidad de más de 5,000 emprendedores que ya están transformando sus vidas..."',
    timing: 'Presentación de oferta y bonos',
    emotionalIntensity: 'alta',
    latinoamericanTip: 'Los grupos de WhatsApp/Telegram son muy valorados en LATAM - mencionarlos como bono'
  },
  {
    name: 'Pattern Interrupt Emocional',
    description: 'Romper el patrón esperado con una declaración o pregunta emocionalmente impactante',
    example: '"Déjame hacerte una pregunta incómoda: ¿Cuántos años más vas a seguir conformándote con menos?"',
    timing: 'Primeros 10 segundos del VSL',
    emotionalIntensity: 'muy_alta',
    latinoamericanTip: 'Usar referencias culturales locales para mayor impacto (ej: "como dice mi abuela...")'
  },
  {
    name: 'Loops Abiertos',
    description: 'Crear curiosidad sin resolver hasta más tarde, manteniendo la atención',
    example: '"En unos minutos te voy a revelar el error #1 que te está costando miles... pero primero..."',
    timing: 'Transiciones entre secciones',
    emotionalIntensity: 'media',
    latinoamericanTip: 'Funciona muy bien en Stories y emails de seguimiento'
  },
  {
    name: 'Inversión Total del Riesgo',
    description: 'Garantía tan fuerte que el cliente siente que NO puede perder (Hormozi)',
    example: '"Si no ves resultados en 90 días, te devuelvo cada centavo Y te dejo quedarte con todo el material"',
    timing: 'Después de revelar el precio',
    emotionalIntensity: 'alta',
    latinoamericanTip: 'En LATAM hay más desconfianza - la garantía debe ser MÁS fuerte que en USA'
  },
  {
    name: 'Futuro Proyectado Emocional',
    description: 'Hacer que visualicen vívidamente su vida transformada con todos los sentidos',
    example: '"Cierra los ojos. Imagínate dentro de 6 meses. Despiertas sin alarma. Abres tu laptop y ves las ventas de anoche..."',
    timing: 'Antes del CTA final',
    emotionalIntensity: 'muy_alta',
    latinoamericanTip: 'Incluir elementos específicos: "tomando un cafecito con tu familia sin prisa..."'
  },
  {
    name: 'Enemigo Común Identificable',
    description: 'Crear un villano externo que une al experto con la audiencia',
    example: '"Las agencias que te cobran miles sin darte resultados... los gurús que venden humo..."',
    timing: 'Historia del experto y agitación',
    emotionalIntensity: 'alta',
    latinoamericanTip: 'En LATAM el enemigo puede ser "el sistema", "los que nacieron con dinero", "las empresas grandes"'
  }
];

// Fórmulas de headlines basadas en Jim Edwards (Copywriting Secrets)
export const HEADLINE_FORMULAS = [
  {
    name: 'Curiosidad + Beneficio',
    template: 'El Secreto de [GRUPO_EXITOSO] para [BENEFICIO] Sin [OBSTÁCULO]',
    example: 'El Secreto de los Emprendedores de 6 Cifras para Escalar Sin Trabajar Más Horas',
    emotionalLevel: 'alto'
  },
  {
    name: 'Pregunta Provocativa',
    template: '¿[PREGUNTA_INCÓMODA_SOBRE_DOLOR]?',
    example: '¿Por Qué Sigues Ganando Lo Mismo Después de 3 Años de Esfuerzo?',
    emotionalLevel: 'muy_alto'
  },
  {
    name: 'Cómo + Resultado + Aunque',
    template: 'Cómo [RESULTADO] en [TIEMPO] Aunque [OBJECIÓN_COMÚN]',
    example: 'Cómo Duplicar Tus Ingresos en 90 Días Aunque No Tengas Experiencia ni Contactos',
    emotionalLevel: 'alto'
  },
  {
    name: 'Número + Beneficio + Sorpresa',
    template: '[NÚMERO] [ESTRATEGIAS/SECRETOS] para [BENEFICIO] (La #[X] Te Sorprenderá)',
    example: '7 Estrategias para Vender en Automático (La #4 Cambió Mi Vida)',
    emotionalLevel: 'medio'
  },
  {
    name: 'Advertencia Urgente',
    template: 'ADVERTENCIA: No [ACCIÓN] Hasta Que [CONDICIÓN]',
    example: 'ADVERTENCIA: No Inviertas Un Peso Más en Publicidad Hasta Que Veas Esto',
    emotionalLevel: 'muy_alto'
  },
  {
    name: 'El Secreto Oculto',
    template: 'El Secreto #1 para [RESULTADO] que [AUTORIDAD/INDUSTRIA] No Quiere Que Sepas',
    example: 'El Secreto #1 para Vender High Ticket que las Agencias No Quieren Que Sepas',
    emotionalLevel: 'alto'
  },
  {
    name: 'Confesión Personal',
    template: 'Cometí Este Error Durante [TIEMPO] y Me Costó [PÉRDIDA]. Aquí Está Lo Que Aprendí...',
    example: 'Cometí Este Error Durante 3 Años y Me Costó $50,000. Aquí Está Lo Que Aprendí...',
    emotionalLevel: 'muy_alto'
  },
  {
    name: 'Transformación Específica',
    template: 'De [SITUACIÓN_NEGATIVA] a [SITUACIÓN_POSITIVA] en [TIEMPO]: El Método [NOMBRE]',
    example: 'De Freelancer Agotado a Dueño de Agencia de 6 Cifras en 8 Meses: El Método Escala',
    emotionalLevel: 'muy_alto'
  }
];

// Adaptaciones culturales profundas para LATAM (basado en Jürgen Klarić y referentes locales)
export const CULTURAL_ADAPTATIONS = {
  mexico: {
    values: ['familia', 'respeto', 'trabajo_duro', 'superacion', 'lealtad'],
    emotionalTone: 'cálido y cercano, como un amigo que te quiere ver triunfar',
    painAmplifiers: [
      'Tu familia merece que les des más de lo que tú tuviste',
      'Estás cansado de vivir al día sin poder darle gustos a los tuyos',
      'Ves cómo otros avanzan mientras tú sigues en el mismo lugar',
      'Trabajas más que nadie pero el dinero nunca alcanza'
    ],
    desireAmplifiers: [
      'Imagina poder decirle a tu familia: "Vámonos de vacaciones, yo invito"',
      'Ser el orgullo de tus papás, demostrarles que sí se pudo',
      'Tener la libertad de decidir tu tiempo sin pedirle permiso a nadie',
      'Construir algo que tus hijos puedan heredar con orgullo'
    ],
    linguisticPatterns: {
      pronoun: 'tú',
      greetings: ['¿Qué onda?', 'Órale', '¿Cómo estás?'],
      expressions: ['la neta', 'está chido', 'échale ganas', 'sale'],
      avoid: ['coger (usar "tomar")', 'palabras demasiado formales']
    },
    testimonialCities: ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'Cancún'],
    trustBuilders: [
      'Factura fiscal mexicana disponible',
      'Soporte en tu horario (CST)',
      'Comunidad activa de emprendedores mexicanos',
      'Pagos en pesos mexicanos aceptados'
    ]
  },
  colombia: {
    values: ['familia', 'emprendimiento', 'recursividad', 'alegria', 'superacion'],
    emotionalTone: 'motivador y alegre, con energía contagiosa pero sincera',
    painAmplifiers: [
      'Estás cansado de rebuscártela sin ver los frutos de tu esfuerzo',
      'Ves cómo otros están saliendo adelante mientras tú sigues igual',
      'Trabajas como un berraco pero la plata no rinde',
      'Sientes que mereces más pero no sabes cómo lograrlo'
    ],
    desireAmplifiers: [
      'Imagina tener un negocio que te dé para vivir bien y ayudar a tu familia',
      'Ser ese emprendedor exitoso que inspira a otros en tu comunidad',
      'Poder viajar, conocer, darte los gustos que siempre postergaste',
      'Demostrar que con trabajo inteligente sí se puede salir adelante'
    ],
    linguisticPatterns: {
      pronoun: 'tú',
      greetings: ['¿Qué más?', '¿Bien o qué?', 'Quiubo'],
      expressions: ['bacano', 'chimba', 'berraco', 'parce (con moderación)'],
      avoid: ['marica (sensible en contexto)', 'regionalismos muy paisas si es audiencia nacional']
    },
    testimonialCities: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga'],
    trustBuilders: [
      'Pagos en pesos colombianos',
      'Soporte vía WhatsApp directo',
      'Casos de éxito de emprendedores colombianos',
      'Comunidad activa con encuentros presenciales'
    ]
  },
  argentina: {
    values: ['independencia', 'inteligencia', 'calle', 'familia', 'rebeldía_sana'],
    emotionalTone: 'directo y sin vueltas, con la honestidad brutal que los argentinos valoran',
    painAmplifiers: [
      'Laburando como loco para que la inflación se coma todo lo que ganás',
      'Viendo cómo el dólar sube y tu sueldo queda siempre atrás',
      'Atrapado en un sistema que parece diseñado para que no avances',
      'Sabés que sos capaz de más pero las circunstancias no te dejan'
    ],
    desireAmplifiers: [
      'Imaginate generar en dólares y blindarte de la economía argentina',
      'Tener un negocio que no dependa de lo que pase en el país',
      'Ser dueño de tu tiempo y tu guita, sin que nadie te diga qué hacer',
      'Poder planear a largo plazo sin que la incertidumbre te arruine los planes'
    ],
    linguisticPatterns: {
      pronoun: 'vos',
      conjugation: 'voseo (tenés, podés, querés, mirá, fijate)',
      expressions: ['boludo (entre amigos)', 'guita', 'laburo', 'bardear', 'está buenísimo'],
      avoid: ['tuteo (suena falso)', 'coger (usar "agarrar")', 'coche (decir "auto")']
    },
    testimonialCities: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata', 'Mar del Plata'],
    trustBuilders: [
      'Precio en dólares (estabilidad)',
      'Acceso sin restricciones desde Argentina',
      'Comunidad de emprendedores argentinos',
      'Sin necesidad de tarjeta internacional'
    ]
  },
  spain: {
    values: ['profesionalismo', 'calidad', 'equilibrio_vida', 'independencia'],
    emotionalTone: 'profesional pero cercano, sin exageraciones americanas pero con calidez',
    painAmplifiers: [
      'Estás hasta las narices de trabajar para otros sin ver recompensa',
      'Llevas años en el mismo punto mientras ves a otros avanzar',
      'El mercado laboral cada vez más competido y tú sin diferenciarte',
      'Sabes que puedes más pero no encuentras el camino'
    ],
    desireAmplifiers: [
      'Tener un negocio digital profesional que te dé libertad',
      'Trabajar desde donde quieras sin depender de una oficina',
      'Alcanzar la estabilidad económica que mereces por tu esfuerzo',
      'Ser reconocido como experto en tu campo en el mercado europeo'
    ],
    linguisticPatterns: {
      pronoun: 'tú',
      expressions: ['mola', 'curro', 'flipar', 'tío/tía', 'quedada'],
      avoid: ['regionalismos latinoamericanos', 'voseo', 'expresiones mexicanas/argentinas']
    },
    testimonialCities: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'Málaga'],
    trustBuilders: [
      'Factura española/europea',
      'Cumplimiento total RGPD',
      'Soporte en horario español',
      'Casos de éxito del mercado español'
    ]
  },
  chile: {
    values: ['emprendimiento', 'estabilidad', 'familia', 'pragmatismo'],
    emotionalTone: 'cercano y práctico, con humor sutil y enfoque en resultados',
    painAmplifiers: [
      'Trabajando duro pero el sueldo no alcanza para lo que quieres',
      'Viendo cómo el costo de vida sube y tus ingresos no',
      'Sintiéndote estancado en un trabajo que no te llena',
      'Queriendo emprender pero sin saber por dónde partir'
    ],
    desireAmplifiers: [
      'Tener la tranquilidad financiera para planear tu futuro',
      'Un negocio propio que te dé independencia y buenos ingresos',
      'Poder darle a tu familia la vida que merecen',
      'Ser tu propio jefe y manejar tu tiempo como quieras'
    ],
    linguisticPatterns: {
      pronoun: 'tú',
      expressions: ['bacán', 'cachai', 'po', 'al tiro', 'la raja'],
      avoid: ['chilenismos muy cerrados para audiencia general']
    },
    testimonialCities: ['Santiago', 'Valparaíso', 'Concepción', 'La Serena', 'Antofagasta'],
    trustBuilders: [
      'Pagos en pesos chilenos',
      'Soporte en horario chileno',
      'Casos de éxito de emprendedores chilenos',
      'Factura chilena disponible'
    ]
  },
  peru: {
    values: ['familia', 'emprendimiento', 'resiliencia', 'comunidad'],
    emotionalTone: 'cálido y esperanzador, con respeto pero cercanía',
    painAmplifiers: [
      'Trabajas sin parar pero sientes que no avanzas',
      'Ves oportunidades pero no sabes cómo aprovecharlas',
      'Quieres más para tu familia pero el dinero no alcanza',
      'Te esfuerzas más que muchos pero los resultados no llegan'
    ],
    desireAmplifiers: [
      'Construir un negocio que te dé estabilidad y crecimiento',
      'Poder darle a tu familia la vida que sueñas para ellos',
      'Ser un ejemplo de superación en tu comunidad',
      'Tener la libertad de decidir tu propio camino'
    ],
    linguisticPatterns: {
      pronoun: 'tú',
      expressions: ['chévere', 'pata', 'causa', 'ya pe', 'qué tal'],
      avoid: ['jerga muy limeña si es audiencia nacional']
    },
    testimonialCities: ['Lima', 'Arequipa', 'Trujillo', 'Cusco', 'Piura'],
    trustBuilders: [
      'Pagos en soles',
      'Soporte vía WhatsApp',
      'Comunidad de emprendedores peruanos',
      'Casos de éxito locales'
    ]
  },
  usa: {
    values: ['oportunidad', 'familia', 'superacion', 'comunidad_latina'],
    emotionalTone: 'motivador y empático, conectando con la experiencia del inmigrante/latino en USA',
    painAmplifiers: [
      'Viniste a este país buscando más pero sientes que no has llegado',
      'Trabajas más duro que nadie pero parece que no es suficiente',
      'Extrañas a tu familia y quieres demostrarles que valió la pena',
      'El costo de vida te come todo lo que ganas'
    ],
    desireAmplifiers: [
      'Crear un negocio que te dé la vida americana que soñaste',
      'Poder ayudar a tu familia allá y vivir bien aquí',
      'Ser un ejemplo de éxito para tu comunidad latina',
      'Tener estabilidad sin depender de un solo empleo'
    ],
    linguisticPatterns: {
      pronoun: 'tú',
      expressions: ['español neutro con términos en inglés cuando sea natural'],
      avoid: ['regionalismos de un solo país', 'spanglish excesivo']
    },
    testimonialCities: ['Miami', 'Los Angeles', 'Houston', 'New York', 'Chicago', 'Dallas'],
    trustBuilders: [
      'Precios en USD',
      'Soporte en español en tu zona horaria',
      'Comunidad de latinos emprendedores en USA',
      'Funciona desde cualquier estado'
    ]
  },
  multiple: {
    values: ['emprendimiento', 'familia', 'libertad', 'superacion'],
    emotionalTone: 'cálido y universal, conectando con valores compartidos latinos',
    painAmplifiers: [
      'Sientes que trabajas mucho pero no ves los resultados que mereces',
      'Ves cómo otros avanzan y te preguntas qué estás haciendo mal',
      'Quieres más para ti y tu familia pero no sabes cómo lograrlo',
      'Estás cansado de intentar cosas que no funcionan'
    ],
    desireAmplifiers: [
      'Tener un negocio que funcione sin importar dónde estés',
      'La libertad de manejar tu tiempo y tus ingresos',
      'Poder darle a tu familia la vida que merecen',
      'Ser parte de una comunidad de emprendedores que se apoyan'
    ],
    linguisticPatterns: {
      pronoun: 'tú',
      expressions: ['español neutro latinoamericano'],
      avoid: ['voseo', 'regionalismos fuertes', 'expresiones de un solo país']
    },
    testimonialCities: ['México', 'Colombia', 'Argentina', 'Chile', 'Perú', 'España'],
    trustBuilders: [
      'Precios en USD (moneda universal)',
      'Soporte en múltiples zonas horarias',
      'Comunidad internacional de hispanohablantes',
      'Casos de éxito de diferentes países'
    ]
  }
};

export const COUNTRIES = [
  { value: 'mexico', label: 'México', flag: '🇲🇽' },
  { value: 'colombia', label: 'Colombia', flag: '🇨🇴' },
  { value: 'argentina', label: 'Argentina', flag: '🇦🇷' },
  { value: 'spain', label: 'España', flag: '🇪🇸' },
  { value: 'usa', label: 'Estados Unidos', flag: '🇺🇸' },
  { value: 'multiple', label: 'Varios países', flag: '🌎' },
];

export const CONSCIOUSNESS_LEVELS = [
  { 
    level: 0, 
    name: 'Inconsciente', 
    description: 'No sabe que tiene un problema',
    approach: 'Educación + shock + despertar consciencia'
  },
  { 
    level: 1, 
    name: 'Consciente del Problema', 
    description: 'Sabe que tiene un problema pero no conoce soluciones',
    approach: 'Agitar el problema + presentar categoría de solución'
  },
  { 
    level: 2, 
    name: 'Consciente de la Solución', 
    description: 'Conoce que existen soluciones pero no la tuya',
    approach: 'Diferenciación + por qué tu método es mejor'
  },
  { 
    level: 3, 
    name: 'Consciente del Producto', 
    description: 'Conoce tu producto/método pero no ha comprado',
    approach: 'Prueba social + urgencia + eliminación de objeciones'
  },
  { 
    level: 4, 
    name: 'Más Consciente', 
    description: 'Conoce todo, solo necesita el empujón final',
    approach: 'Oferta irresistible + escasez real + CTA directo'
  },
];

export const PILAR_COLORS = {
  0: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
  1: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30' },
  2: { bg: 'bg-accent/10', text: 'text-accent', border: 'border-accent/30' },
  3: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/30' },
};

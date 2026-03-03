import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Ad {
  source: string;
  link: string;
  author: string;
  text: string;
  headline?: string;
  cta?: string;
  days_running?: number;
  views?: number;
  is_referent?: boolean;
}

interface AnalyzedSection {
  order: number;
  type: string;
  original_text: string;
  rhetorical_device: string;
  estimated_duration_seconds: number;
  fixed_elements: string[];
  variable_elements: Array<{
    placeholder: string;
    original_value: string;
    category: string;
  }>;
}

interface StructuralAnalysis {
  total_duration_seconds: number;
  total_sections: number;
  platform: string;
  sections: AnalyzedSection[];
}

interface AuditResult {
  approved: boolean;
  score: number;
  issues: Array<{
    section_order: number;
    severity: string;
    description: string;
    fix_suggestion: string;
  }>;
  final_script: string;
  pending_items: string[];
}

interface ModeledScript {
  content_number: number;
  referente: string;
  platform: string;
  link: string;
  hook_1: string;
  hook_2: string;
  cuerpo: string;
  cta_1: string;
  cta_2: string;
  quality_score: number;
  attempts: number;
  needs_review: boolean;
  pending_items: string[];
}

// ─── Claude API Call Helper ──────────────────────────────────────────────────

async function callClaude(
  apiKey: string,
  model: string,
  maxTokens: number,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error: ${response.status} — ${errText}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? "";
}

// ─── JSON Parser (triple-layer fallback) ─────────────────────────────────────

function parseJsonResponse<T>(raw: string): T {
  try {
    return JSON.parse(raw);
  } catch {
    const stripped = raw
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?\s*```$/, "")
      .trim();
    try {
      return JSON.parse(stripped);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/) || raw.match(/\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error(`Could not parse JSON: ${raw.slice(0, 300)}`);
    }
  }
}

// ─── Step 1: Analyze Ad Structure (Sonnet) ───────────────────────────────────

const ANALYZE_SYSTEM_PROMPT = `Eres un analista de estructura de anuncios publicitarios. Tu trabajo es descomponer un anuncio en sus secciones estructurales EXACTAS.

Para cada seccion identifica:
1. TIPO: hook | problema | agitacion | solucion | prueba_social | beneficio | urgencia | CTA | transicion | historia | dato_impactante | pregunta_retorica | otro
2. TEXTO_ORIGINAL: el texto exacto de esa seccion (palabra por palabra)
3. RECURSO_RETORICO: que tecnica usa (pregunta directa, historia personal, dato estadistico, comparacion, metafora, imperativo, etc.)
4. DURACION_ESTIMADA: en segundos (basado en velocidad de lectura ~150 palabras/min)
5. ELEMENTOS_FIJOS: palabras/frases que son parte de la estructura y NO deben cambiar (conectores, transiciones, muletillas retoricas)
6. ELEMENTOS_VARIABLES: datos especificos que SI se deben sustituir (nombre del producto, nicho, problema especifico, precio, URL, etc.)

Responde SOLO en JSON valido con este formato:
{
  "total_duration_seconds": number,
  "total_sections": number,
  "platform": "facebook" | "instagram" | "tiktok",
  "sections": [
    {
      "order": 1,
      "type": "hook",
      "original_text": "...",
      "rhetorical_device": "pregunta directa",
      "estimated_duration_seconds": 5,
      "fixed_elements": ["¿Sabias que", "?"],
      "variable_elements": [
        { "placeholder": "{{dato_impactante}}", "original_value": "el 80% de los negocios fracasan en el primer año", "category": "estadistica_del_problema" }
      ]
    }
  ]
}`;

async function analyzeAdStructure(
  ad: Ad,
  apiKey: string
): Promise<StructuralAnalysis> {
  const userMsg = `Descompone este anuncio de ${ad.source} en sus secciones estructurales:

AUTOR/PAGINA: ${ad.author}
${ad.headline ? `HEADLINE: ${ad.headline}` : ""}
${ad.cta ? `CTA ORIGINAL: ${ad.cta}` : ""}
${ad.days_running ? `DIAS CORRIENDO: ${ad.days_running}` : ""}
${ad.views ? `VIEWS: ${ad.views.toLocaleString()}` : ""}

TEXTO COMPLETO DEL ANUNCIO:
${ad.text}`;

  const raw = await callClaude(
    apiKey,
    "claude-sonnet-4-6",
    2000,
    ANALYZE_SYSTEM_PROMPT,
    userMsg
  );

  return parseJsonResponse<StructuralAnalysis>(raw);
}

// ─── Step 2: Model Sections (Opus) ───────────────────────────────────────────

const MODEL_SECTION_SYSTEM_PROMPT = `Eres un experto en modelado de anuncios. Tu trabajo es TRADUCIR una seccion de un anuncio ganador al contexto de un experto especifico.

REGLAS ABSOLUTAS:
1. CONSERVA la estructura EXACTA de la seccion original
2. CONSERVA todos los elementos fijos (conectores, transiciones, muletillas retoricas)
3. SOLO sustituye los elementos variables con datos del DNA del experto
4. CONSERVA la misma duracion aproximada (±2 segundos)
5. CONSERVA el mismo recurso retorico (si el original usa una pregunta, tu usas una pregunta)
6. CONSERVA el mismo tono emocional y nivel de intensidad
7. Si el DNA no contiene informacion para sustituir un elemento variable, usa [PENDIENTE: descripcion de lo que falta] — NUNCA inventes datos
8. El resultado debe aportar VALOR REAL al espectador, no ser generico
9. Escrito para ser HABLADO en video. Frases cortas, directas, conversacionales
10. Español latinoamericano. Sin corporativismos. Natural y directo

PROCESO:
1. Lee la seccion original y sus elementos fijos/variables
2. Lee el DNA del experto (personalidad, audiencia, producto)
3. Sustituye SOLO los elementos variables usando datos del DNA
4. Verifica que la estructura se mantuvo intacta
5. Verifica que la duracion es similar

Responde SOLO con el texto modelado de la seccion. Nada mas.`;

async function modelAdSection(
  section: AnalyzedSection,
  dnaContext: string,
  trainingContext: string,
  apiKey: string,
  auditFeedback?: string
): Promise<string> {
  let userMsg = `=== SECCION A MODELAR ===
Tipo: ${section.type}
Recurso retorico: ${section.rhetorical_device}
Duracion estimada: ${section.estimated_duration_seconds}s

TEXTO ORIGINAL:
${section.original_text}

ELEMENTOS FIJOS (NO cambiar):
${section.fixed_elements.join(", ") || "Ninguno"}

ELEMENTOS VARIABLES (sustituir con datos del DNA):
${section.variable_elements.map((v) => `- ${v.placeholder}: "${v.original_value}" (categoria: ${v.category})`).join("\n")}

=== DNA DEL EXPERTO ===
${dnaContext}`;

  if (trainingContext) {
    userMsg += `\n\n${trainingContext}`;
  }

  if (auditFeedback) {
    userMsg += `\n\n=== FEEDBACK DE AUDITORIA (corrige estos problemas) ===\n${auditFeedback}`;
  }

  return await callClaude(
    apiKey,
    "claude-opus-4-6",
    2000,
    MODEL_SECTION_SYSTEM_PROMPT,
    userMsg
  );
}

// ─── Step 2b: Generate Hooks and CTAs (Opus) ────────────────────────────────

const HOOKS_CTA_SYSTEM_PROMPT = `Eres un copywriter experto en video ads para Latinoamerica. Basandote en el analisis estructural de un anuncio ganador y el DNA del experto, genera:

1. HOOK 1: Un gancho completamente NUEVO usando la MISMA TECNICA retorica del hook original, pero con datos del DNA del experto
2. HOOK 2: Un segundo gancho usando una tecnica DIFERENTE pero igualmente efectiva
3. CTA 1: Un llamado a la accion para el producto/servicio del experto
4. CTA 2: Un segundo CTA con enfoque diferente

REGLAS:
- Escrito para ser HABLADO en video
- Español latinoamericano, directo y natural
- Incluye [DIRECCIONES VISUALES] cuando aplique
- CERO texto copiado del original
- Si falta informacion del DNA, usa [PENDIENTE: descripcion]

Responde en JSON:
{
  "hook_1": "texto completo del hook 1",
  "hook_2": "texto completo del hook 2",
  "cta_1": "texto completo del CTA 1",
  "cta_2": "texto completo del CTA 2"
}`;

async function generateHooksAndCTAs(
  analysis: StructuralAnalysis,
  dnaContext: string,
  trainingContext: string,
  apiKey: string
): Promise<{ hook_1: string; hook_2: string; cta_1: string; cta_2: string }> {
  const hookSection = analysis.sections.find((s) => s.type === "hook");
  const ctaSection = analysis.sections.find((s) => s.type === "CTA");

  const userMsg = `=== ANALISIS DEL ANUNCIO ORIGINAL ===
Plataforma: ${analysis.platform}
Total secciones: ${analysis.total_sections}
Duracion total: ${analysis.total_duration_seconds}s

HOOK ORIGINAL:
${hookSection ? `Tipo: ${hookSection.type}\nRecurso: ${hookSection.rhetorical_device}\nTexto: ${hookSection.original_text}` : "No identificado"}

CTA ORIGINAL:
${ctaSection ? `Tipo: ${ctaSection.type}\nRecurso: ${ctaSection.rhetorical_device}\nTexto: ${ctaSection.original_text}` : "No identificado"}

=== DNA DEL EXPERTO ===
${dnaContext}

${trainingContext ? trainingContext : ""}`;

  const raw = await callClaude(
    apiKey,
    "claude-opus-4-6",
    2000,
    HOOKS_CTA_SYSTEM_PROMPT,
    userMsg
  );

  return parseJsonResponse<{
    hook_1: string;
    hook_2: string;
    cta_1: string;
    cta_2: string;
  }>(raw);
}

// ─── Step 3: Audit Script (Sonnet) ───────────────────────────────────────────

const AUDIT_SYSTEM_PROMPT = `Eres un auditor de calidad de guiones modelados. Tu trabajo es comparar el guion modelado con el ad original y verificar que se cumplan TODAS las reglas.

CHECKLIST DE AUDITORIA:
□ ¿Se conservo el orden de TODAS las secciones?
□ ¿Se conservaron las transiciones entre secciones?
□ ¿La duracion total es similar al original (±10%)?
□ ¿Se conservaron los recursos retoricos de cada seccion?
□ ¿Solo se sustituyeron los elementos variables?
□ ¿Los elementos fijos estan intactos?
□ ¿El guion aporta valor real (no es generico)?
□ ¿Hay datos inventados que no estan en el DNA? (FALLO CRITICO)
□ ¿Hay marcadores [PENDIENTE] que necesitan atencion del usuario?

Responde en JSON:
{
  "approved": boolean,
  "score": number (0-100),
  "issues": [
    {
      "section_order": number,
      "severity": "critical" | "warning" | "suggestion",
      "description": "...",
      "fix_suggestion": "..."
    }
  ],
  "final_script": "el guion ensamblado completo, corregido si hubo issues no-criticos",
  "pending_items": ["lista de [PENDIENTE] que el usuario debe completar"]
}

Si el score es < 70 o hay issues "critical", marca approved: false.`;

async function auditScript(
  modeledBody: string,
  hooks: { hook_1: string; hook_2: string; cta_1: string; cta_2: string },
  originalAd: Ad,
  analysis: StructuralAnalysis,
  apiKey: string
): Promise<AuditResult> {
  const fullScript = `HOOK 1:\n${hooks.hook_1}\n\nHOOK 2:\n${hooks.hook_2}\n\nCUERPO:\n${modeledBody}\n\nCTA 1:\n${hooks.cta_1}\n\nCTA 2:\n${hooks.cta_2}`;

  const userMsg = `=== ANUNCIO ORIGINAL ===
Plataforma: ${originalAd.source}
Autor: ${originalAd.author}
Texto original:
${originalAd.text}

=== ANALISIS ESTRUCTURAL ===
Secciones: ${analysis.total_sections}
Duracion original: ${analysis.total_duration_seconds}s
Secciones detectadas: ${analysis.sections.map((s) => `${s.order}. ${s.type} (${s.rhetorical_device})`).join(", ")}

=== GUION MODELADO ===
${fullScript}`;

  const raw = await callClaude(
    apiKey,
    "claude-sonnet-4-6",
    1500,
    AUDIT_SYSTEM_PROMPT,
    userMsg
  );

  return parseJsonResponse<AuditResult>(raw);
}

// ─── Process One Ad (full pipeline) ──────────────────────────────────────────

async function processOneAd(
  ad: Ad,
  index: number,
  dnaContext: string,
  trainingContext: string,
  apiKey: string,
  maxRetries: number,
  minScore: number
): Promise<ModeledScript> {
  // Step 1: Analyze structure
  const analysis = await analyzeAdStructure(ad, apiKey);

  // Get body sections (everything except hook and CTA)
  const bodySections = analysis.sections.filter(
    (s) => s.type !== "hook" && s.type !== "CTA"
  );

  let modeledBody = "";
  let hooks = { hook_1: "", hook_2: "", cta_1: "", cta_2: "" };
  let audit: AuditResult = {
    approved: false,
    score: 0,
    issues: [],
    final_script: "",
    pending_items: [],
  };
  let attempts = 0;

  do {
    attempts++;
    const auditFeedback =
      attempts > 1
        ? audit.issues
            .map(
              (i) =>
                `[${i.severity}] Seccion ${i.section_order}: ${i.description}. Sugerencia: ${i.fix_suggestion}`
            )
            .join("\n")
        : undefined;

    // Step 2a: Model body sections in parallel
    const modeledSections = await Promise.all(
      bodySections.map((section) =>
        modelAdSection(
          section,
          dnaContext,
          trainingContext,
          apiKey,
          auditFeedback
        )
      )
    );

    modeledBody = modeledSections.join("\n\n");

    // Step 2b: Generate hooks and CTAs
    hooks = await generateHooksAndCTAs(
      analysis,
      dnaContext,
      trainingContext,
      apiKey
    );

    // Step 3: Audit
    audit = await auditScript(modeledBody, hooks, ad, analysis, apiKey);
  } while (!audit.approved && audit.score < minScore && attempts < maxRetries);

  const needsReview = !audit.approved || audit.score < minScore;

  return {
    content_number: index + 1,
    referente: `Ad de ${ad.author} — ${ad.source} — Tecnica: ${analysis.sections.map((s) => s.rhetorical_device).slice(0, 3).join(" + ")}`,
    platform: ad.source,
    link: ad.link,
    hook_1: hooks.hook_1,
    hook_2: hooks.hook_2,
    cuerpo: audit.final_script || modeledBody,
    cta_1: hooks.cta_1,
    cta_2: hooks.cta_2,
    quality_score: audit.score,
    attempts,
    needs_review: needsReview,
    pending_items: audit.pending_items || [],
  };
}

// ─── Main Handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "ANTHROPIC_API_KEY not configured" }, 500);
    }

    const {
      ads,
      dna_expert,
      dna_audience,
      dna_product,
      training_context = "",
      max_retries = 2,
      min_quality_score = 70,
    } = await req.json();

    if (!ads || !Array.isArray(ads) || ads.length === 0) {
      return jsonResponse({ error: "No ads provided" }, 400);
    }

    const dnaContext = [
      dna_expert
        ? `=== DNA EXPERTO ===\n${dna_expert}`
        : "",
      dna_audience
        ? `=== DNA AUDIENCIA ===\n${dna_audience}`
        : "",
      dna_product
        ? `=== DNA PRODUCTO ===\n${dna_product}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const startTime = Date.now();
    const results: ModeledScript[] = [];
    const BATCH_SIZE = 3;

    // Process ads in batches of 3
    for (let i = 0; i < ads.length; i += BATCH_SIZE) {
      const batch = ads.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((ad: Ad, batchIdx: number) =>
          processOneAd(
            ad,
            i + batchIdx,
            dnaContext,
            training_context,
            apiKey,
            max_retries,
            min_quality_score
          ).catch((err) => {
            console.error(`Error processing ad ${i + batchIdx}:`, err);
            return {
              content_number: i + batchIdx + 1,
              referente: `Ad de ${ad.author} — ERROR`,
              platform: ad.source || "unknown",
              link: ad.link || "",
              hook_1: "",
              hook_2: "",
              cuerpo: `Error procesando este anuncio: ${String(err)}`,
              cta_1: "",
              cta_2: "",
              quality_score: 0,
              attempts: 1,
              needs_review: true,
              pending_items: ["Error en procesamiento"],
            } as ModeledScript;
          })
        )
      );
      results.push(...batchResults);
    }

    const processingTime = Date.now() - startTime;
    const validScripts = results.filter((r) => r.quality_score > 0);
    const avgScore =
      validScripts.length > 0
        ? validScripts.reduce((sum, r) => sum + r.quality_score, 0) /
          validScripts.length
        : 0;
    const totalRetries = results.reduce((sum, r) => sum + r.attempts - 1, 0);

    // Build plain-text scripts for Google Doc / Telegram fallback
    const scriptsText = results
      .map(
        (s) =>
          `CONTENIDO #${s.content_number}\n\nREFERENTE\n${s.link}\n\nHOOK 1\n${s.hook_1}\n\nHOOK 2\n${s.hook_2}\n\nCUERPO\n${s.cuerpo}\n\nCTA 1\n${s.cta_1}\n\nCTA 2\n${s.cta_2}\n\n${s.needs_review ? "⚠️ NECESITA REVISION MANUAL (Score: " + s.quality_score + "/100)" : "✅ Score: " + s.quality_score + "/100"}\n\n---`
      )
      .join("\n\n");

    return jsonResponse({
      scripts: results,
      scripts_text: scriptsText,
      total: results.length,
      stats: {
        total_ads_processed: ads.length,
        average_quality_score: Math.round(avgScore),
        retries_used: totalRetries,
        processing_time_ms: processingTime,
      },
    });
  } catch (err) {
    console.error("pipeline-model-ads error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

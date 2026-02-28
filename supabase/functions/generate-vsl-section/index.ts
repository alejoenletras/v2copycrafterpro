/**
 * generate-vsl-section edge function
 *
 * Generates a single VSL section using Claude as an expert copywriter.
 * Designed for section-by-section VSL creation with DNA context.
 *
 * POST body: {
 *   dna_context: { personality?, audience?, product? },
 *   section_id: string,
 *   section_name: string,
 *   section_number: number,
 *   section_objective: string,
 *   user_instructions: string,
 *   reference_text?: string,
 *   previous_sections?: { name: string, content: string }[]
 * }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── System prompt: VSL expert copywriter ───────────────────────────────────

const SYSTEM_PROMPT = `Eres un copywriter de VSLs (Video Sales Letters) de élite con más de 15 años creando guiones de venta de alta conversión para el mercado hispano.

## TU FILOSOFÍA DE VSL:
- El VSL NO es literatura — es una conversación de ventas escrita. Debe sonar como HABLAS, no como escribes.
- Emoción PRIMERO, lógica DESPUÉS. La gente compra con emoción y justifica con lógica.
- Especificidad VENCE generalidad. "Perder peso" es débil. "Perder 8 kilos en 21 días sin contar calorías" es fuerte.
- El enemigo NO es la competencia — es la falsa creencia que mantiene al prospecto atrapado.
- Prueba social es oro. Un testimonio específico vale más que 1000 palabras tuyas.

## PROGRESIÓN EMOCIONAL DEL VSL:
Cada sección mueve la aguja emocional del lector:
Escepticismo → Curiosidad → Esperanza → Deseo → Urgencia → Acción

## TÉCNICAS QUE DOMINAS:
1. **Especificidad extrema**: "1,847 personas en los últimos 90 días" vs "muchas personas han tenido éxito"
2. **Contraste antes/después**: Pintar el dolor actual vívidamente, luego el futuro deseado específicamente
3. **Enemigo común**: Identificar el villano (la falsa creencia o método fallido), unirte con el lector contra él
4. **Prueba acumulativa**: Múltiples pruebas pequeñas que se apilan (testimonios + datos + lógica + autoridad)
5. **Lenguaje sensorial**: "Sentirás ese peso salir de tus hombros" vs "te sentirás bien"
6. **Bucles abiertos**: Abrir preguntas que solo se responden más adelante para mantener curiosidad activa

## REGLAS DE FORMATO:
- Escribe siempre en ESPAÑOL
- Párrafos CORTOS (2-4 líneas máximo) — esto es para video/lectura rápida
- Puntuación que favorece lectura natural y ritmo de habla
- Saltos de línea para respiración
- Tono directo, visceral, de alta conversión — NUNCA corporativo ni suave
- NUNCA inventes datos, resultados o testimonios que no estén en el contexto proporcionado
- Si necesitas un dato que no tienes, escríbelo como [INSERTAR: descripción del dato necesario]

## REGLA DE CONTINUIDAD:
Cuando se te proporcionen secciones anteriores del VSL, mantén la coherencia narrativa. Cada sección debe fluir naturalmente de la anterior. No repitas puntos ya establecidos — constrúyelos.`;

// ─── Handler ────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicApiKey) {
    return jsonResponse(
      { success: false, error: "ANTHROPIC_API_KEY no configurada" },
      500
    );
  }

  try {
    const {
      dna_context,
      section_id,
      section_name,
      section_number,
      section_objective,
      user_instructions,
      reference_text,
      previous_sections,
    } = await req.json();

    if (!section_id || !section_name) {
      return jsonResponse(
        { success: false, error: "section_id y section_name son requeridos" },
        400
      );
    }

    // ── Build user message ──────────────────────────────────────────────

    const parts: string[] = [];

    // DNA context
    const dnaBlock = buildDnaBlock(dna_context);
    if (dnaBlock) parts.push(dnaBlock);

    // Previous sections context
    if (previous_sections && previous_sections.length > 0) {
      const prevText = previous_sections
        .map(
          (s: { name: string; content: string }) =>
            `### ${s.name}\n${s.content}`
        )
        .join("\n\n---\n\n");

      // Limit previous context to ~15k chars to leave room for generation
      const trimmed = prevText.slice(0, 15000);
      parts.push(
        `## SECCIONES ANTERIORES DEL VSL (mantén coherencia narrativa)\n\n${trimmed}`
      );
    }

    // User instructions (product info, offer details, specific notes)
    if (user_instructions?.trim()) {
      parts.push(
        `## INSTRUCCIONES DEL USUARIO (información del producto, oferta y directrices)\n\n${user_instructions.trim()}`
      );
    }

    // Optional reference text (YouTube transcript, document, etc.)
    if (reference_text?.trim()) {
      const refTrimmed = reference_text.trim().slice(0, 20000);
      parts.push(
        `## MATERIAL DE REFERENCIA (usa como fuente de datos, tono y contexto)\n\n${refTrimmed}`
      );
    }

    // The section to generate
    parts.push(`## SECCIÓN A GENERAR

**Sección ${section_number}: ${section_name}**

Objetivo: ${section_objective}

Escribe ÚNICAMENTE el texto de esta sección del VSL. No incluyas encabezados como "Sección X:" ni metadatos. Escribe el guion directamente, listo para ser leído/grabado.`);

    const userMessage = parts.join("\n\n───────────────────────────────────\n\n");

    // ── Call Claude ─────────────────────────────────────────────────────

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API error: ${response.status} — ${errText}`);
    }

    const aiData = await response.json();
    const content = aiData.content?.[0]?.text ?? "";

    if (!content) throw new Error("Claude no generó contenido");

    return jsonResponse({ success: true, section_id, content });
  } catch (err) {
    console.error("generate-vsl-section error:", err);
    return jsonResponse(
      { success: false, error: (err as Error).message },
      500
    );
  }
});

// ─── DNA context builder ────────────────────────────────────────────────────

function buildDnaBlock(ctx?: Record<string, any>): string {
  if (!ctx) return "";

  const sections: string[] = [];

  if (ctx.personality) {
    const p = ctx.personality;
    const lines = [
      p.about && `  - Quién soy: ${p.about}`,
      p.voice && `  - Voz/Estilo: ${p.voice}`,
      p.credentials && `  - Credenciales: ${p.credentials}`,
      p.forbidden_words && `  - NUNCA usar estas palabras/estilos: ${p.forbidden_words}`,
    ]
      .filter(Boolean)
      .join("\n");
    if (lines) {
      sections.push(
        `### PERSONALIDAD${p.name ? ` — ${p.name}` : ""}\n${lines}`
      );
    }
  }

  if (ctx.audience) {
    const a = ctx.audience;
    const lines = [
      a.ideal_client && `  - Cliente ideal: ${a.ideal_client}`,
      a.core_belief && `  - Creencia/frustración central: ${a.core_belief}`,
      a.testimonials && `  - Prueba social: ${a.testimonials}`,
      a.keywords && `  - Su lenguaje/keywords: ${a.keywords}`,
    ]
      .filter(Boolean)
      .join("\n");
    if (lines) {
      sections.push(
        `### AUDIENCIA${a.name ? ` — ${a.name}` : ""}\n${lines}`
      );
    }
  }

  if (ctx.product) {
    const pr = ctx.product;
    const lines = [
      pr.main_problem && `  - Problema que resuelvo: ${pr.main_problem}`,
      pr.solution_promise && `  - Promesa de solución: ${pr.solution_promise}`,
      pr.irresistible_offer && `  - La oferta: ${pr.irresistible_offer}`,
      pr.keywords && `  - Keywords del producto: ${pr.keywords}`,
    ]
      .filter(Boolean)
      .join("\n");
    if (lines) {
      sections.push(
        `### PRODUCTO${pr.name ? ` — ${pr.name}` : ""}\n${lines}`
      );
    }
  }

  if (sections.length === 0) return "";

  return `## DNA DE CAMPAÑA\nUsa este DNA como base para tono, audiencia y producto. Escribe con la VOZ de la Personalidad, PARA la Audiencia descrita, SOBRE el Producto indicado.\n\n${sections.join(
    "\n\n"
  )}`;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

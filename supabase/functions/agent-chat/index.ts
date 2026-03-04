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

const OBJECTIVES: Record<string, string> = {
  captacion: "Captar nuevos leads/prospectos fríos. Generar registros, descargas, suscripciones.",
  agitacion: "Agitar el dolor de la audiencia para que deseen la solución. Contenido emocional, problem-aware.",
  remarketing: "Retargetear personas que ya vieron contenido previo. Prueba social, urgencia, objeciones.",
  compra: "Empujar directamente a la compra/conversión. Ofertas, descuentos, escasez.",
  reconocimiento: "Generar awareness y confianza con la marca. Storytelling, educación, autoridad.",
};

function buildSystemPrompt(
  dnaContext: { expert: string; audience: string; product: string },
  trainingContext?: string,
): string {
  let prompt = `Eres Hooq, un estratega creativo de anuncios de video para Latinoamérica. Hablas en español casual y directo. Tu trabajo es entender qué tipo de campaña quiere crear el usuario, hacer preguntas inteligentes, y decidir cuándo tienes suficiente contexto para lanzar la búsqueda y modelado de anuncios.

## DNA DEL USUARIO

### Experto (personalidad/voz):
${dnaContext.expert || "(No configurado)"}

### Audiencia (cliente ideal):
${dnaContext.audience || "(No configurado)"}

### Producto (oferta):
${dnaContext.product || "(No configurado)"}
`;

  if (trainingContext) {
    prompt += `\n## PATRONES DE ENTRENAMIENTO (preferencias aprendidas del usuario)\n${trainingContext}\n`;
  }

  prompt += `
## OBJETIVOS VÁLIDOS
${Object.entries(OBJECTIVES).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

## TU FLUJO DE CONVERSACIÓN
1. Si el usuario no ha seleccionado un objetivo, pregunta cuál es el objetivo de la campaña
2. Pregunta cuál es el CTA (a dónde quiere dirigir al público: link, WhatsApp, landing, etc.)
3. Pregunta si tiene algún anuncio o página de referencia que le guste (opcional)
4. Haz 1-2 preguntas inteligentes basadas en el DNA disponible (ángulo específico, dolor a atacar, enfoque creativo)
5. Cuando tengas suficiente contexto (mínimo: objetivo + CTA + entendimiento del producto/nicho), genera los parámetros de búsqueda

## REGLAS
- Respuestas CORTAS: 2-4 oraciones máximo. Sin bullet points largos.
- Tono directo y conversacional, como un compañero creativo
- Si el DNA ya tiene información relevante (producto, audiencia, etc.), NO la pidas de nuevo — úsala
- Nunca inventes datos del usuario
- Si el usuario dice algo ambiguo, haz UNA pregunta para clarificar
- Cuando estés listo para ejecutar, incluye el campo "action" con los parámetros

## FORMATO DE RESPUESTA
Responde SIEMPRE en JSON válido con esta estructura exacta:
{
  "message": "tu respuesta al usuario aquí",
  "action": null,
  "suggested_buttons": null
}

Cuando estés listo para ejecutar la búsqueda:
{
  "message": "tu mensaje confirmando que vas a buscar",
  "action": {
    "type": "execute",
    "params": {
      "search_query": "keyword principal para buscar ads",
      "search_mode": "keyword",
      "countries": ["CO", "MX", "AR"],
      "max_ads": 15,
      "objective": "captacion",
      "cta": "el CTA del usuario",
      "modeling_instructions": "instrucciones adicionales basadas en la conversación: ángulo, tono, enfoque específico"
    }
  },
  "suggested_buttons": null
}

Para ofrecer botones de selección rápida:
{
  "message": "tu pregunta",
  "action": null,
  "suggested_buttons": [{"label": "Opción 1", "value": "valor1"}, {"label": "Opción 2", "value": "valor2"}]
}`;

  return prompt;
}

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
      messages = [],
      dna_context = { expert: "", audience: "", product: "" },
      objective,
      cta,
      references = [],
      training_context,
    } = await req.json();

    // Build system prompt with DNA and training context
    const systemPrompt = buildSystemPrompt(dna_context, training_context);

    // Build Claude messages from conversation history
    // Inject objective/cta/references as context if provided
    const claudeMessages: Array<{ role: string; content: string }> = [];

    // Add context preamble as first user message if we have metadata
    let contextPreamble = "";
    if (objective) contextPreamble += `[Objetivo seleccionado: ${objective}] `;
    if (cta) contextPreamble += `[CTA: ${cta}] `;
    if (references.length > 0) {
      contextPreamble += `\n[Referencias del usuario:\n${references.map((r: string, i: number) => `Ref ${i + 1}: ${r.substring(0, 1500)}`).join("\n")}\n]`;
    }

    // Map messages to Claude format, prepending context to first user message
    let contextInjected = false;
    for (const msg of messages) {
      if (msg.role === "system") continue; // Skip system messages
      const role = msg.role === "user" ? "user" : "assistant";
      let content = msg.content;

      if (!contextInjected && role === "user" && contextPreamble) {
        content = contextPreamble + "\n" + content;
        contextInjected = true;
      }

      claudeMessages.push({ role, content });
    }

    // If no messages yet (initial load), add a minimal user prompt
    if (claudeMessages.length === 0) {
      claudeMessages.push({
        role: "user",
        content: contextPreamble || "Hola, quiero crear anuncios.",
      });
    }

    // Ensure messages alternate correctly (Claude requires user/assistant alternation)
    const sanitizedMessages: Array<{ role: string; content: string }> = [];
    for (let i = 0; i < claudeMessages.length; i++) {
      const msg = claudeMessages[i];
      const prev = sanitizedMessages[sanitizedMessages.length - 1];
      if (prev && prev.role === msg.role) {
        // Merge consecutive same-role messages
        prev.content += "\n" + msg.content;
      } else {
        sanitizedMessages.push({ ...msg });
      }
    }

    // Ensure first message is from user
    if (sanitizedMessages.length > 0 && sanitizedMessages[0].role !== "user") {
      sanitizedMessages.unshift({ role: "user", content: "Hola" });
    }

    // Limit context window: keep last 20 messages
    const trimmedMessages = sanitizedMessages.slice(-20);

    console.log(`agent-chat: ${trimmedMessages.length} messages, objective=${objective}, cta=${cta}`);

    // Call Claude Sonnet
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6-20250514",
        max_tokens: 1500,
        system: systemPrompt,
        messages: trimmedMessages,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error("Claude API error:", claudeRes.status, errText);
      return jsonResponse({ error: `Claude API error: ${claudeRes.status}` }, 502);
    }

    const claudeData = await claudeRes.json();
    const rawText = claudeData.content?.[0]?.text || "";

    console.log("Claude raw response:", rawText.substring(0, 300));

    // Parse JSON response from Claude
    let parsed: { message: string; action?: unknown; suggested_buttons?: unknown };
    try {
      // Try to extract JSON from the response (Claude might add markdown code blocks)
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: treat the whole response as a message
        parsed = { message: rawText, action: null, suggested_buttons: null };
      }
    } catch {
      // If JSON parsing fails, use the raw text as the message
      parsed = { message: rawText, action: null, suggested_buttons: null };
    }

    return jsonResponse({
      message: parsed.message || rawText,
      action: parsed.action || null,
      suggested_buttons: parsed.suggested_buttons || null,
    });
  } catch (err) {
    console.error("agent-chat error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

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
  let prompt = `Eres Hooq, un estratega creativo de anuncios de video para Latinoamérica. Hablas en español casual y directo. Tu trabajo es analizar el brief del usuario y decidir la mejor estrategia para buscar y modelar anuncios.

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

## TU TAREA
El usuario te envía un brief con: objetivo de campaña, CTA, instrucciones creativas, y opcionalmente documentos y referencias.

IMPORTANTE: SIEMPRE debes retornar "action" con type "execute". Tu trabajo principal es generar un buen "search_query" para buscar anuncios ganadores en Facebook Ads Library.

1. Analiza el brief, DNA del usuario y documentos adjuntos
2. Genera un "search_query" inteligente — debe ser un keyword de nicho/industria (ej: "marketing digital", "coaching fitness", "ecommerce dropshipping", "bienes raices")
3. Elige "countries" relevantes (default: ["CO", "MX", "AR"])
4. Combina las instrucciones del usuario + contexto de documentos en "modeling_instructions"
5. SIEMPRE retorna action con type "execute". NUNCA retornes action: null

## REGLAS
- SIEMPRE retorna "action" con "type": "execute" y params completos
- Respuestas CORTAS: 1-2 oraciones sobre tu estrategia de búsqueda
- Si el DNA tiene info del producto/nicho, úsala para un search_query más preciso
- El search_query debe ser genérico del nicho (NO el nombre del producto del usuario, sino el nicho/industria donde compite)

## FORMATO DE RESPUESTA
Responde SIEMPRE en JSON válido con esta estructura EXACTA. SIEMPRE incluye action con type execute:
{
  "message": "Tu mensaje corto confirmando la estrategia de búsqueda",
  "action": {
    "type": "execute",
    "params": {
      "search_query": "keyword del nicho para buscar en Facebook Ads Library",
      "search_mode": "keyword",
      "countries": ["CO", "MX", "AR"],
      "max_ads": 15,
      "objective": "captacion",
      "cta": "el CTA del usuario o string vacío",
      "modeling_instructions": "todas las instrucciones del usuario + contexto de documentos para modelar los guiones"
    }
  },
  "suggested_buttons": null
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
    const claudeMessages: Array<{ role: string; content: string }> = [];

    // Add context preamble
    let contextPreamble = "";
    if (objective) contextPreamble += `[Objetivo seleccionado: ${objective}] `;
    if (cta) contextPreamble += `[CTA: ${cta}] `;
    if (references.length > 0) {
      contextPreamble += `\n[Referencias del usuario:\n${references.map((r: string, i: number) => `Ref ${i + 1}: ${r.substring(0, 1500)}`).join("\n")}\n]`;
    }

    // Map messages to Claude format
    let contextInjected = false;
    for (const msg of messages) {
      if (msg.role === "system") continue;
      const role = msg.role === "user" ? "user" : "assistant";
      let content = msg.content;

      if (!contextInjected && role === "user" && contextPreamble) {
        content = contextPreamble + "\n" + content;
        contextInjected = true;
      }

      claudeMessages.push({ role, content });
    }

    // If no messages, add default
    if (claudeMessages.length === 0) {
      claudeMessages.push({
        role: "user",
        content: contextPreamble || "Hola, quiero crear anuncios.",
      });
    }

    // Sanitize: ensure alternation
    const sanitizedMessages: Array<{ role: string; content: string }> = [];
    for (let i = 0; i < claudeMessages.length; i++) {
      const msg = claudeMessages[i];
      const prev = sanitizedMessages[sanitizedMessages.length - 1];
      if (prev && prev.role === msg.role) {
        prev.content += "\n" + msg.content;
      } else {
        sanitizedMessages.push({ ...msg });
      }
    }

    // Ensure first message is from user
    if (sanitizedMessages.length > 0 && sanitizedMessages[0].role !== "user") {
      sanitizedMessages.unshift({ role: "user", content: "Hola" });
    }

    // Limit context window
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

    // Parse JSON response
    let parsed: { message: string; action?: unknown; suggested_buttons?: unknown };
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = { message: rawText, action: null, suggested_buttons: null };
      }
    } catch {
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

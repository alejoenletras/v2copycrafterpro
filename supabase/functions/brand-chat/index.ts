import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { SALEADS_SYSTEM_PROMPT } from "./brands/saleads.ts";
import { MARCO_SYSTEM_PROMPT } from "./brands/marco.ts";
import { Voice, DEFAULT_VOICE, isVoice } from "./brands/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Mapa de voz a system prompt correspondiente.
 * Para agregar una nueva voz: añade el literal al tipo Voice en brands/types.ts,
 * crea el archivo brands/<voz>.ts, e incluye el mapping aquí.
 */
const VOICE_TO_PROMPT: Record<Voice, string> = {
  saleads: SALEADS_SYSTEM_PROMPT,
  marco: MARCO_SYSTEM_PROMPT,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, dnas, voice: rawVoice } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");

    // Resolver voz con retrocompatibilidad:
    // - Si no viene el campo, usar DEFAULT_VOICE (saleads).
    // - Si viene pero es inválida, responder 400.
    let voice: Voice;
    if (rawVoice === undefined || rawVoice === null) {
      voice = DEFAULT_VOICE;
    } else if (isVoice(rawVoice)) {
      voice = rawVoice;
    } else {
      return new Response(
        JSON.stringify({
          error: `Voice no reconocida: "${String(rawVoice)}". Valores permitidos: saleads, marco.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log mínimo para debug (sin contenido del mensaje ni de los DNAs por privacidad).
    console.log(`[brand-chat] voice=${voice} messages=${messages?.length ?? 0} has_dnas=${!!dnas}`);

    // Build system prompt: brand guide + optional DNAs
    let systemPrompt = VOICE_TO_PROMPT[voice];

    if (dnas) {
      systemPrompt += `\n\n═══════════════════════════════════════════════════\nDNAs DEL USUARIO (contexto adicional de marca)\n═══════════════════════════════════════════════════\n`;
      if (dnas.expert) systemPrompt += `\nDNA EXPERTO:\n${dnas.expert}`;
      if (dnas.audience) systemPrompt += `\nDNA AUDIENCIA:\n${dnas.audience}`;
      if (dnas.product) systemPrompt += `\nDNA PRODUCTO:\n${dnas.product}`;
    }

    // Build messages with multimodal content (images, PDFs, text files)
    const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
    const PDF_TYPE = "application/pdf";

    interface Attachment {
      name: string;
      media_type: string;
      data: string;
    }

    interface IncomingMessage {
      role: string;
      content: string;
      attachments?: Attachment[];
    }

    const apiMessages = (messages as IncomingMessage[]).map((m) => {
      if (!m.attachments || m.attachments.length === 0) {
        return { role: m.role, content: m.content };
      }

      // Build content blocks for multimodal messages
      const contentBlocks: any[] = [];

      for (const att of m.attachments) {
        if (IMAGE_TYPES.includes(att.media_type)) {
          // Image → vision content block
          contentBlocks.push({
            type: "image",
            source: {
              type: "base64",
              media_type: att.media_type,
              data: att.data,
            },
          });
        } else if (att.media_type === PDF_TYPE) {
          // PDF → document content block
          contentBlocks.push({
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: att.data,
            },
          });
        } else {
          // Text-based files (TXT, CSV, DOC) → decode and include as text
          try {
            const decoded = atob(att.data);
            contentBlocks.push({
              type: "text",
              text: `--- Archivo adjunto: ${att.name} ---\n${decoded}\n--- Fin del archivo ---`,
            });
          } catch {
            contentBlocks.push({
              type: "text",
              text: `[Archivo adjunto: ${att.name} — no se pudo leer el contenido]`,
            });
          }
        }
      }

      // Add the user's text message
      if (m.content && m.content !== "(archivo adjunto)") {
        contentBlocks.push({ type: "text", text: m.content });
      } else if (contentBlocks.length > 0 && !contentBlocks.some((b: any) => b.type === "text")) {
        contentBlocks.push({ type: "text", text: "Analiza los archivos adjuntos." });
      }

      return { role: m.role, content: contentBlocks };
    });

    // Check if any message has PDFs → need beta header
    const hasPdfs = (messages as IncomingMessage[]).some(
      (m) => m.attachments?.some((a) => a.media_type === PDF_TYPE)
    );

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    };
    if (hasPdfs) {
      headers["anthropic-beta"] = "pdfs-2024-09-25";
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        messages: apiMessages,
      }),
    });

    const data = await response.json();
    if (data.error)
      throw new Error(data.error.message || JSON.stringify(data.error));

    const reply = data.content?.[0]?.text || "";
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/*
═══════════════════════════════════════════════════
CURLS DE TEST MANUAL (usar tras deploy)
═══════════════════════════════════════════════════

Reemplaza <FUNCTION_URL> por la URL del endpoint desplegado.
Reemplaza <ANON_KEY> por la anon key pública del proyecto Supabase.

TEST 1: SaleADS — descripción de YouTube sobre creación de imágenes con IA
-----------------------------------------------------------------------
curl -X POST '<FUNCTION_URL>' \
  -H 'Authorization: Bearer <ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{
    "voice": "saleads",
    "messages": [
      {
        "role": "user",
        "content": "Dame una descripción de YouTube para un video corto sobre cmo crear imágenes con IA en SaleADS."
      }
    ]
  }'

TEST 2: Marco — título de YouTube sobre por qué vender más no es ganar más
-----------------------------------------------------------------------
curl -X POST '<FUNCTION_URL>' \
  -H 'Authorization: Bearer <ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{
    "voice": "marco",
    "messages": [
      {
        "role": "user",
        "content": "Dame un título de YouTube para un video donde explico por qué vender más no es ganar más."
      }
    ]
  }'

TEST 3: Marco — mensaje de WhatsApp para empresario escéptico que ya gastó en agencias
-----------------------------------------------------------------------
curl -X POST '<FUNCTION_URL>' \
  -H 'Authorization: Bearer <ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{
    "voice": "marco",
    "messages": [
      {
        "role": "user",
        "content": "Hazme un mensaje de WhatsApp para un dueño de restaurante de 48 años que ya gastó 3,000 dólares en una agencia de marketing sin resultados y desconfía de cualquier solución nueva."
      }
    ]
  }'

TEST 4 (negativo): voice inválida — debe retornar 400
-----------------------------------------------------------------------
curl -X POST '<FUNCTION_URL>' \
  -H 'Authorization: Bearer <ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{
    "voice": "juan",
    "messages": [{"role": "user", "content": "hola"}]
  }'

TEST 5 (retrocompatibilidad): sin voice — debe usar saleads por default
-----------------------------------------------------------------------
curl -X POST '<FUNCTION_URL>' \
  -H 'Authorization: Bearer <ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [{"role": "user", "content": "Dame un título para un anuncio de Meta."}]
  }'
*/

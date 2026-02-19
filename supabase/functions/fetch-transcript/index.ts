/**
 * fetch-transcript edge function
 *
 * Automatically extracts transcripts from video URLs:
 * - YouTube: Native extraction (free, no API key needed) via ytInitialPlayerResponse parsing
 * - TikTok/Reels: Supadata.ai API (requires SUPADATA_API_KEY env var — 100 free requests)
 *
 * POST body: { url: string, type: string }
 * Response:  { success: true, transcript: string, method: string }
 *          | { success: false, error: string, instructions: string }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const YOUTUBE_DOMAINS = ["youtube.com", "youtu.be", "youtube-nocookie.com"];
const TIKTOK_DOMAINS  = ["tiktok.com", "vm.tiktok.com"];
const REEL_DOMAINS    = ["instagram.com", "instagr.am"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, type } = await req.json() as { url: string; type: string };
    if (!url) {
      return errorResponse("URL requerida", "Proporciona una URL válida.");
    }

    const supadataKey = Deno.env.get("SUPADATA_API_KEY");
    const normalizedUrl = url.trim();
    const platform = detectPlatform(normalizedUrl, type);

    // ─── YouTube ──────────────────────────────────────────────────────────
    if (platform === "youtube") {
      // Try Supadata first (more reliable), then native fallback
      if (supadataKey) {
        try {
          const transcript = await fetchSupadataTranscript(normalizedUrl, "youtube", supadataKey);
          return successResponse(transcript, "supadata");
        } catch {
          // fall through to native
        }
      }

      try {
        const transcript = await fetchYouTubeNative(normalizedUrl);
        return successResponse(transcript, "native");
      } catch (e) {
        return errorResponse(
          (e as Error).message,
          "Para obtener el transcript de YouTube:\n" +
          "1. Abre el video en YouTube\n" +
          "2. Haz clic en los '...' bajo el título del video\n" +
          "3. Selecciona 'Mostrar transcripción'\n" +
          "4. Copia el texto y pégalo en el campo de transcript."
        );
      }
    }

    // ─── TikTok ───────────────────────────────────────────────────────────
    if (platform === "tiktok") {
      if (supadataKey) {
        try {
          const transcript = await fetchSupadataTranscript(normalizedUrl, "tiktok", supadataKey);
          return successResponse(transcript, "supadata");
        } catch (e) {
          return errorResponse(
            (e as Error).message,
            tiktokInstructions()
          );
        }
      }
      return errorResponse(
        "Extracción automática no configurada para TikTok",
        tiktokInstructions()
      );
    }

    // ─── Instagram Reels ──────────────────────────────────────────────────
    if (platform === "reel") {
      if (supadataKey) {
        try {
          const transcript = await fetchSupadataTranscript(normalizedUrl, "instagram", supadataKey);
          return successResponse(transcript, "supadata");
        } catch (e) {
          return errorResponse(
            (e as Error).message,
            reelInstructions()
          );
        }
      }
      return errorResponse(
        "Extracción automática no configurada para Instagram Reels",
        reelInstructions()
      );
    }

    // ─── Other (document, landing-page, etc.) ─────────────────────────────
    return errorResponse(
      "Tipo de URL no soportado para extracción automática",
      "Para páginas web, el contenido se extrae automáticamente durante el análisis. No necesitas transcript manual."
    );

  } catch (err) {
    console.error("fetch-transcript error:", err);
    return errorResponse(
      (err as Error).message || "Error interno",
      "Ocurrió un error inesperado. Pega el transcript manualmente."
    );
  }
});

// ─── YouTube Native Extraction ────────────────────────────────────────────────

async function fetchYouTubeNative(url: string): Promise<string> {
  const videoId = extractYouTubeId(url);
  if (!videoId) throw new Error("URL de YouTube inválida o ID de video no encontrado.");

  // Fetch the YouTube watch page
  const html = await fetchWithTimeout(
    `https://www.youtube.com/watch?v=${videoId}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    },
    15000
  );

  // Extract ytInitialPlayerResponse JSON from the page
  const playerResponse = extractPlayerResponse(html);
  if (!playerResponse) {
    throw new Error("No se pudo obtener la información del video de YouTube.");
  }

  // Navigate to caption tracks
  const tracks: any[] = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  if (!tracks.length) {
    throw new Error("Este video no tiene subtítulos/transcripción disponible.");
  }

  // Prefer: Spanish auto-generated → Spanish manual → auto-generated (any lang) → first available
  const track =
    tracks.find((t) => t.languageCode?.startsWith("es") && t.kind === "asr") ??
    tracks.find((t) => t.languageCode?.startsWith("es")) ??
    tracks.find((t) => t.kind === "asr") ??
    tracks[0];

  if (!track?.baseUrl) {
    throw new Error("No se encontró URL de subtítulos.");
  }

  // Fetch the caption data (XML format)
  const captionXml = await fetchWithTimeout(track.baseUrl, {
    headers: { "User-Agent": "Mozilla/5.0" },
  }, 10000);

  return parseYouTubeCaptionXml(captionXml);
}

function extractPlayerResponse(html: string): any {
  // Try multiple patterns since YouTube updates their page structure
  const patterns = [
    /ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;[\s\n]*(?:var|window|if|</,
    /ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;/,
    /"ytInitialPlayerResponse"\s*:\s*(\{.+?\})(?:,\s*"|\s*})/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      try {
        return JSON.parse(match[1]);
      } catch {
        // Try to find a valid JSON boundary
        const start = html.indexOf(match[1].slice(0, 20));
        if (start >= 0) {
          let depth = 0;
          let i = start;
          while (i < html.length) {
            if (html[i] === "{") depth++;
            else if (html[i] === "}") {
              depth--;
              if (depth === 0) {
                try {
                  return JSON.parse(html.slice(start, i + 1));
                } catch { break; }
              }
            }
            i++;
          }
        }
      }
    }
  }
  return null;
}

function parseYouTubeCaptionXml(xml: string): string {
  const textMatches = xml.match(/<text[^>]*>([^<]*)<\/text>/g) ?? [];
  if (!textMatches.length) {
    // Try JSON format (srv3)
    try {
      const json = JSON.parse(xml);
      if (json.events) {
        return json.events
          .filter((e: any) => e.segs)
          .flatMap((e: any) => e.segs.map((s: any) => s.utf8))
          .filter((s: string) => s && s !== "\n")
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
      }
    } catch { /* not JSON */ }
    throw new Error("No se pudo parsear la transcripción del video.");
  }

  return textMatches
    .map((t) =>
      t
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\n/g, " ")
        .trim()
    )
    .filter((t) => t.length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

// ─── Supadata.ai ──────────────────────────────────────────────────────────────

async function fetchSupadataTranscript(
  url: string,
  platform: "youtube" | "tiktok" | "instagram",
  apiKey: string
): Promise<string> {
  const endpointMap = {
    youtube:   "https://api.supadata.ai/v1/youtube/transcript",
    tiktok:    "https://api.supadata.ai/v1/tiktok/transcript",
    instagram: "https://api.supadata.ai/v1/instagram/transcript",
  };

  const apiUrl = `${endpointMap[platform]}?url=${encodeURIComponent(url)}&text=true`;

  const response = await fetchWithTimeout(apiUrl, {
    headers: {
      "x-api-key": apiKey,
      "Accept": "application/json",
    },
  }, 30000);

  let data: any;
  try {
    data = JSON.parse(response);
  } catch {
    throw new Error("Respuesta inválida de Supadata.ai");
  }

  if (data.error) throw new Error(data.error);

  // Supadata returns { content: string } or { transcript: string } depending on platform
  const text = data.content ?? data.transcript ?? data.text;
  if (!text || typeof text !== "string") {
    throw new Error("Supadata no devolvió texto de transcripción.");
  }

  return text.trim();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} en ${url}`);
    return await resp.text();
  } finally {
    clearTimeout(timer);
  }
}

function detectPlatform(url: string, type: string): "youtube" | "tiktok" | "reel" | "other" {
  const lower = url.toLowerCase();
  if (type === "youtube" || YOUTUBE_DOMAINS.some((d) => lower.includes(d))) return "youtube";
  if (type === "tiktok"  || TIKTOK_DOMAINS.some((d) => lower.includes(d)))  return "tiktok";
  if (type === "reel"    || REEL_DOMAINS.some((d) => lower.includes(d)))     return "reel";
  return "other";
}

function successResponse(transcript: string, method: string) {
  return new Response(
    JSON.stringify({ success: true, transcript, method }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function errorResponse(error: string, instructions: string) {
  return new Response(
    JSON.stringify({ success: false, error, instructions }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function tiktokInstructions(): string {
  return (
    "Para obtener el transcript de un TikTok:\n" +
    "1. Abre el video en TikTok\n" +
    "2. Activa los subtítulos (CC) dentro del video\n" +
    "3. Copia el texto o pega el guión del video\n\n" +
    "💡 Tip: Configura SUPADATA_API_KEY en Supabase para extracción automática de TikTok."
  );
}

function reelInstructions(): string {
  return (
    "Para obtener el transcript de un Reel:\n" +
    "1. Abre el Reel en Instagram\n" +
    "2. Activa los subtítulos automáticos (ícono CC)\n" +
    "3. Copia o transcribe el texto del video\n\n" +
    "💡 Tip: Configura SUPADATA_API_KEY en Supabase para extracción automática de Reels."
  );
}

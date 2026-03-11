import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { referente_id } = await req.json();

    if (!referente_id) {
      return new Response(
        JSON.stringify({ error: "referente_id es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apifyToken = Deno.env.get("APIFY_TOKEN") ?? "";
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    const n8nWebhookUrl = Deno.env.get("N8N_SCRAPE_REFERENTES_WEBHOOK");

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch referente data
    const { data: referente, error: refError } = await supabase
      .from("referentes")
      .select("*")
      .eq("id", referente_id)
      .single();

    if (refError || !referente) {
      return new Response(
        JSON.stringify({ error: "Referente no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!n8nWebhookUrl) {
      return new Response(
        JSON.stringify({ error: "N8N_SCRAPE_REFERENTES_WEBHOOK no configurado. Agrégalo como secret en Supabase." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!apifyToken) {
      return new Response(
        JSON.stringify({ error: "APIFY_TOKEN no configurado. Agrégalo como secret en Supabase." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fire-and-forget to N8N
    fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referente,
        apify_token: apifyToken,
        anthropic_key: anthropicKey,
        supabase_url: supabaseUrl,
        supabase_key: serviceKey,
      }),
    }).catch((err: Error) => {
      console.error("Failed to trigger N8N scrape referentes:", err);
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Scraping iniciado para ${referente.name}. El contenido aparecerá en el banco en unos minutos.`,
        referente_name: referente.name,
        platforms: [
          referente.ig_handle ? "instagram" : null,
          referente.tiktok_handle ? "tiktok" : null,
          referente.fb_page_url ? "facebook_ads" : null,
        ].filter(Boolean),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("trigger-referente-scrape error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

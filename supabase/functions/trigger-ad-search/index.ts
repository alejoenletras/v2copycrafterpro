import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { search_type, query, country_code, media_type, max_ads } = await req.json();

    // Validate
    if (!search_type || !["keyword", "page_url"].includes(search_type)) {
      return new Response(
        JSON.stringify({ error: "search_type must be 'keyword' or 'page_url'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_URL");

    if (!n8nWebhookUrl) {
      return new Response(
        JSON.stringify({ error: "N8N_WEBHOOK_URL not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Insert search job
    const { data: search, error: insertError } = await supabase
      .from("ad_searches")
      .insert({
        search_type,
        query: query.trim(),
        country_code: country_code || "ALL",
        media_type: media_type || "all",
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(`Failed to create search: ${insertError.message}`);
    }

    // Send webhook to N8N (fire and forget)
    const webhookPayload = {
      search_id: search.id,
      search_type,
      query: query.trim(),
      country_code: country_code || "ALL",
      media_type: media_type || "all",
      max_ads: max_ads || 50,
      supabase_url: supabaseUrl,
      supabase_service_key: serviceKey,
    };

    fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    }).catch((err) => {
      console.error("Failed to send webhook to N8N:", err);
    });

    return new Response(
      JSON.stringify({ search_id: search.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("trigger-ad-search error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

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
    const { search_query, country_code, min_page_likes, max_ads } =
      await req.json();

    if (!search_query || search_query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "search_query is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const n8nWebhookUrl = Deno.env.get("N8N_AD_SPY_WEBHOOK_URL");

    if (!n8nWebhookUrl) {
      return new Response(
        JSON.stringify({ error: "N8N_AD_SPY_WEBHOOK_URL not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Insert spy run
    const { data: run, error: insertError } = await supabase
      .from("ad_spy_runs")
      .insert({
        search_query: search_query.trim(),
        country_code: country_code || "US",
        min_page_likes: min_page_likes || 1000,
        max_ads: max_ads || 200,
        status: "running",
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(`Failed to create spy run: ${insertError.message}`);
    }

    // Send webhook to N8N (fire and forget)
    const webhookPayload = {
      run_id: run.id,
      search_query: search_query.trim(),
      country_code: country_code || "US",
      min_page_likes: min_page_likes || 1000,
      max_ads: max_ads || 200,
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

    return new Response(JSON.stringify({ run_id: run.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("trigger-ad-spy error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

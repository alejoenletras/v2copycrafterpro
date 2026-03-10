import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { workflow } = await req.json();

    const n8nBaseUrl = Deno.env.get("N8N_BASE_URL");
    if (!n8nBaseUrl) {
      return new Response(
        JSON.stringify({ error: "N8N_BASE_URL not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const webhookPaths: Record<string, string> = {
      enrichment: "hooq-enrichment",
      "organic-posts": "hooq-organic-posts",
    };

    const path = webhookPaths[workflow];
    if (!path) {
      return new Response(
        JSON.stringify({ error: `Unknown workflow: ${workflow}. Valid: ${Object.keys(webhookPaths).join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const webhookUrl = `${n8nBaseUrl.replace(/\/$/, "")}/webhook/${path}`;

    // Fire and forget — N8N workflows can take minutes
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ triggered_from: "frontend", triggered_at: new Date().toISOString() }),
    }).catch((err) => {
      console.error(`Failed to trigger ${workflow}:`, err);
    });

    return new Response(
      JSON.stringify({ success: true, workflow, message: `Workflow '${workflow}' triggered` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("trigger-workflow error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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
    const {
      personality_dna_id,
      audience_dna_id,
      product_dna_id,
      count,
      script_format,
      target_platform,
    } = await req.json();

    if (!personality_dna_id || !audience_dna_id || !product_dna_id) {
      return new Response(
        JSON.stringify({ error: "Los 3 DNAs son requeridos (personality_dna_id, audience_dna_id, product_dna_id)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const n8nWebhookUrl = Deno.env.get("N8N_GENERATE_SCRIPTS_WEBHOOK");

    const supabase = createClient(supabaseUrl, serviceKey);

    // Create generation_run record
    const { data: run, error: runError } = await supabase
      .from("generation_runs")
      .insert({
        personality_dna_id,
        audience_dna_id,
        product_dna_id,
        requested_count: count || 10,
        status: "running",
      })
      .select()
      .single();

    if (runError) throw runError;

    // Fetch all 3 DNAs
    const { data: dnas } = await supabase
      .from("dnas")
      .select("*")
      .in("id", [personality_dna_id, audience_dna_id, product_dna_id]);

    const personalityDna = dnas?.find((d: any) => d.id === personality_dna_id) ?? null;
    const audienceDna = dnas?.find((d: any) => d.id === audience_dna_id) ?? null;
    const productDna = dnas?.find((d: any) => d.id === product_dna_id) ?? null;

    // Fetch active referente rules for this personality DNA
    const { data: rules } = await supabase
      .from("dna_referente_rules")
      .select("*, referentes(*)")
      .eq("personality_dna_id", personality_dna_id)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    const referenteIds = (rules || []).map((r: any) => r.referente_id);

    // Fetch best unused content from assigned referentes
    let content: any[] = [];
    if (referenteIds.length > 0) {
      const { data: contentData } = await supabase
        .from("referente_content")
        .select("*")
        .in("referente_id", referenteIds)
        .eq("is_used", false)
        .gte("quality_score", 6)
        .order("quality_score", { ascending: false })
        .limit(count || 10);
      content = contentData || [];
    }

    // Trigger N8N webhook (fire-and-forget)
    if (n8nWebhookUrl) {
      fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generation_run_id: run.id,
          personality_dna_id,
          audience_dna_id,
          product_dna_id,
          count: count || 10,
          script_format: script_format || "video_script",
          target_platform: target_platform || "multi",
          personality_dna: personalityDna,
          audience_dna: audienceDna,
          product_dna: productDna,
          rules: rules || [],
          content,
          supabase_url: supabaseUrl,
          supabase_service_key: serviceKey,
        }),
      }).catch((err: Error) => {
        console.error("Failed to trigger N8N generate scripts:", err);
      });
    } else {
      console.warn("N8N_GENERATE_SCRIPTS_WEBHOOK not configured — workflow not triggered");
      // Mark run as failed if no webhook configured
      await supabase
        .from("generation_runs")
        .update({ status: "failed", error_message: "N8N_GENERATE_SCRIPTS_WEBHOOK not configured" })
        .eq("id", run.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        run_id: run.id,
        content_available: content.length,
        rules_active: (rules || []).length,
        message: n8nWebhookUrl
          ? `Generación iniciada. ${content.length} piezas de contenido disponibles.`
          : "Webhook N8N no configurado. Agrega N8N_GENERATE_SCRIPTS_WEBHOOK como secret.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("trigger-script-generation error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatScriptForTelegram(script: Record<string, unknown>, total: number): string {
  const n = script.content_number;
  const divider = '━'.repeat(22);
  return `${divider}
📢 *CONTENIDO #${n} de ${total}*

🎯 *REFERENTE:* ${script.referente}

*HOOK 1:*
${script.hook_1}

*HOOK 2:*
${script.hook_2}

*CUERPO:*
${script.cuerpo}

*CTA 1:*
${script.cta_1}${script.cta_2 ? `\n\n*CTA 2:*\n${script.cta_2}` : ''}
${divider}`;
}

function formatScriptsForEmail(scripts: Record<string, unknown>[], searchQuery: string): string {
  const items = scripts.map((s) => `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:24px;margin-bottom:24px;">
      <h3 style="margin:0 0 4px;color:#7c3aed;">CONTENIDO #${s.content_number}</h3>
      <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">${s.referente}</p>
      <p style="font-weight:600;margin:0 0 4px;color:#111;">HOOK 1:</p>
      <p style="margin:0 0 16px;white-space:pre-wrap;">${s.hook_1}</p>
      <p style="font-weight:600;margin:0 0 4px;color:#111;">HOOK 2:</p>
      <p style="margin:0 0 16px;white-space:pre-wrap;">${s.hook_2}</p>
      <p style="font-weight:600;margin:0 0 4px;color:#111;">CUERPO:</p>
      <p style="margin:0 0 16px;white-space:pre-wrap;">${s.cuerpo}</p>
      <p style="font-weight:600;margin:0 0 4px;color:#111;">CTA 1:</p>
      <p style="margin:0 0 8px;white-space:pre-wrap;">${s.cta_1}</p>
      ${s.cta_2 ? `<p style="font-weight:600;margin:0 0 4px;color:#111;">CTA 2:</p><p style="margin:0;white-space:pre-wrap;">${s.cta_2}</p>` : ''}
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;max-width:700px;margin:0 auto;padding:24px;color:#111;">
  <div style="background:#7c3aed;color:white;border-radius:12px;padding:24px;margin-bottom:32px;">
    <h1 style="margin:0 0 8px;font-size:24px;">Hooq — Guiones de Anuncios</h1>
    <p style="margin:0;opacity:0.9;">Búsqueda: <strong>${searchQuery}</strong> · ${scripts.length} guiones generados</p>
  </div>
  ${items}
  <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:32px;">Generado por Hooq · Agente de Anuncios</p>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scripts, delivery, search_query } = await req.json();

    if (!scripts || !Array.isArray(scripts) || scripts.length === 0) {
      return new Response(JSON.stringify({ error: 'scripts array required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: { telegram?: string; email?: string } = {};

    // ── Telegram delivery ──────────────────────────────────────────────────
    if (delivery?.telegram?.bot_token && delivery?.telegram?.chat_id) {
      const { bot_token, chat_id } = delivery.telegram;
      const telegramBase = `https://api.telegram.org/bot${bot_token}`;

      // Send header message
      await fetch(`${telegramBase}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id,
          text: `🚀 *Hooq Agente de Anuncios*\n\nBúsqueda: *${search_query || 'sin especificar'}*\n${scripts.length} guiones adaptados listos:`,
          parse_mode: 'Markdown',
        }),
      });

      // Send each script as a separate message
      for (const script of scripts) {
        const text = formatScriptForTelegram(script as Record<string, unknown>, scripts.length);
        await fetch(`${telegramBase}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id,
            text,
            parse_mode: 'Markdown',
          }),
        });
        // Small delay to avoid Telegram rate limits
        await new Promise(r => setTimeout(r, 300));
      }

      results.telegram = 'sent';
    }

    // ── Email delivery via Resend ──────────────────────────────────────────
    if (delivery?.email?.to) {
      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (resendKey) {
        const html = formatScriptsForEmail(scripts as Record<string, unknown>[], search_query || 'sin especificar');
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Hooq <noreply@resend.dev>',
            to: [delivery.email.to],
            subject: `Hooq — ${scripts.length} guiones de anuncios (${search_query || 'búsqueda reciente'})`,
            html,
          }),
        });

        if (emailRes.ok) {
          results.email = 'sent';
        } else {
          const errText = await emailRes.text();
          console.error('Resend error:', errText);
          results.email = `error: ${emailRes.status}`;
        }
      } else {
        results.email = 'RESEND_API_KEY not configured';
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('deliver-ads error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

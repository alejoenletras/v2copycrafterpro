import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APIFY_BASE = "https://api.apify.com/v2";

// curious_coder/facebook-ads-library-scraper — proven actor that exists
const ACTOR_ID = "curious_coder~facebook-ads-library-scraper";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apifyToken = Deno.env.get('APIFY_TOKEN');
    if (!apifyToken) {
      return new Response(JSON.stringify({ error: 'APIFY_TOKEN not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { search_mode, search_query, page_url, countries = ['CO', 'MX', 'AR', 'ES'], max_ads = 20 } = await req.json();

    if (!search_query && !page_url) {
      return new Response(JSON.stringify({ error: 'search_query or page_url required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // This actor accepts Facebook Ads Library URLs or Facebook page URLs in the `urls` field.
    // For keyword search: build a FB Ads Library search URL.
    // For brand search: use the Facebook page URL directly.
    let urls: Array<{ url: string }>;
    const country = countries[0] || 'ALL';

    if (search_mode === 'brand' && (page_url || search_query)) {
      urls = [{ url: page_url || `https://www.facebook.com/${search_query}` }];
    } else {
      const encoded = encodeURIComponent(search_query || '');
      urls = [{
        url: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${country}&q=${encoded}&search_type=keyword_unordered&media_type=all`,
      }];
    }

    const actorInput = {
      urls,
      count: Math.min(max_ads, 40),
      "scrapePageAds.activeStatus": "active",
      "scrapePageAds.sortBy": "impressions_desc",
      "scrapePageAds.countryCode": country,
    };

    console.log('Calling Apify actor:', ACTOR_ID);
    console.log('Input:', JSON.stringify(actorInput));

    // Run Apify actor synchronously (timeout=120s on Apify side, 130s on our side)
    const apifyRes = await fetch(
      `${APIFY_BASE}/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${apifyToken}&timeout=120`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actorInput),
        signal: AbortSignal.timeout(130000),
      }
    );

    const responseText = await apifyRes.text();
    console.log('Apify response status:', apifyRes.status);
    console.log('Apify response (first 500 chars):', responseText.substring(0, 500));

    if (!apifyRes.ok) {
      return new Response(JSON.stringify({
        error: `Apify error: ${apifyRes.status}`,
        detail: responseText.substring(0, 500),
      }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let rawAds: Record<string, unknown>[] = [];
    try {
      rawAds = JSON.parse(responseText);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON from Apify', detail: responseText.substring(0, 200) }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!Array.isArray(rawAds)) {
      return new Response(JSON.stringify({ error: 'Unexpected Apify response format', detail: responseText.substring(0, 200) }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize ad fields — supports multiple field name conventions
    const ads = rawAds
      .map((ad, i) => {
        const adText = String(
          ad.body ||
          ad.adCreativeBodies?.[0] ||
          ad.ad_creative_bodies?.[0] ||
          ad.adBodyText ||
          ad.text ||
          ''
        );

        const startTime =
          ad.startDate ||
          ad.adDeliveryStartTime ||
          ad.ad_delivery_start_time ||
          ad.startedAt ||
          null;

        const daysRunning = startTime
          ? Math.floor((Date.now() - new Date(String(startTime)).getTime()) / 86400000)
          : null;

        return {
          ad_id: String(ad.id || ad.adArchiveID || ad.ad_archive_id || `ad_${i}`),
          advertiser_name: String(ad.pageName || ad.page_name || ad.advertiserName || 'Desconocido'),
          ad_text: adText,
          cta_text: String(ad.ctaText || ad.cta_text || ad.callToAction || ''),
          headline: String(ad.title || ad.headline || ad.adTitle || ''),
          days_running: daysRunning,
          video_url: ad.videoUrl || ad.video_url || null,
          image_url: Array.isArray(ad.adCreativeImageUrls) && ad.adCreativeImageUrls.length > 0
            ? ad.adCreativeImageUrls[0]
            : null,
          page_name: String(ad.pageName || ad.page_name || ''),
          start_date: startTime ? String(startTime) : null,
        };
      })
      .filter(ad => ad.ad_text.length > 30)
      .sort((a, b) => (b.days_running || 0) - (a.days_running || 0))
      .slice(0, max_ads);

    return new Response(JSON.stringify({ ads, total: ads.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('search-winning-ads error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

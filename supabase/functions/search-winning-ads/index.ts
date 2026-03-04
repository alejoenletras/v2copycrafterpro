import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APIFY_BASE = "https://api.apify.com/v2";

// Primary: official Apify actor (maintained by Apify, updated frequently)
const ACTOR_PRIMARY = "apify~facebook-ads-scraper";
// Fallback: curious_coder actor
const ACTOR_FALLBACK = "curious_coder~facebook-ads-library-scraper";

interface NormalizedAd {
  ad_id: string;
  advertiser_name: string;
  ad_text: string;
  cta_text: string;
  headline: string;
  days_running: number | null;
  video_url: string | null;
  image_url: string | null;
  page_name: string;
  start_date: string | null;
  platform: string;
}

// deno-lint-ignore-file no-explicit-any
// Normalize ad from any Apify actor output format
function normalizeAd(ad: Record<string, any>, index: number): NormalizedAd {
  const snap = (ad.snapshot || {}) as Record<string, any>;

  // Ad text: try many possible field names
  const adText = String(
    ad.body ||
    ad.adCreativeBodies?.[0] ||
    ad.ad_creative_bodies?.[0] ||
    ad.adBodyText ||
    ad.text ||
    ad.bodyText ||
    ad.creative_body ||
    ad.description ||
    ad.ad_body ||
    ad.adBody ||
    snap.body?.text ||
    snap.cards?.[0]?.body ||
    ''
  );

  // Start date
  const startTime =
    ad.startDate ||
    ad.adDeliveryStartTime ||
    ad.ad_delivery_start_time ||
    ad.startedAt ||
    ad.start_date ||
    ad.ad_start_date ||
    ad.deliveryStartTime ||
    null;

  // Handle Unix timestamps (seconds) and ISO date strings
  let daysRunning: number | null = null;
  if (startTime) {
    const s = String(startTime);
    let ms: number;
    if (/^\d+$/.test(s)) {
      // Pure numeric = Unix timestamp (seconds)
      ms = parseInt(s, 10) * 1000;
    } else {
      ms = new Date(s).getTime();
    }
    if (!isNaN(ms) && ms > 0) {
      daysRunning = Math.floor((Date.now() - ms) / 86400000);
      if (daysRunning < 0) daysRunning = 0; // future dates
    }
  }

  // Platform detection
  const platforms = ad.publisherPlatform || ad.publisher_platforms || ad.platforms || [];
  const platformStr = Array.isArray(platforms) ? platforms.join(',') : String(platforms || '');
  let platform = 'facebook';
  if (platformStr.toLowerCase().includes('instagram')) platform = 'instagram';
  else if (platformStr.toLowerCase().includes('messenger')) platform = 'messenger';

  // Image URL
  let imageUrl: string | null = null;
  if (Array.isArray(ad.adCreativeImageUrls) && ad.adCreativeImageUrls.length > 0) {
    imageUrl = String(ad.adCreativeImageUrls[0]);
  } else if (snap.images?.[0]?.original_image_url) {
    imageUrl = String(snap.images[0].original_image_url);
  } else if (ad.image_url || ad.imageUrl) {
    imageUrl = String(ad.image_url || ad.imageUrl);
  }

  // Video URL
  const videoUrl = ad.videoUrl || ad.video_url ||
    snap.videos?.[0]?.video_hd_url ||
    snap.videos?.[0]?.video_sd_url ||
    null;

  return {
    ad_id: String(ad.id || ad.adArchiveID || ad.ad_archive_id || ad.adId || `ad_${index}`),
    advertiser_name: String(ad.pageName || ad.page_name || ad.advertiserName || ad.advertiser_name || ad.pageInfo?.name || 'Desconocido'),
    ad_text: adText,
    cta_text: String(ad.ctaText || ad.cta_text || ad.callToAction || snap.cta_text || ''),
    headline: String(ad.title || ad.headline || ad.adTitle || snap.title || ''),
    days_running: daysRunning,
    video_url: videoUrl ? String(videoUrl) : null,
    image_url: imageUrl,
    page_name: String(ad.pageName || ad.page_name || ad.pageInfo?.name || ''),
    start_date: startTime ? String(startTime) : null,
    platform,
  };
}

async function runActor(
  actorId: string,
  input: Record<string, unknown>,
  apifyToken: string,
  timeoutSecs = 120
): Promise<{ rawAds: Record<string, unknown>[]; rawText: string }> {
  const res = await fetch(
    `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${apifyToken}&timeout=${timeoutSecs}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout((timeoutSecs + 10) * 1000),
    }
  );

  const rawText = await res.text();
  console.log(`[${actorId}] Status: ${res.status}, Response length: ${rawText.length}`);
  console.log(`[${actorId}] First 500 chars:`, rawText.substring(0, 500));

  if (!res.ok) {
    throw new Error(`Apify ${actorId} error: ${res.status} - ${rawText.substring(0, 200)}`);
  }

  let rawAds: Record<string, unknown>[];
  try {
    rawAds = JSON.parse(rawText);
  } catch {
    throw new Error(`Invalid JSON from ${actorId}: ${rawText.substring(0, 200)}`);
  }

  if (!Array.isArray(rawAds)) {
    throw new Error(`Unexpected format from ${actorId}: ${rawText.substring(0, 200)}`);
  }

  return { rawAds, rawText };
}

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

    const {
      search_mode,
      search_query,
      page_url,
      countries = ['CO', 'MX', 'AR', 'ES'],
      max_ads = 20,
      debug = false,
    } = await req.json();

    if (!search_query && !page_url) {
      return new Response(JSON.stringify({ error: 'search_query or page_url required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const country = countries[0] || 'ALL';

    // ─── Strategy 1: Official Apify actor (apify/facebook-ads-scraper) ────────
    // Uses startUrls with Facebook Ads Library URLs
    const encoded = encodeURIComponent(search_query || '');
    let adLibraryUrl: string;

    if (search_mode === 'brand' && (page_url || search_query)) {
      // Brand search: search by page name or use direct page URL
      const brandQuery = page_url || search_query;
      adLibraryUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${country}&q=${encodeURIComponent(brandQuery)}&search_type=keyword_unordered&media_type=all`;
    } else {
      adLibraryUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${country}&q=${encoded}&search_type=keyword_unordered&media_type=all`;
    }

    // curious_coder actor requires count >= 10
    const effectiveCount = Math.max(Math.min(max_ads, 50), 10);

    // Primary: curious_coder actor (faster, proven to work with correct params)
    const inputPrimary = {
      urls: [{ url: adLibraryUrl }],
      count: effectiveCount,
    };

    // Fallback: official Apify actor (heavier, needs more time)
    const inputFallback = {
      startUrls: [{ url: adLibraryUrl }],
      maxItems: effectiveCount,
      activeStatus: "active",
      adType: "all",
      country: country,
      mediaType: "all",
    };

    let rawAds: Record<string, unknown>[] = [];
    let usedActor = '';
    let rawSample: unknown[] = [];
    const errors: string[] = [];

    // Try primary actor first (curious_coder — faster, proven)
    try {
      console.log('Trying primary actor:', ACTOR_FALLBACK);
      const result = await runActor(ACTOR_FALLBACK, inputPrimary, apifyToken, 120);
      // Filter out error objects from actor (e.g. {"error": "..."})
      rawAds = result.rawAds.filter(item => !item.error);
      usedActor = ACTOR_FALLBACK;
      console.log(`Primary actor returned ${result.rawAds.length} raw items, ${rawAds.length} valid ads`);
    } catch (err) {
      const msg = `Primary (${ACTOR_FALLBACK}) failed: ${err}`;
      console.error(msg);
      errors.push(msg);
    }

    // If primary returned nothing, try official Apify actor (slower, needs more time)
    if (rawAds.length === 0) {
      try {
        console.log('Trying fallback actor:', ACTOR_PRIMARY);
        const result = await runActor(ACTOR_PRIMARY, inputFallback, apifyToken, 150);
        rawAds = result.rawAds.filter(item => !item.error);
        usedActor = ACTOR_PRIMARY;
        console.log(`Fallback actor returned ${result.rawAds.length} raw items, ${rawAds.length} valid ads`);
      } catch (err) {
        const msg = `Fallback (${ACTOR_PRIMARY}) failed: ${err}`;
        console.error(msg);
        errors.push(msg);
      }
    }

    // Save sample of raw data for debugging
    if (rawAds.length > 0) {
      rawSample = rawAds.slice(0, 2).map(ad => {
        // Return first-level keys and their types/values
        const sample: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(ad)) {
          if (typeof val === 'string') sample[key] = val.substring(0, 100);
          else if (Array.isArray(val)) sample[key] = `Array(${val.length})`;
          else if (typeof val === 'object' && val !== null) sample[key] = `Object(${Object.keys(val).join(',')})`;
          else sample[key] = val;
        }
        return sample;
      });
    }

    // Normalize all ads
    const allNormalized = rawAds.map((ad, i) => normalizeAd(ad, i));

    // Filter: require ad_text > 20 chars (lowered from 30)
    const ads = allNormalized
      .filter(ad => ad.ad_text.length > 20)
      .sort((a, b) => (b.days_running || 0) - (a.days_running || 0))
      .slice(0, max_ads);

    console.log(`Normalized: ${allNormalized.length}, After filter: ${ads.length}`);

    // Platform counts
    const platformCounts = { facebook: 0, instagram: 0, other: 0 };
    ads.forEach(ad => {
      if (ad.platform === 'instagram') platformCounts.instagram++;
      else if (ad.platform === 'facebook') platformCounts.facebook++;
      else platformCounts.other++;
    });

    const response: Record<string, unknown> = {
      ads,
      total: ads.length,
      platformCounts,
      actor_used: usedActor,
    };

    // Include debug info when requested or when no results found
    if (debug || ads.length === 0) {
      response.debug = {
        raw_count: rawAds.length,
        normalized_count: allNormalized.length,
        filtered_count: ads.length,
        raw_sample: rawSample,
        errors,
        actor_used: usedActor,
        input_url: adLibraryUrl,
        filter_details: allNormalized.length > 0 ? {
          texts_too_short: allNormalized.filter(a => a.ad_text.length <= 20).length,
          sample_text_lengths: allNormalized.slice(0, 5).map(a => ({ id: a.ad_id, text_len: a.ad_text.length, text_preview: a.ad_text.substring(0, 50) })),
        } : null,
      };
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('search-winning-ads error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

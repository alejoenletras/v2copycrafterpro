import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const APIFY_BASE = "https://api.apify.com/v2";
const ACTOR_ID = "curious_coder~facebook-ads-library-scraper";

// ─── Ad Normalization (same logic as search-winning-ads) ─────────────────────

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
  keyword_source: string;
}

function normalizeAd(
  ad: Record<string, unknown>,
  index: number,
  keyword: string
): NormalizedAd {
  const adText = String(
    ad.body ||
      (ad.adCreativeBodies as string[])?.[0] ||
      (ad.ad_creative_bodies as string[])?.[0] ||
      ad.adBodyText ||
      ad.text ||
      ""
  );

  const startTime =
    ad.startDate ||
    ad.adDeliveryStartTime ||
    ad.ad_delivery_start_time ||
    ad.startedAt ||
    null;

  const daysRunning = startTime
    ? Math.floor(
        (Date.now() - new Date(String(startTime)).getTime()) / 86400000
      )
    : null;

  return {
    ad_id: String(ad.id || ad.adArchiveID || ad.ad_archive_id || `ad_${index}`),
    advertiser_name: String(
      ad.pageName || ad.page_name || ad.advertiserName || "Desconocido"
    ),
    ad_text: adText,
    cta_text: String(ad.ctaText || ad.cta_text || ad.callToAction || ""),
    headline: String(ad.title || ad.headline || ad.adTitle || ""),
    days_running: daysRunning,
    video_url: (ad.videoUrl || ad.video_url || null) as string | null,
    image_url:
      Array.isArray(ad.adCreativeImageUrls) && ad.adCreativeImageUrls.length > 0
        ? String(ad.adCreativeImageUrls[0])
        : null,
    page_name: String(ad.pageName || ad.page_name || ""),
    start_date: startTime ? String(startTime) : null,
    keyword_source: keyword,
  };
}

// ─── Search one keyword via Apify ────────────────────────────────────────────

async function searchOneKeyword(
  keyword: string,
  apifyToken: string,
  country: string,
  maxAds: number
): Promise<NormalizedAd[]> {
  const encoded = encodeURIComponent(keyword);
  const url = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${country}&q=${encoded}&search_type=keyword_unordered&media_type=all`;

  const actorInput = {
    urls: [{ url }],
    count: Math.min(maxAds, 30),
    "scrapePageAds.activeStatus": "active",
    "scrapePageAds.sortBy": "impressions_desc",
    "scrapePageAds.countryCode": country,
  };

  console.log(`Searching Apify for keyword: "${keyword}"`);

  const apifyRes = await fetch(
    `${APIFY_BASE}/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${apifyToken}&timeout=120`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actorInput),
      signal: AbortSignal.timeout(130000),
    }
  );

  if (!apifyRes.ok) {
    console.error(
      `Apify error for "${keyword}": ${apifyRes.status}`
    );
    return [];
  }

  const responseText = await apifyRes.text();
  let rawAds: Record<string, unknown>[] = [];
  try {
    rawAds = JSON.parse(responseText);
  } catch {
    console.error(`Invalid JSON from Apify for "${keyword}"`);
    return [];
  }

  if (!Array.isArray(rawAds)) return [];

  return rawAds
    .map((ad, i) => normalizeAd(ad, i, keyword))
    .filter((ad) => ad.ad_text.length > 30);
}

// ─── Main Handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apifyToken = Deno.env.get("APIFY_TOKEN");
    if (!apifyToken) {
      return jsonResponse({ error: "APIFY_TOKEN not configured" }, 500);
    }

    const {
      keywords,
      countries = ["CO", "MX", "AR"],
      max_ads_per_keyword = 10,
      max_total_ads = 30,
    } = await req.json();

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return jsonResponse({ error: "keywords array required" }, 400);
    }

    const country = countries[0] || "CO";

    // Search all keywords in parallel
    const searchPromises = keywords.map((kw: string) =>
      searchOneKeyword(kw, apifyToken, country, max_ads_per_keyword).catch(
        (err) => {
          console.error(`Search failed for "${kw}":`, err);
          return [] as NormalizedAd[];
        }
      )
    );

    const allResults = await Promise.allSettled(searchPromises);

    // Collect results and track per-keyword counts
    const adsPerKeyword: Record<string, number> = {};
    const allAds: NormalizedAd[] = [];

    for (let i = 0; i < allResults.length; i++) {
      const result = allResults[i];
      const kw = keywords[i];
      if (result.status === "fulfilled") {
        adsPerKeyword[kw] = result.value.length;
        allAds.push(...result.value);
      } else {
        adsPerKeyword[kw] = 0;
      }
    }

    // Deduplicate by ad_id (keep first occurrence)
    const seen = new Set<string>();
    const deduped = allAds.filter((ad) => {
      if (seen.has(ad.ad_id)) return false;
      seen.add(ad.ad_id);
      return true;
    });

    // Also deduplicate by similar ad_text (first 100 chars)
    const seenTexts = new Set<string>();
    const uniqueAds = deduped.filter((ad) => {
      const textKey = ad.ad_text.substring(0, 100).toLowerCase().trim();
      if (seenTexts.has(textKey)) return false;
      seenTexts.add(textKey);
      return true;
    });

    // Sort by days_running desc (proven winners first) and limit
    const finalAds = uniqueAds
      .sort((a, b) => (b.days_running || 0) - (a.days_running || 0))
      .slice(0, max_total_ads);

    console.log(
      `Search complete: ${allAds.length} raw → ${deduped.length} deduped → ${finalAds.length} final`
    );

    return jsonResponse({
      ads: finalAds,
      total: finalAds.length,
      keywords_searched: keywords,
      ads_per_keyword: adsPerKeyword,
    });
  } catch (err) {
    console.error("search-similar-ads error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

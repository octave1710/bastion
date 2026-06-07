import { fetchLivePortfolio, hasProfoundKey } from "@/lib/profound/server";
import { buildCuratedPrompts, BRAND } from "@/lib/data";

// Always fetch fresh — never serve a cached demo response after the key is set.
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

// Returns the prompt portfolio for the War Room. Tries LIVE Profound data first;
// always falls back to demo data so the grid renders no matter what.
const PROFOUND_APP_URL = process.env.PROFOUND_APP_URL?.trim() || "https://platform.tryprofound.com/welcome";

// Demo fallback uses the REAL measured KPIs for the Frontier Models category, so
// even offline the headline reflects truth, not invention.
const DEMO_BRAND_KPIS = {
  shareOfVoice: 0.232,
  visibilityScore: 3.99,
  avgPosition: 0.5,
  rank: 4,
  fieldSize: 8,
  competitors: [
    { name: "Grok", vis: 5.52 },
    { name: "xAI", vis: 5.5 },
    { name: "Gemini", vis: 4.64 },
  ],
};

export async function GET() {
  const live = await fetchLivePortfolio();
  // Only serve live data when the headline KPIs are real. Profound's per-asset
  // visibility queries sometimes come back empty (rate limit / window) → that
  // would render 0.0% / rank 0 of 0. Never show that: fall back to real demo KPIs.
  const bk = live?.brandKpis;
  const kpisOk = !!bk && bk.fieldSize > 0 && bk.shareOfVoice > 0 && bk.visibilityScore > 0;
  if (live && live.prompts.length && kpisOk) {
    return Response.json(
      // The DEFENDED brand is always Anthropic; live.brand is the category name.
      { source: "live", brand: BRAND, category: live.brand, prompts: live.prompts, brandKpis: live.brandKpis, keyPresent: true, profoundUrl: PROFOUND_APP_URL },
      { headers: noStore }
    );
  }
  return Response.json(
    {
      source: "demo",
      brand: BRAND,
      category: "Frontier Models",
      prompts: buildCuratedPrompts(),
      brandKpis: DEMO_BRAND_KPIS,
      keyPresent: hasProfoundKey(),
      profoundUrl: PROFOUND_APP_URL,
    },
    { headers: noStore }
  );
}

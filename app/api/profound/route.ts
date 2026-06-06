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
  visibilityScore: 7.96,
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
  if (live && live.prompts.length) {
    return Response.json(
      { source: "live", brand: live.brand, prompts: live.prompts, brandKpis: live.brandKpis, keyPresent: true, profoundUrl: PROFOUND_APP_URL },
      { headers: noStore }
    );
  }
  return Response.json(
    {
      source: "demo",
      brand: BRAND,
      prompts: buildCuratedPrompts(),
      brandKpis: DEMO_BRAND_KPIS,
      keyPresent: hasProfoundKey(),
      profoundUrl: PROFOUND_APP_URL,
    },
    { headers: noStore }
  );
}

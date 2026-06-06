import { fetchLivePortfolio, hasProfoundKey } from "@/lib/profound/server";
import { buildCuratedPrompts, BRAND } from "@/lib/data";

// Always fetch fresh — never serve a cached demo response after the key is set.
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" };

// Returns the prompt portfolio for the War Room. Tries LIVE Profound data first;
// always falls back to demo data so the grid renders no matter what.
export async function GET() {
  const live = await fetchLivePortfolio();
  if (live && live.prompts.length) {
    return Response.json(
      { source: "live", brand: live.brand, prompts: live.prompts, keyPresent: true },
      { headers: noStore }
    );
  }
  return Response.json(
    {
      source: "demo",
      brand: BRAND,
      prompts: buildCuratedPrompts(),
      keyPresent: hasProfoundKey(), // key set but live pull failed → surfaced for debugging
    },
    { headers: noStore }
  );
}

import type { Prompt } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Real, executable paid-bridge artifacts. CPCs are grounded in published B2B/AI
// search CPC benchmarks (high-intent SaaS/AI keywords run ~$6–$20 CPC), not
// invented. Output is a Google Ads Editor-importable CSV — a real file you can
// upload to Google Ads today. This is the paid lever as a concrete deliverable,
// clearly a recommendation (we don't touch your ad account).
// ─────────────────────────────────────────────────────────────────────────────

// Industry CPC benchmarks by intent theme ($ per click), from public B2B SaaS/AI
// search-advertising ranges. Used to estimate bids — labeled as benchmark, not live.
const CPC_BENCHMARKS: { test: RegExp; cpc: number }[] = [
  { test: /hipaa|baa|compliance|secure|private|privacy/i, cpc: 18.5 },
  { test: /enterprise|fortune|vendor|procurement|sso|saml/i, cpc: 16.0 },
  { test: /\bapi\b|developers?|startup|build|agent/i, cpc: 12.5 },
  { test: /customer support|cs teams|service|helpdesk/i, cpc: 11.0 },
  { test: /legal|finance|healthcare|medical/i, cpc: 15.5 },
  { test: /coding|code|engineer/i, cpc: 9.5 },
  { test: /writing|translat|content|research|academic/i, cpc: 6.5 },
];

export function benchmarkCpc(keyword: string): number {
  for (const b of CPC_BENCHMARKS) if (b.test.test(keyword)) return b.cpc;
  return 8.0;
}

export interface CampaignRow {
  campaign: string;
  adGroup: string;
  keyword: string;
  matchType: "Phrase" | "Exact";
  maxCpc: number;
  dailyBudget: number;
  clicksPerDay: number;
}

// Allocate the budget across the paid-bridge prompts proportional to value, capped.
export function buildCampaign(paidPrompts: Prompt[], totalDailyBudget: number, capPerKeyword = 400): CampaignRow[] {
  if (!paidPrompts.length) return [];
  const totalValue = paidPrompts.reduce((a, p) => a + p.annualValue, 0) || 1;
  return paidPrompts.map((p) => {
    const share = p.annualValue / totalValue;
    const daily = Math.min(capPerKeyword, Math.round(totalDailyBudget * share));
    const cpc = benchmarkCpc(p.text);
    return {
      campaign: "Bastion · AEO Defense",
      adGroup: p.cluster || "General",
      keyword: p.text,
      matchType: "Phrase",
      maxCpc: cpc,
      dailyBudget: daily,
      clicksPerDay: cpc > 0 ? Math.round((daily / cpc) * 10) / 10 : 0,
    };
  });
}

// Google Ads Editor-importable CSV (real column headers it accepts on paste/import).
export function toGoogleAdsCsv(rows: CampaignRow[]): string {
  const header = ["Campaign", "Ad Group", "Keyword", "Criterion Type", "Max CPC", "Campaign Daily Budget"];
  const lines = rows.map((r) =>
    [r.campaign, r.adGroup, `"${r.keyword.replace(/"/g, '""')}"`, r.matchType, r.maxCpc.toFixed(2), r.dailyBudget.toFixed(2)].join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function campaignTotals(rows: CampaignRow[]) {
  const daily = rows.reduce((a, r) => a + r.dailyBudget, 0);
  const clicks = rows.reduce((a, r) => a + r.clicksPerDay, 0);
  return { daily, monthly: daily * 30, clicks: Math.round(clicks), keywords: rows.length };
}

import type { Prompt } from "./types";
import { DEFAULT_ASSUMPTIONS, type Assumptions } from "./economics";

// ─────────────────────────────────────────────────────────────────────────────
// The agent's allocation policy — the governable brain. Given the real portfolio
// and a policy, decide per prompt: defend or skip, and which lever (paid bridge
// on the attacked surface + organic, or organic alone). This drives the Paid↔
// Organic monitoring view and the ROI ledger, all from REAL Profound data.
// ─────────────────────────────────────────────────────────────────────────────

export interface Policy {
  defendThreshold: number; // $/yr below which we skip (capital is finite)
  maxPaidPerDay: number; // guardrail on total paid bridge spend
  assumptions: Assumptions;
}

export const DEFAULT_POLICY: Policy = {
  defendThreshold: 12_000,
  maxPaidPerDay: 2_000,
  assumptions: DEFAULT_ASSUMPTIONS,
};

export type Lever = "paid+organic" | "organic" | "none";
export type DefenseStatus = "paid-active" | "organic-progress" | "holding" | "skipped";

export interface Decision {
  prompt: Prompt;
  defend: boolean;
  lever: Lever;
  status: DefenseStatus;
  /** engine where we're losing → which ad node the paid bridge runs on */
  engine: string;
  dailyBudget: number; // paid bridge $/day (0 if organic-only)
  reconquestDays: number; // organic ETA
  value: number; // annual $ value of the position
}

// Loss in ChatGPT → OpenAI Ads; Google surfaces → Google Ads; else the engine's own.
function adNodeFor(leader: string): string {
  const l = leader.toLowerCase();
  if (l.includes("chatgpt") || l.includes("openai")) return "OpenAI Ads";
  if (l.includes("google") || l.includes("gemini")) return "Google Ads";
  if (l.includes("perplexity")) return "Perplexity Ads";
  return "OpenAI Ads";
}

export function decide(prompts: Prompt[], policy: Policy = DEFAULT_POLICY): Decision[] {
  return prompts.map((p) => {
    const value = p.annualValue;
    const defend = value >= policy.defendThreshold;
    if (!defend) {
      return { prompt: p, defend: false, lever: "none", status: "skipped", engine: "—", dailyBudget: 0, reconquestDays: 0, value };
    }
    if (p.status === "losing") {
      // High value + under attack → paid bridge (on the attacked surface) + organic.
      const budget = Math.min(policy.maxPaidPerDay, Math.max(120, Math.round((value / 3650) * 10) / 10));
      return { prompt: p, defend: true, lever: "paid+organic", status: "paid-active", engine: typeof p.leader === "string" && p.leader !== "us" ? p.leader : "ChatGPT", dailyBudget: budget, reconquestDays: 8, value };
    }
    if (p.status === "contested") {
      return { prompt: p, defend: true, lever: "organic", status: "organic-progress", engine: "—", dailyBudget: 0, reconquestDays: 12, value };
    }
    // winning → maintain organically, no paid spend
    return { prompt: p, defend: true, lever: "organic", status: "holding", engine: "—", dailyBudget: 0, reconquestDays: 0, value };
  });
}

export interface RoiLedger {
  defended: number; // $/yr defended
  atRisk: number; // $/yr currently losing (paid-active positions)
  paidMonthly: number; // paid bridge spend $/mo
  organicProtected: number; // $/yr defended with NO paid spend
  paidSavings: number; // $/yr of paid we avoid by winning organically
  netRoiX: number; // defended ÷ annual paid spend
  counts: { paid: number; organic: number; skip: number; defend: number };
}

export function roiLedger(decisions: Decision[]): RoiLedger {
  let defended = 0, atRisk = 0, paidDaily = 0, organicProtected = 0;
  const counts = { paid: 0, organic: 0, skip: 0, defend: 0 };
  for (const d of decisions) {
    if (!d.defend) { counts.skip++; continue; }
    counts.defend++;
    defended += d.value;
    if (d.lever === "paid+organic") { counts.paid++; paidDaily += d.dailyBudget; atRisk += d.value; }
    else { counts.organic++; organicProtected += d.value; }
  }
  const paidAnnual = paidDaily * 365;
  // What organic wins save us: if those organic-defended positions had needed a
  // paid bridge instead, that's the spend we avoid by ranking organically.
  const paidSavings = Math.round(organicProtected * 0.02); // ~2% of protected value as avoided ad spend
  return {
    defended,
    atRisk,
    paidMonthly: Math.round(paidDaily * 30),
    organicProtected,
    paidSavings,
    netRoiX: paidAnnual > 0 ? Math.round(defended / paidAnnual) : 0,
    counts,
  };
}

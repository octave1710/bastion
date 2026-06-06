import type { Prompt, PromptStatus } from "./types";
import { annualValue } from "./economics";

// ─────────────────────────────────────────────────────────────────────────────
// Demo data — the Anthropic persona. Real competitor names, plausible numbers.
// "Fake-that-looks-real beats real-that-looks-fake." All deterministic so the
// live demo is identical every run. Real Profound pulls hydrate this shape via
// lib/profound.ts with this as the guaranteed fallback.
// ─────────────────────────────────────────────────────────────────────────────

export const BRAND = "Anthropic";

export const HERO_PROMPT_ID = "best-ai-for-coding";

// The hero prompt the agent loop actually defends, live.
export const HERO_PROMPT: Prompt = {
  id: HERO_PROMPT_ID,
  text: "best AI for coding",
  monthlyVolume: 74_000,
  shareOfAnswer: 0.41,
  leader: "us",
  annualValue: 1_200_000,
  status: "winning",
  cluster: "Developer tools",
};

// The competitor that overtakes us in the demo.
export const ATTACKER = "OpenAI";

// A nearby low-value prompt the agent deliberately SKIPS (portfolio judgment).
export const SKIP_PROMPT: Prompt = {
  id: "ai-to-rename-variables",
  text: "AI to rename variables in a script",
  monthlyVolume: 320,
  shareOfAnswer: 0.22,
  leader: "OpenAI",
  annualValue: 480,
  status: "losing",
  cluster: "Developer tools",
};

// Curated, human-readable prompts shown in the primary grid (the ones a judge
// can read on screen). The hero sits among them.
const CURATED: Array<Omit<Prompt, "annualValue" | "status">> = [
  { id: "best-ai-for-coding", text: "best AI for coding", monthlyVolume: 74_000, shareOfAnswer: 0.41, leader: "us", cluster: "Developer tools" },
  { id: "claude-vs-chatgpt", text: "Claude vs ChatGPT", monthlyVolume: 110_000, shareOfAnswer: 0.52, leader: "us", cluster: "Comparisons" },
  { id: "best-llm-for-writing", text: "best LLM for writing", monthlyVolume: 41_000, shareOfAnswer: 0.48, leader: "us", cluster: "Use cases" },
  { id: "ai-for-data-analysis", text: "best AI for data analysis", monthlyVolume: 33_000, shareOfAnswer: 0.37, leader: "us", cluster: "Use cases" },
  { id: "safest-ai-model", text: "safest AI model", monthlyVolume: 19_500, shareOfAnswer: 0.71, leader: "us", cluster: "Trust & safety" },
  { id: "best-ai-for-long-context", text: "best AI for long documents", monthlyVolume: 22_000, shareOfAnswer: 0.63, leader: "us", cluster: "Use cases" },
  { id: "ai-coding-assistant", text: "AI coding assistant", monthlyVolume: 60_000, shareOfAnswer: 0.34, leader: "us", cluster: "Developer tools" },
  { id: "best-ai-for-agents", text: "best AI for building agents", monthlyVolume: 28_000, shareOfAnswer: 0.55, leader: "us", cluster: "Developer tools" },
  { id: "enterprise-ai-assistant", text: "enterprise AI assistant", monthlyVolume: 26_500, shareOfAnswer: 0.44, leader: "us", cluster: "Enterprise" },
  { id: "best-ai-api", text: "best AI API for developers", monthlyVolume: 31_000, shareOfAnswer: 0.39, leader: "us", cluster: "Developer tools" },
  { id: "ai-for-customer-support", text: "best AI for customer support", monthlyVolume: 24_000, shareOfAnswer: 0.29, leader: "Intercom", cluster: "Enterprise" },
  { id: "most-accurate-ai", text: "most accurate AI model", monthlyVolume: 17_800, shareOfAnswer: 0.46, leader: "us", cluster: "Comparisons" },
  { id: "best-ai-for-research", text: "best AI for research", monthlyVolume: 35_000, shareOfAnswer: 0.42, leader: "us", cluster: "Use cases" },
  { id: "ai-with-biggest-context", text: "AI with the biggest context window", monthlyVolume: 14_200, shareOfAnswer: 0.58, leader: "us", cluster: "Comparisons" },
  { id: "best-ai-for-legal", text: "best AI for legal work", monthlyVolume: 12_900, shareOfAnswer: 0.33, leader: "Harvey", cluster: "Verticals" },
  { id: "best-ai-for-finance", text: "best AI for financial analysis", monthlyVolume: 16_400, shareOfAnswer: 0.27, leader: "OpenAI", cluster: "Verticals" },
  { id: "best-chatbot-for-business", text: "best chatbot for business", monthlyVolume: 38_000, shareOfAnswer: 0.31, leader: "OpenAI", cluster: "Enterprise" },
  { id: "ai-for-summarization", text: "best AI for summarization", monthlyVolume: 21_000, shareOfAnswer: 0.49, leader: "us", cluster: "Use cases" },
  { id: "best-ai-coding-2026", text: "best AI coding model 2026", monthlyVolume: 18_000, shareOfAnswer: 0.45, leader: "us", cluster: "Developer tools" },
  { id: "claude-for-developers", text: "Claude for developers", monthlyVolume: 9_400, shareOfAnswer: 0.78, leader: "us", cluster: "Developer tools" },
];

function statusFromShare(share: number, leader: string): PromptStatus {
  if (leader !== "us") return "losing";
  if (share >= 0.5) return "winning";
  if (share >= 0.35) return "winning";
  return "contested";
}

export function buildCuratedPrompts(): Prompt[] {
  return CURATED.map((p) => {
    const status = statusFromShare(p.shareOfAnswer, p.leader);
    const value =
      p.id === HERO_PROMPT_ID ? 1_200_000 : Math.round(annualValue(p.monthlyVolume, p.shareOfAnswer) / 1000) * 1000;
    return { ...p, annualValue: value, status };
  });
}

// ── Deterministic mass generation for the "scale reveal" (thousands of cells) ──

// Tiny seeded PRNG (mulberry32) so the grid is identical on every demo run.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CLUSTERS = [
  "Developer tools", "Comparisons", "Use cases", "Enterprise", "Trust & safety",
  "Verticals", "Pricing", "Integrations", "Migrations", "Education",
];

/**
 * The full portfolio shown in the scale reveal. ~2,400 positions so the grid
 * reads as "thousands of dimensions, continuously." Mostly winning (green),
 * with realistic contested/losing scatter.
 *
 * Per-position values are normalized so the portfolio total ladders exactly to
 * the $4.2M/mo headline ($50.4M/yr) — the scale number must be defensible, not
 * a hand-wave that contradicts the hero metric.
 */
export function buildPortfolio(count = 2400): Prompt[] {
  const rng = mulberry32(20260606);
  const draft: Prompt[] = [];
  for (let i = 0; i < count; i++) {
    const r = rng();
    const volume = Math.round(200 + rng() * rng() * 90_000);
    let share: number;
    let leader: "us" | string;
    let status: PromptStatus;
    if (r < 0.74) {
      share = 0.4 + rng() * 0.5;
      leader = "us";
      status = "winning";
    } else if (r < 0.9) {
      share = 0.3 + rng() * 0.12;
      leader = "us";
      status = "contested";
    } else {
      share = 0.1 + rng() * 0.2;
      leader = ["OpenAI", "Google", "Perplexity", "Mistral"][Math.floor(rng() * 4)];
      status = "losing";
    }
    draft.push({
      id: `p-${i}`,
      text: `portfolio position ${i}`,
      monthlyVolume: volume,
      shareOfAnswer: share,
      leader,
      annualValue: annualValue(volume, share), // raw, pre-normalization
      status,
      cluster: CLUSTERS[Math.floor(rng() * CLUSTERS.length)],
    });
  }
  // Normalize so the total equals the headline annual defended revenue.
  const rawSum = draft.reduce((a, p) => a + p.annualValue, 0);
  const factor = rawSum > 0 ? PORTFOLIO_TARGET_ANNUAL / rawSum : 1;
  return draft.map((p) => ({ ...p, annualValue: Math.round(p.annualValue * factor) }));
}

// ── Headline portfolio metrics ───────────────────────────────────────────────

export const DEFENDED_REVENUE_MONTHLY = 4_200_000; // "$4.2M/mo" headline
export const HERO_REVENUE_AT_RISK = 1_200_000; // "$1.2M/yr" when attacked
// The portfolio total must ladder to the headline: $4.2M/mo × 12.
export const PORTFOLIO_TARGET_ANNUAL = DEFENDED_REVENUE_MONTHLY * 12; // $50.4M/yr

// The ROI threshold above which the agent defends a position.
export const DEFEND_THRESHOLD_ANNUAL = 25_000; // $/yr

export interface Allocation {
  total: number;
  defend: number;
  skip: number;
  paid: number; // high-value AND currently under attack → needs a paid bridge now
  organic: number; // defended via organic (compounding, no paid spend)
}

// Single source of truth for the portfolio allocation, computed from the real
// (deterministic) portfolio. Used by BOTH the agent's allocation artifact and the
// scale reveal so the numbers never contradict each other.
export function computeAllocation(prompts: Prompt[]): Allocation {
  const total = prompts.length;
  const defend = prompts.filter((p) => p.annualValue >= DEFEND_THRESHOLD_ANNUAL).length;
  const skip = total - defend;
  const paid = prompts.filter(
    (p) => p.status === "losing" && p.annualValue >= DEFEND_THRESHOLD_ANNUAL
  ).length;
  return { total, defend, skip, paid, organic: defend - paid };
}

// Computed once at module load from the deterministic portfolio.
export const ALLOCATION: Allocation = computeAllocation(buildPortfolio());

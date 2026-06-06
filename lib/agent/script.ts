import type { AgentStep } from "../types";
import { ALLOCATION, ATTACKER, BRAND, HERO_PROMPT, SKIP_PROMPT } from "../data";
import { fmtUSD } from "../economics";

// ─────────────────────────────────────────────────────────────────────────────
// The autonomous riposte, as a deterministic, streamable script.
//
// This is the agent's *reasoning*, rendered to screen the way it actually runs.
// Three depth upgrades make the single loop visibly intelligent:
//   #1 TEARDOWN  — extract the competitor's specific cited claims (not generic).
//   #3 ALLOCATION — treat the whole grid as a $-valued portfolio; defend/skip +
//                   paid/organic per-prompt by ROI across thousands of dimensions.
//   #2 SELF-EVAL — draft → score → (below threshold) → revise → re-score → ship.
//
// The arbitrage thesis is the load-bearing idea:
//   Paid = a temporary BRIDGE to hold the position right now.
//   Organic = the permanent WIN that reclaims it and lets you stop paying.
// The agent arbitrates between the two by urgency × dollar value.
// ─────────────────────────────────────────────────────────────────────────────

export const RIPOSTE_SCRIPT: AgentStep[] = [
  {
    kind: "detect",
    label: "DETECT",
    dwellMs: 3000,
    lines: [
      `Monitoring 2,400 positions across ChatGPT · Claude · Gemini · Perplexity.`,
      `⚠ Share-of-answer drop on "${HERO_PROMPT.text}": 41% → 23% in 6h.`,
      `${ATTACKER} now leads the citation on 4 of 5 engines.`,
      `Position value: ${fmtUSD(HERO_PROMPT.annualValue)}/yr. Flagging for riposte.`,
    ],
  },
  {
    // Addendum #1 — real competitive teardown.
    kind: "teardown",
    label: "TEARDOWN · WHY THEY WON",
    dwellMs: 4200,
    lines: [
      `Fetching the page engines now cite for this prompt…`,
      `Reading ${ATTACKER}'s newly-published benchmark page. Extracting the specific`,
      `claims the answer engines are quoting — so the counter targets them exactly:`,
    ],
    artifact: {
      type: "teardown",
      competitor: ATTACKER,
      url: `openai.com/index/gpt-coding-benchmarks`,
      publishedAgo: "2 days ago",
      claims: [
        { claim: "“fastest code generation”", metric: "tokens/sec on HumanEval", ourGap: "our page makes no speed claim" },
        { claim: "“highest SWE-bench score”", metric: "69.1% SWE-bench Verified", ourGap: "we don’t cite a benchmark" },
        { claim: "“lowest latency at scale”", metric: "p95 latency, 8k ctx", ourGap: "no latency data on our page" },
      ],
    },
  },
  {
    kind: "value-check",
    label: "VALUE-CHECK",
    dwellMs: 3000,
    lines: [
      `Is this position worth defending?`,
      `  volume 74,000/mo × Δshare 18pts × CTR 6% × conv 0.5% × ACV $25,000`,
      `  → ${fmtUSD(HERO_PROMPT.annualValue)}/yr at risk.`,
      `Threshold to defend: $25,000/yr. ${fmtUSD(HERO_PROMPT.annualValue)} ≫ threshold → DEFEND.`,
    ],
  },
  {
    // Addendum #3 — portfolio allocation across thousands of dimensions.
    kind: "allocation",
    label: "ALLOCATE · 2,400-POSITION PORTFOLIO",
    dwellMs: 4600,
    lines: [
      `Ranking the entire portfolio by ROI and assigning a lever to each position.`,
      `Paid bridges only where urgency is high; organic everywhere it pays back:`,
    ],
    artifact: {
      type: "allocation",
      total: ALLOCATION.total,
      defend: ALLOCATION.defend,
      skip: ALLOCATION.skip,
      paid: ALLOCATION.paid,
      organic: ALLOCATION.organic,
      tiers: [
        { label: "High value · under attack", count: ALLOCATION.paid, action: "defend", lever: "paid+organic", note: "paid bridge now + organic to reclaim" },
        { label: "High value · holding", count: ALLOCATION.organic, action: "defend", lever: "organic", note: "organic compounding; no paid spend" },
        { label: "Low value · below threshold", count: ALLOCATION.skip, action: "skip", lever: "none", note: "defending costs more than it returns" },
      ],
      arbitrage: { bridgeCostMonthly: 10_200, protectedAnnual: 1_200_000, organicDays: 8 },
    },
  },
  {
    // Visible guardrail beat #2: judgment, not blind action — one concrete skip.
    kind: "skip",
    label: "SKIP · PORTFOLIO JUDGMENT",
    dwellMs: 3000,
    lines: [
      `Example from the skip list: "${SKIP_PROMPT.text}".`,
      `  value ${fmtUSD(SKIP_PROMPT.annualValue)}/yr — below the $25,000 defend threshold.`,
      `Paid CPC alone would exceed the position's annual value.`,
      `Decision: SKIP. Capital is finite; we defend the portfolio, not every cell.`,
    ],
  },
  {
    kind: "decide",
    label: "DECIDE · PAID↔ORGANIC ARBITRAGE",
    dwellMs: 4200,
    lines: [
      `Hero prompt, two levers arbitraged by urgency × value:`,
      `  ▸ PAID BRIDGE — hold the position *right now* while organic ships.`,
      `    $340/day on ${ATTACKER}-overlapping keywords. ~$2,700 over ~8 days.`,
      `  ▸ ORGANIC WIN — rebut all 3 claims to reclaim it *permanently*, then`,
      `    taper paid to $0. Organic ranks in ~8 days.`,
      `Math: ~$2,700 bridge protects ${fmtUSD(HERO_PROMPT.annualValue)}/yr of at-risk revenue → do both.`,
    ],
  },
  {
    kind: "act",
    label: "ACT · PAID BRIDGE",
    dwellMs: 2600,
    lines: [`Drafting Google Ads bid recommendation (recommend-only — never auto-spends)…`],
    artifact: {
      type: "bid",
      platform: "Google Ads",
      prompt: HERO_PROMPT.text,
      dailyBudget: 340,
      cpc: 6.2,
      rationale: `Temporary bridge to hold share on "${HERO_PROMPT.text}" while the organic counter-page indexes. Auto-taper as organic share recovers past 40%.`,
    },
  },
  {
    kind: "act",
    label: "ACT · ORGANIC COUNTER-PAGE",
    dwellMs: 3000,
    lines: [`Drafting counter-content that rebuts the 3 extracted claims with our evidence…`],
    artifact: {
      type: "content",
      title: `${BRAND} for coding: the benchmarks ${ATTACKER} left out`,
      url: `/compare/best-ai-for-coding`,
      claims: [
        `Speed → SWE-bench Verified: ${BRAND} 73.2% vs ${ATTACKER} 69.1% (independent, Mar 2026).`,
        `Benchmark → sustained agentic coding: 30+ hr autonomous runs, no human handoff.`,
        `Latency → parity at 2× the context — full-repo reasoning the benchmark omits.`,
      ],
      body: `Point-by-point rebuttal targeting the exact three claims the engines quote, with citable third-party benchmarks so engines re-attribute the position to ${BRAND}.`,
    },
  },
  {
    // Visible guardrail beat #1: the quality gate WITH a revise loop.
    kind: "self-eval",
    label: "SELF-EVAL · QUALITY GATE",
    dwellMs: 4600,
    lines: [
      `Before publishing — does this draft actually beat ${ATTACKER}'s page, claim by claim?`,
      `Scoring head-to-head. Ship threshold: 8.0/10.`,
    ],
    artifact: {
      type: "self-eval",
      threshold: 8.0,
      outOf: 10,
      rounds: [
        {
          version: "draft v1",
          score: 6.8,
          claimsWon: 1,
          claimsTotal: 3,
          verdict: "revise",
          note: "Wins on SWE-bench, but no third-party citation and silent on latency. Below 8.0 → revise.",
        },
        {
          version: "draft v2",
          score: 8.4,
          claimsWon: 3,
          claimsTotal: 3,
          verdict: "ship",
          note: "Added independent benchmark citation + latency-at-context data. Beats competitor 3/3 → ship.",
        },
      ],
    },
  },
  {
    kind: "act",
    label: "ACT · ALERT",
    dwellMs: 2400,
    lines: [`Posting to the growth team so a human stays in the loop…`],
    artifact: {
      type: "slack",
      channel: "#aeo-war-room",
      message: `🛡 Riposte fired on *"${HERO_PROMPT.text}"* (${fmtUSD(HERO_PROMPT.annualValue)}/yr).\n${ATTACKER} overtook us via a 2-day-old benchmark page. Deployed: $340/day paid bridge + organic counter-page (self-eval revised v1→v2, 8.4/10, beats them 3/3). Share recovering. Paid auto-tapers as organic indexes (~8 days).`,
    },
  },
];

// Total scripted runtime, for pacing the headline counters against the console.
export const RIPOSTE_TOTAL_MS = RIPOSTE_SCRIPT.reduce((a, s) => a + s.dwellMs, 0);

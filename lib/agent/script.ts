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
      `  volume 74,000/mo × 12 × CTR 9% × conv 0.75% × ACV $2,000  (volume = real Profound data)`,
      `  → ${fmtUSD(HERO_PROMPT.annualValue)}/yr — the full position value, now at risk.`,
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
    // #2 — the differentiator: BOTH levers on the hero, orchestrated over time.
    kind: "decide",
    label: "DECIDE · ORCHESTRATE PAID↔ORGANIC",
    dwellMs: 5000,
    lines: [
      `We lost the citation inside ChatGPT — so the paid bridge runs on ${ATTACKER} Ads (same surface).`,
      `One position, two levers, one brain — orchestrated over the reconquest window:`,
    ],
    artifact: {
      type: "split",
      paid: {
        node: `${ATTACKER} Ads`,
        engine: "ChatGPT",
        dailyBudget: 340,
        holdsNow: "holds the citation NOW",
        autoStop: "auto-stops the moment organic share goes green",
      },
      organic: {
        mode: "update",
        reconquestDay: 8,
        permanent: "permanent fix — reclaims the position, then we stop paying",
      },
      window: { days: 8, bridgeCost: 2720, protectedRevenue: 26000, positionAnnual: HERO_PROMPT.annualValue },
    },
  },
  {
    // #1 — paid bridge on the attacked surface: OpenAI Ads (ChatGPT), not Google.
    kind: "act",
    label: "ACT · PAID BRIDGE",
    dwellMs: 2600,
    lines: [`Drafting the ${ATTACKER} Ads campaign for ChatGPT (recommend-only — never auto-spends)…`],
    artifact: {
      type: "bid",
      platform: `${ATTACKER} Ads`,
      engine: "ChatGPT",
      prompt: HERO_PROMPT.text,
      dailyBudget: 340,
      cpc: 6.2,
      rationale: `Sponsored placement in ChatGPT answers for "${HERO_PROMPT.text}" — the exact surface ${ATTACKER} overtook. Temporary; auto-tapers to $0 as the organic update reclaims share past 40%.`,
    },
  },
  {
    // #3 — UPDATE an existing cited page (faster reconquest) vs CREATE new.
    kind: "act",
    label: "ACT · ORGANIC (UPDATE)",
    dwellMs: 3600,
    lines: [
      `Profound check: are we already cited on this topic?`,
      `Yes — our page is cited at anthropic.com/claude/coding. UPDATE beats CREATE`,
      `(already crawled → faster reconquest). Drafting a targeted patch, not a new page.`,
    ],
    artifact: {
      type: "content",
      mode: "update",
      title: `Patch: ${BRAND} for coding — close the 3 claim gaps`,
      url: `/claude/coding`,
      existingUrl: `anthropic.com/claude/coding`,
      claims: ["SWE-bench", "agentic coding", "latency"],
      patchBlocks: [
        {
          claim: "SWE-bench",
          before: `“strong coding performance”`,
          after: `“73.2% SWE-bench Verified vs ${ATTACKER} 69.1% — independent, Mar 2026”`,
        },
        { claim: "agentic", before: `(no claim on our page)`, after: `“30+ hr sustained autonomous coding, no human handoff”` },
        { claim: "latency", before: `(no claim on our page)`, after: `“latency parity at 2× context — full-repo reasoning”` },
      ],
      body: `Targeted diff against the existing cited page — three patch blocks closing the exact gaps ${ATTACKER} exploited. Recommendation only: staged for human approval, never auto-published.`,
      actions: ["Copy patch", "Open PR", "Export draft"],
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
      message: `🛡 Riposte fired on *"${HERO_PROMPT.text}"* (${fmtUSD(HERO_PROMPT.annualValue)}/yr).\n${ATTACKER} overtook us inside ChatGPT via a 2-day-old benchmark page. Deployed: $340/day ${ATTACKER} Ads bridge (same surface) + organic UPDATE to anthropic.com/claude/coding (self-eval revised v1→v2, 8.4/10, beats them 3/3). Both staged for approval. Paid auto-stops when organic share goes green (~Day 8).`,
    },
  },
];

// Total scripted runtime, for pacing the headline counters against the console.
export const RIPOSTE_TOTAL_MS = RIPOSTE_SCRIPT.reduce((a, s) => a + s.dwellMs, 0);

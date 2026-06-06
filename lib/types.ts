// ─────────────────────────────────────────────────────────────────────────────
// BASTION — core domain types
// The trading desk for your brand's share of AI answers.
// Every high-intent prompt is a dollar-valued asset in a defended portfolio.
// ─────────────────────────────────────────────────────────────────────────────

export type PromptStatus = "winning" | "contested" | "losing" | "skipped";

export type Engine = "ChatGPT" | "Claude" | "Gemini" | "Perplexity" | "Copilot";

export interface Prompt {
  id: string;
  text: string;
  /** Estimated monthly search/prompt volume — basis for dollar valuation. */
  monthlyVolume: number;
  /** Our current share of answer (0–1) across engines. */
  shareOfAnswer: number;
  /** Who currently leads the citation, if not us. */
  leader: "us" | string;
  /** Annualized pipeline value defended by holding this position. */
  annualValue: number;
  status: PromptStatus;
  /** Cluster label for the scale grid. */
  cluster: string;
}

export interface EconomicsInputs {
  monthlyVolume: number;
  /** Change in share-of-answer we are defending (0–1). */
  shareDelta: number;
  /** Estimated click-through from an AI answer citation to site (0–1). */
  clickThrough: number;
  /** Site conversion rate (0–1). */
  conversionRate: number;
  /** Average contract / customer value in dollars. */
  acv: number;
}

// The autonomous agent's reasoning, streamed to screen.
export type AgentStepKind =
  | "detect"
  | "teardown" // competitive teardown: extract the competitor's specific cited claims
  | "value-check"
  | "allocation" // portfolio allocation: defend/skip + paid/organic by ROI across thousands
  | "skip" // portfolio judgment: decline to defend a low-value prompt
  | "decide"
  | "self-eval" // visible quality gate with a revise loop
  | "act";

export interface AgentStep {
  kind: AgentStepKind;
  /** Terminal-style label, e.g. "DETECT". */
  label: string;
  /** Streamed reasoning lines. */
  lines: string[];
  /** A concrete artifact produced by this step (bid rec, draft, Slack post). */
  artifact?: AgentArtifact;
  /** ms to dwell before advancing — tuned for live narration. */
  dwellMs: number;
}

export interface TeardownClaim {
  claim: string;
  metric: string;
  ourGap: string;
}

export interface AllocationTier {
  label: string;
  count: number;
  action: "defend" | "skip";
  lever: "paid+organic" | "organic" | "paid bridge" | "none";
  note: string;
}

export interface EvalRound {
  version: string;
  score: number;
  claimsWon: number;
  claimsTotal: number;
  verdict: "ship" | "revise";
  note: string;
}

export type AgentArtifact =
  // Addendum #1 — real competitive teardown: the specific claims the competitor's
  // newly-cited page won on, extracted explicitly.
  | {
      type: "teardown";
      competitor: string;
      url: string;
      publishedAgo: string;
      claims: TeardownClaim[];
    }
  // Addendum #3 — portfolio allocation: per-tier defend/skip + paid/organic by ROI.
  | {
      type: "allocation";
      total: number;
      defend: number;
      skip: number;
      paid: number;
      organic: number;
      tiers: AllocationTier[];
      arbitrage: { bridgeCostMonthly: number; protectedAnnual: number; organicDays: number };
    }
  // #2 — the paid↔organic split: both levers on the hero, orchestrated over time.
  | {
      type: "split";
      paid: { node: string; engine: string; dailyBudget: number; holdsNow: string; autoStop: string };
      organic: { mode: "update" | "create"; reconquestDay: number; permanent: string };
      window: { days: number; bridgeCost: number; protectedRevenue: number; positionAnnual: number };
    }
  // #1 — paid bridge on the SAME surface as the loss (engine-specific ad node).
  | { type: "bid"; platform: string; engine: string; prompt: string; dailyBudget: number; cpc: number; rationale: string }
  // #3 — organic fix as UPDATE (patch an existing cited page) or CREATE (new page).
  | {
      type: "content";
      mode: "update" | "create";
      title: string;
      url: string;
      existingUrl?: string;
      claims: string[];
      patchBlocks?: { claim: string; before: string; after: string }[];
      body: string;
      actions: string[];
    }
  // Addendum #2 — self-eval REVISE loop: draft → score → (below threshold) → revise → re-score → ship.
  | {
      type: "self-eval";
      threshold: number;
      outOf: number;
      rounds: EvalRound[];
    }
  | { type: "slack"; channel: string; message: string };

export type DemoPhase =
  | "peacetime"
  | "attack"
  | "riposte"
  | "payoff"
  | "scale";

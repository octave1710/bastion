"use client";

import { motion } from "framer-motion";
import type { AgentArtifact } from "@/lib/types";
import { compactUSD, fmtInt, fmtUSD } from "@/lib/economics";

// Concrete outputs the agent produces. The agent ACTS — it doesn't just analyze.
export function Artifact({ artifact }: { artifact: AgentArtifact }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mt-2 rounded-md border border-border-strong bg-bg overflow-hidden shadow-[0_8px_24px_-12px_rgba(0,0,0,0.8)]"
    >
      {artifact.type === "teardown" && <TeardownCard a={artifact} />}
      {artifact.type === "allocation" && <AllocationCard a={artifact} />}
      {artifact.type === "bid" && <BidCard a={artifact} />}
      {artifact.type === "content" && <ContentCard a={artifact} />}
      {artifact.type === "self-eval" && <SelfEvalCard a={artifact} />}
      {artifact.type === "slack" && <SlackCard a={artifact} />}
    </motion.div>
  );
}

function Header({ tag, color, label }: { tag: string; color: string; label: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-bg-elev">
      <span className="eyebrow" style={{ color }}>
        {tag}
      </span>
      <span className="text-[10px] text-fg-dim font-mono">{label}</span>
    </div>
  );
}

// ── Addendum #1: competitive teardown ────────────────────────────────────────
function TeardownCard({ a }: { a: Extract<AgentArtifact, { type: "teardown" }> }) {
  return (
    <>
      <Header tag="◈ Competitive teardown" color="var(--red)" label={`${a.competitor} · ${a.url}`} />
      <div className="px-3 py-2.5">
        <p className="text-[11px] text-fg-dim mb-2">
          Published <span className="text-red">{a.publishedAgo}</span> · engines quote these claims:
        </p>
        <div className="space-y-1.5">
          {a.claims.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.25 }}
              className="grid grid-cols-[auto_1fr] gap-2 items-start text-[11px]"
            >
              <span className="tnum text-red mt-px">{i + 1}.</span>
              <div>
                <span className="text-fg/90">{c.claim}</span>
                <span className="text-fg-dim"> — {c.metric}</span>
                <div className="text-[10px] text-amber/80 mt-0.5">↳ gap: {c.ourGap}</div>
              </div>
            </motion.div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-fg-dim">
          The counter-page will target these exact 3 claims — not generic content.
        </p>
      </div>
    </>
  );
}

// ── Addendum #3: portfolio allocation ────────────────────────────────────────
function AllocationCard({ a }: { a: Extract<AgentArtifact, { type: "allocation" }> }) {
  const leverColor: Record<string, string> = {
    "paid+organic": "var(--blue)",
    organic: "var(--violet)",
    "paid bridge": "var(--blue)",
    none: "var(--fg-dim)",
  };
  return (
    <>
      <Header tag="▦ Portfolio allocation" color="var(--green)" label={`${fmtInt(a.total)} positions · by ROI`} />
      <div className="px-3 py-2.5">
        <div className="grid grid-cols-4 gap-2 mb-2.5">
          <Stat label="defend" value={fmtInt(a.defend)} color="var(--green)" />
          <Stat label="skip" value={fmtInt(a.skip)} color="var(--fg-dim)" />
          <Stat label="paid bridge" value={fmtInt(a.paid)} color="var(--blue)" />
          <Stat label="organic" value={fmtInt(a.organic)} color="var(--violet)" />
        </div>
        <div className="space-y-1">
          {a.tiers.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.2 }}
              className="flex items-center gap-2 text-[11px] py-1 border-b border-border/50 last:border-0"
            >
              <span className="tnum text-fg/90 w-10 shrink-0">{fmtInt(t.count)}</span>
              <span
                className="text-[9px] px-1.5 py-0.5 rounded shrink-0 font-semibold tracking-wide"
                style={{
                  color: t.action === "skip" ? "var(--fg-dim)" : "var(--green)",
                  background: t.action === "skip" ? "var(--bg-elev)" : "rgba(25,224,122,0.12)",
                }}
              >
                {t.action.toUpperCase()}
              </span>
              <span className="text-[10px] shrink-0" style={{ color: leverColor[t.lever] }}>
                {t.lever}
              </span>
              <span className="text-fg-dim text-[10px] truncate">{t.note}</span>
            </motion.div>
          ))}
        </div>
        <div className="mt-2.5 rounded bg-bg-elev px-2.5 py-2 text-[11px] leading-snug">
          <span className="text-green">Arbitrage:</span>{" "}
          <span className="text-blue tnum">{fmtUSD(a.arbitrage.bridgeCostMonthly)}/mo</span> paid bridge holds{" "}
          <span className="text-green tnum">{compactUSD(a.arbitrage.protectedAnnual)}/yr</span> of at-risk revenue while
          organic ranks in ~{a.arbitrage.organicDays} days — then paid tapers to{" "}
          <span className="text-violet tnum">$0</span>. Permanent win, temporary cost.
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded bg-bg-elev px-2 py-1.5">
      <div className="tnum text-base leading-none" style={{ color }}>
        {value}
      </div>
      <div className="eyebrow !text-[8px] mt-1">{label}</div>
    </div>
  );
}

function BidCard({ a }: { a: Extract<AgentArtifact, { type: "bid" }> }) {
  return (
    <>
      <Header tag="◆ Paid bridge" color="var(--blue)" label={a.platform} />
      <div className="px-3 py-2.5 text-[12px]">
        <div className="flex items-baseline justify-between">
          <span className="text-fg-muted">Recommended daily budget</span>
          <span className="tnum text-blue text-lg">{fmtUSD(a.dailyBudget)}/day</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-fg-muted">Target prompt</span>
          <span className="text-fg/90">&ldquo;{a.prompt}&rdquo;</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-fg-muted">Est. CPC</span>
          <span className="tnum text-fg/90">{fmtUSD(a.cpc)}</span>
        </div>
        <p className="mt-2 text-[11px] text-fg-dim leading-snug">{a.rationale}</p>
        <div className="mt-2 inline-flex items-center gap-1 rounded bg-blue/10 px-1.5 py-0.5 text-[10px] text-blue">
          recommend-only · never auto-spends
        </div>
      </div>
    </>
  );
}

function ContentCard({ a }: { a: Extract<AgentArtifact, { type: "content" }> }) {
  return (
    <>
      <Header tag="◆ Organic counter-page" color="var(--violet)" label={a.url} />
      <div className="px-3 py-2.5 text-[12px]">
        <p className="text-fg font-medium leading-snug">{a.title}</p>
        <ul className="mt-2 space-y-1">
          {a.claims.map((c, i) => (
            <li key={i} className="flex gap-1.5 text-[11px] text-fg-muted leading-snug">
              <span className="text-violet">↳</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-fg-dim leading-snug">{a.body}</p>
      </div>
    </>
  );
}

// ── Addendum #2: self-eval with a revise loop ────────────────────────────────
function SelfEvalCard({ a }: { a: Extract<AgentArtifact, { type: "self-eval" }> }) {
  return (
    <>
      <Header tag="◇ Quality gate · self-eval" color="var(--amber)" label={`ship ≥ ${a.threshold}/${a.outOf}`} />
      <div className="px-3 py-2.5 space-y-2">
        {a.rounds.map((r, i) => {
          const ship = r.verdict === "ship";
          const c = ship ? "var(--green)" : "var(--amber)";
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.9 }}
              className="rounded border px-2.5 py-2"
              style={{ borderColor: `${c}40`, background: `${c}0d` }}
            >
              <div className="flex items-center gap-3">
                <span className="eyebrow !text-[9px] text-fg-dim w-12">{r.version}</span>
                <div className="flex items-baseline gap-1">
                  <span className="tnum text-xl font-semibold" style={{ color: c }}>
                    {r.score}
                  </span>
                  <span className="tnum text-fg-dim text-[11px]">/ {a.outOf}</span>
                </div>
                <span className="text-[10px] text-fg-muted">
                  beats <span className="tnum" style={{ color: c }}>{r.claimsWon}/{r.claimsTotal}</span> claims
                </span>
                <span
                  className="ml-auto rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide"
                  style={{ color: c, background: `${c}1f` }}
                >
                  {ship ? "✓ SHIP" : "↻ REVISE"}
                </span>
              </div>
              <p className="mt-1.5 text-[10px] text-fg-dim leading-snug">{r.note}</p>
            </motion.div>
          );
        })}
        <p className="text-[10px] text-fg-dim">
          The agent caught its own weak draft and revised before publishing — eval loop, not blind output.
        </p>
      </div>
    </>
  );
}

function SlackCard({ a }: { a: Extract<AgentArtifact, { type: "slack" }> }) {
  return (
    <>
      <Header tag="◆ Alert" color="var(--green)" label={a.channel} />
      <div className="px-3 py-2.5">
        <p className="text-[12px] text-fg/90 whitespace-pre-line leading-snug">{a.message}</p>
        <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-fg-dim">
          posted · human kept in the loop
        </div>
      </div>
    </>
  );
}

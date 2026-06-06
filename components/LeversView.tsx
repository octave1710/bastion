"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { Prompt } from "@/lib/types";
import { decide, roiLedger, type Policy } from "@/lib/policy";
import { compactUSD, fmtUSD, fmtInt } from "@/lib/economics";
import { SendAlert } from "./SendAlert";

// The Paid ↔ Organic monitoring console + ROI ledger + the EDITABLE agent policy.
// Every row is a REAL decision on a REAL Profound prompt, and changing the policy
// recomputes everything live — the agent is governable, not a black box.
export function LeversView({
  prompts,
  policy,
  onPolicyChange,
}: {
  prompts: Prompt[];
  policy: Policy;
  onPolicyChange: (p: Policy) => void;
}) {
  const { decisions, ledger } = useMemo(() => {
    const decisions = decide(prompts, policy).sort((a, b) => b.value - a.value);
    return { decisions, ledger: roiLedger(decisions) };
  }, [prompts, policy]);

  const paid = decisions.filter((d) => d.status === "paid-active");
  const organic = decisions.filter((d) => d.status === "organic-progress" || d.status === "holding");

  return (
    <div className="flex flex-col gap-5">
      <PolicyBar policy={policy} onChange={onPolicyChange} counts={ledger.counts} />

      {/* ROI ledger — CFO-grade */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="eyebrow text-fg-muted">
            ROI ledger <span className="text-amber">· illustrative $ model (volume × CTR × conv × ACV) — not a measurement</span>
          </span>
          <SendAlert
            getMessage={() =>
              `🛡 *Bastion digest* — defending ${compactUSD(ledger.defended)}/yr across ${ledger.counts.defend} positions.\n` +
              `${ledger.counts.paid} paid bridges live (${compactUSD(ledger.paidMonthly)}/mo), ${ledger.counts.organic} held organically, ${ledger.counts.skip} skipped by ROI.\n` +
              `Revenue at risk: ${compactUSD(ledger.atRisk)}/yr · Net ROI ${ledger.netRoiX}×.`
            }
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border border border-border panel-elev rounded-sm overflow-hidden">
          <Ledger label="Defended /yr" value={compactUSD(ledger.defended)} color="var(--green)" big />
          <Ledger label="Revenue at risk" value={compactUSD(ledger.atRisk)} color="var(--red)" big />
          <Ledger label="Paid spend /mo" value={compactUSD(ledger.paidMonthly)} color="var(--blue)" />
          <Ledger label="Won organically" value={compactUSD(ledger.organicProtected)} color="var(--violet)" />
          <Ledger label="Net ROI" value={`${ledger.netRoiX}×`} color="var(--green)" />
        </div>
        <p className="mt-2 text-[11px] text-fg-dim">
          {fmtInt(ledger.counts.defend)} positions defended · {fmtInt(ledger.counts.paid)} on a paid bridge ·{" "}
          {fmtInt(ledger.counts.organic)} held organically (no spend) · {fmtInt(ledger.counts.skip)} skipped by ROI.
          Paid auto-stops as organic share recovers — that&rsquo;s ~{compactUSD(ledger.paidSavings)}/yr of ad spend the
          organic wins let you switch off.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <LeverColumn
          title="Paid bridges · live"
          accent="var(--blue)"
          subtitle={`${paid.length} active · holding now while organic ships`}
          empty="No paid bridges — nothing under attack above threshold."
        >
          {paid.map((d) => (
            <Row key={d.prompt.id} accent="var(--blue)">
              <div className="min-w-0">
                <div className="text-[12px] text-fg/90 truncate">{d.prompt.text}</div>
                <div className="text-[10px] text-fg-dim">
                  losing to <span className="text-red">{String(d.prompt.leader)}</span> · {d.engine} · reconquest ~Day {d.reconquestDays}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="tnum text-blue text-[13px]">{fmtUSD(d.dailyBudget)}/day</div>
                <div className="text-[10px] text-fg-dim">protects {compactUSD(d.value)}/yr</div>
              </div>
            </Row>
          ))}
        </LeverColumn>

        <LeverColumn
          title="Organic · permanent wins"
          accent="var(--violet)"
          subtitle={`${organic.length} positions · compounding, no paid spend`}
          empty="No organic work queued."
        >
          {organic.map((d) => (
            <Row key={d.prompt.id} accent="var(--violet)">
              <div className="min-w-0">
                <div className="text-[12px] text-fg/90 truncate">{d.prompt.text}</div>
                <div className="text-[10px] text-fg-dim">
                  {d.status === "holding" ? "holding lead · maintain" : `ranking · reconquest ~Day ${d.reconquestDays}`}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="tnum text-violet text-[13px]">{compactUSD(d.value)}/yr</div>
                <div className="text-[10px] text-fg-dim">{Math.round(d.prompt.shareOfAnswer * 100)}% share</div>
              </div>
            </Row>
          ))}
        </LeverColumn>
      </div>
    </div>
  );
}

// The governable brain: edit the rules, every view recomputes live.
function PolicyBar({
  policy,
  onChange,
  counts,
}: {
  policy: Policy;
  onChange: (p: Policy) => void;
  counts: { defend: number; skip: number; paid: number };
}) {
  return (
    <div className="bg-bg-panel border border-border panel-elev rounded-sm overflow-hidden">
      <div className="px-4 py-2 border-b border-border bg-bg-elev flex items-center justify-between">
        <span className="eyebrow text-fg-muted">Agent policy · your guardrails (editable)</span>
        <span className="text-[11px] text-fg-dim">
          <span className="text-green tnum">{counts.defend}</span> defend ·{" "}
          <span className="text-fg-dim tnum">{counts.skip}</span> skip ·{" "}
          <span className="text-blue tnum">{counts.paid}</span> paid
        </span>
      </div>
      <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-4 items-center">
        {/* Defend threshold — the live slider that moves positions defend↔skip */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-fg-muted">Defend threshold</span>
            <span className="tnum text-green">{compactUSD(policy.defendThreshold)}/yr</span>
          </div>
          <input
            type="range"
            min={0}
            max={1_200_000}
            step={10_000}
            value={policy.defendThreshold}
            onChange={(e) => onChange({ ...policy, defendThreshold: Number(e.target.value) })}
            className="w-full accent-green"
          />
          <div className="text-[10px] text-fg-dim mt-0.5">positions below this are skipped — capital is finite</div>
        </div>
        {/* Paid cap */}
        <div>
          <div className="text-[11px] text-fg-muted mb-1">Paid cap / bridge</div>
          <div className="flex items-center gap-1">
            <span className="text-fg-dim text-[11px]">$</span>
            <input
              type="number"
              step={100}
              min={0}
              value={policy.maxPaidPerDay}
              onChange={(e) => onChange({ ...policy, maxPaidPerDay: Math.max(0, Number(e.target.value)) })}
              className="tnum w-24 bg-bg border border-border-strong rounded px-2 py-1 text-right text-blue focus:border-blue outline-none"
            />
            <span className="text-fg-dim text-[11px]">/day</span>
          </div>
        </div>
        {/* Approval gate */}
        <div>
          <div className="text-[11px] text-fg-muted mb-1">Approval gate</div>
          <button
            onClick={() => onChange({ ...policy, requireApproval: !policy.requireApproval })}
            className={`px-3 py-1 rounded text-[11px] border transition ${
              policy.requireApproval
                ? "border-amber/50 text-amber bg-amber/10"
                : "border-border-strong text-fg-dim"
            }`}
          >
            {policy.requireApproval ? "⛔ human approves spend/publish" : "○ auto (off)"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Ledger({ label, value, color, big }: { label: string; value: string; color: string; big?: boolean }) {
  return (
    <div className="bg-bg-panel px-4 py-3">
      <div className={`tnum leading-none ${big ? "text-2xl" : "text-xl"}`} style={{ color }}>
        {value}
      </div>
      <div className="eyebrow mt-1.5">{label}</div>
    </div>
  );
}

function LeverColumn({
  title,
  subtitle,
  accent,
  empty,
  children,
}: {
  title: string;
  subtitle: string;
  accent: string;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <div className="bg-bg-panel border border-border panel-elev rounded-sm overflow-hidden flex flex-col">
      <div className="px-4 py-2.5 border-b border-border bg-bg-elev flex items-center justify-between">
        <span className="eyebrow" style={{ color: accent }}>
          {title}
        </span>
        <span className="text-[10px] text-fg-dim">{subtitle}</span>
      </div>
      <div className="p-2 flex-1 overflow-y-auto max-h-[420px]">
        {items.length === 0 ? <p className="p-3 text-[11px] text-fg-dim">{empty}</p> : items}
      </div>
    </div>
  );
}

function Row({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-between gap-3 px-2.5 py-2 rounded hover:bg-bg-elev border-l-2"
      style={{ borderColor: accent }}
    >
      {children}
    </motion.div>
  );
}

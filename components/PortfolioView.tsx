"use client";

import { useMemo, useState } from "react";
import type { Prompt } from "@/lib/types";
import { decide, DEFAULT_POLICY, type Decision } from "@/lib/policy";
import { compactUSD, fmtInt } from "@/lib/economics";

type SortKey = "value" | "share" | "demand";

const STATUS_META: Record<string, { label: string; color: string }> = {
  "paid-active": { label: "PAID+ORGANIC", color: "var(--blue)" },
  "organic-progress": { label: "ORGANIC", color: "var(--violet)" },
  holding: { label: "HOLDING", color: "var(--green)" },
  skipped: { label: "SKIP", color: "var(--fg-dim)" },
};

// Every real position, triaged by ROI. The "thousands of dimensions" capability,
// made inspectable: sortable, with the agent's decision on each.
export function PortfolioView({ prompts }: { prompts: Prompt[] }) {
  const [sort, setSort] = useState<SortKey>("value");
  const decisions = useMemo(() => {
    const d = decide(prompts, DEFAULT_POLICY);
    const key = (x: Decision) =>
      sort === "value" ? x.value : sort === "share" ? x.prompt.shareOfAnswer : x.prompt.monthlyVolume;
    return d.sort((a, b) => key(b) - key(a));
  }, [prompts, sort]);

  return (
    <div className="bg-bg-panel border border-border panel-elev rounded-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-bg-elev flex items-center justify-between">
        <span className="eyebrow text-fg-muted">Portfolio · {fmtInt(decisions.length)} positions · agent decision per prompt</span>
        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-fg-dim mr-1">sort:</span>
          {(["value", "share", "demand"] as SortKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={`px-2 py-0.5 rounded ${sort === k ? "bg-bg text-green" : "text-fg-dim hover:text-fg-muted"}`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-y-auto max-h-[560px]">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-bg-panel">
            <tr className="text-fg-dim eyebrow !text-[9px] text-left">
              <th className="px-4 py-2 font-normal">Prompt</th>
              <th className="px-2 py-2 font-normal">Topic</th>
              <th className="px-2 py-2 font-normal text-right">Share</th>
              <th className="px-2 py-2 font-normal text-right">Value/yr</th>
              <th className="px-2 py-2 font-normal">Leader</th>
              <th className="px-4 py-2 font-normal">Decision</th>
            </tr>
          </thead>
          <tbody>
            {decisions.map((d) => {
              const m = STATUS_META[d.status];
              return (
                <tr key={d.prompt.id} className="border-t border-border/60 hover:bg-bg-elev">
                  <td className="px-4 py-1.5 text-fg/90 max-w-[280px] truncate">{d.prompt.text}</td>
                  <td className="px-2 py-1.5 text-fg-dim">{d.prompt.cluster}</td>
                  <td className="px-2 py-1.5 text-right tnum" style={{ color: d.prompt.status === "winning" ? "var(--green)" : d.prompt.status === "losing" ? "var(--red)" : "var(--amber)" }}>
                    {Math.round(d.prompt.shareOfAnswer * 100)}%
                  </td>
                  <td className="px-2 py-1.5 text-right tnum text-fg/90">{compactUSD(d.value)}</td>
                  <td className="px-2 py-1.5 text-fg-muted">{d.prompt.leader === "us" ? "✓ us" : String(d.prompt.leader)}</td>
                  <td className="px-4 py-1.5">
                    <span className="text-[10px] tracking-wide" style={{ color: m.color }}>
                      {m.label}
                      {d.dailyBudget > 0 && <span className="text-fg-dim"> · ${d.dailyBudget}/day</span>}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { Prompt } from "@/lib/types";
import { BrandKpis, type BrandKpiData } from "./BrandKpis";
import { compactUSD, fmtInt } from "@/lib/economics";

// Diagnose: the honest "what & why" — real Profound KPIs + the ranked gaps where
// Anthropic loses the AI citation. Clean and scannable, not a wall of numbers.
export function DiagnoseView({
  prompts,
  brandKpis,
  brand,
  live,
  profoundUrl,
  onExecute,
}: {
  prompts: Prompt[];
  brandKpis: BrandKpiData;
  brand: string;
  live: boolean;
  profoundUrl?: string;
  onExecute: () => void;
}) {
  const { gaps, winnable } = useMemo(() => {
    const gaps = prompts
      .filter((p) => p.status !== "winning")
      .sort((a, b) => b.annualValue - a.annualValue)
      .slice(0, 12);
    const winnable = gaps.reduce((a, p) => a + p.annualValue * Math.max(0, 0.45 - p.shareOfAnswer), 0);
    return { gaps, winnable };
  }, [prompts]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="eyebrow text-fg-muted">{brand} · AI visibility in &ldquo;Frontier Models&rdquo;</span>
          <span className="eyebrow text-fg-dim">real Profound metrics</span>
        </div>
        <BrandKpis kpis={brandKpis} live={live} />
      </div>

      {/* The gaps — where we lose, ranked by winnable opportunity */}
      <div className="bg-bg-panel border border-border panel-elev rounded-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-bg-elev flex items-center justify-between">
          <div>
            <span className="eyebrow text-fg-muted">Where {brand} loses the AI citation</span>
            <span className="ml-2 eyebrow text-amber">$ = illustrative estimate · share is real</span>
          </div>
          <div className="flex items-center gap-3">
            {live && profoundUrl && (
              <a href={profoundUrl} target="_blank" rel="noreferrer" className="eyebrow text-blue hover:underline">
                open in Profound ↗
              </a>
            )}
            <button onClick={onExecute} className="px-3.5 py-1.5 rounded text-[12px] font-semibold bg-green text-bg hover:brightness-110 transition">
              ⚡ Execute the plan →
            </button>
          </div>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-fg-dim eyebrow !text-[9px] text-left">
              <th className="px-4 py-2 font-normal">High-intent prompt</th>
              <th className="px-3 py-2 font-normal">Topic</th>
              <th className="px-3 py-2 font-normal text-right">Our share</th>
              <th className="px-3 py-2 font-normal">Cited leader</th>
              <th className="px-4 py-2 font-normal text-right">Winnable /yr</th>
            </tr>
          </thead>
          <tbody>
            {gaps.map((p, i) => (
              <motion.tr
                key={p.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.03, 0.4) }}
                className="border-t border-border/60 hover:bg-bg-elev"
              >
                <td className="px-4 py-2 text-fg/90 max-w-[300px] truncate">{p.text}</td>
                <td className="px-3 py-2 text-fg-dim">{p.cluster}</td>
                <td className="px-3 py-2 text-right tnum text-red">{Math.round(p.shareOfAnswer * 100)}%</td>
                <td className="px-3 py-2 text-fg-muted">{String(p.leader)}</td>
                <td className="px-4 py-2 text-right tnum text-green">+{compactUSD(p.annualValue * Math.max(0.05, 0.45 - p.shareOfAnswer))}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2.5 border-t border-border bg-bg-elev flex items-center justify-between text-[12px]">
          <span className="text-fg-muted">{fmtInt(gaps.length)} priority gaps · {fmtInt(prompts.length)} prompts monitored on Profound</span>
          <span className="text-fg-muted">total winnable: <span className="text-green tnum">{compactUSD(winnable)}/yr</span> <span className="text-amber text-[10px]">(est.)</span></span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Fragment, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Prompt } from "@/lib/types";
import { BrandKpis, type BrandKpiData } from "./BrandKpis";
import { compactUSD, fmtInt } from "@/lib/economics";

interface Teardown { whyTheyWin: string[]; counter: string[]; source?: string }

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

  const [open, setOpen] = useState<string | null>(null);
  const [teardowns, setTeardowns] = useState<Record<string, Teardown | "loading">>({});

  async function toggle(p: Prompt) {
    const id = p.id;
    setOpen((cur) => (cur === id ? null : id));
    if (teardowns[id]) return;
    setTeardowns((t) => ({ ...t, [id]: "loading" }));
    try {
      const r = await fetch("/api/teardown", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: p.text, leader: String(p.leader) }) });
      const j = await r.json();
      setTeardowns((t) => ({ ...t, [id]: { whyTheyWin: j.whyTheyWin ?? [], counter: j.counter ?? [], source: j.source } }));
    } catch {
      setTeardowns((t) => ({ ...t, [id]: { whyTheyWin: [], counter: [] } }));
    }
  }

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
            {gaps.map((p) => {
              const td = teardowns[p.id];
              const isOpen = open === p.id;
              return (
                <Fragment key={p.id}>
                  <tr onClick={() => toggle(p)} className="border-t border-border/60 hover:bg-bg-elev cursor-pointer">
                    <td className="px-4 py-2 text-fg/90 max-w-[300px] truncate">
                      <span className="text-fg-dim mr-1.5">{isOpen ? "▾" : "▸"}</span>{p.text}
                    </td>
                    <td className="px-3 py-2 text-fg-dim">{p.cluster}</td>
                    <td className="px-3 py-2 text-right tnum text-red">{Math.round(p.shareOfAnswer * 100)}%</td>
                    <td className="px-3 py-2 text-fg-muted">{String(p.leader)}</td>
                    <td className="px-4 py-2 text-right tnum text-green">+{compactUSD(p.annualValue * Math.max(0.05, 0.45 - p.shareOfAnswer))}</td>
                  </tr>
                  <AnimatePresence>
                    {isOpen && (
                      <tr>
                        <td colSpan={5} className="px-4 py-0 bg-bg">
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <div className="py-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px]">
                              {td === "loading" || !td ? (
                                <div className="text-fg-dim col-span-2 py-2"><span className="cursor-blink">agent analyzing why {String(p.leader)} wins this citation…</span></div>
                              ) : (
                                <>
                                  <div>
                                    <div className="eyebrow text-red mb-1.5">why {String(p.leader)} wins</div>
                                    <ul className="space-y-1">{td.whyTheyWin.map((w, i) => <li key={i} className="text-fg-muted leading-snug">— {w}</li>)}</ul>
                                  </div>
                                  <div>
                                    <div className="eyebrow text-green mb-1.5">what our page must cover to win</div>
                                    <ul className="space-y-1">{td.counter.map((c, i) => <li key={i} className="text-fg/90 leading-snug">✓ {c}</li>)}</ul>
                                  </div>
                                </>
                              )}
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </Fragment>
              );
            })}
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

"use client";

import { Fragment, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Prompt } from "@/lib/types";
import { BrandKpis, type BrandKpiData } from "./BrandKpis";
import { CitationProofLoop } from "./CitationProofLoop";
import { annualValue, compactUSD, fmtInt, fmtUSD, DEFAULT_ASSUMPTIONS, type Assumptions } from "@/lib/economics";

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
  // Editable $ model — transparent + adjustable. Volume is real Profound data;
  // the rest are labeled assumptions. winnable = value × the share we can still take.
  const [a, setA] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const winnableOf = (p: Prompt) => annualValue(p.monthlyVolume, a) * Math.max(0.05, 0.45 - p.shareOfAnswer);

  const { gaps, winnable, threats } = useMemo(() => {
    const gaps = prompts.filter((p) => p.status !== "winning").sort((x, y) => y.annualValue - x.annualValue).slice(0, 12);
    const winnable = gaps.reduce((acc, p) => acc + annualValue(p.monthlyVolume, a) * Math.max(0, 0.45 - p.shareOfAnswer), 0);
    const counts = new Map<string, number>();
    prompts.filter((p) => p.leader && p.leader !== "us").forEach((p) => counts.set(String(p.leader), (counts.get(String(p.leader)) ?? 0) + 1));
    const threats = [...counts.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([name, count]) => ({ name, count }));
    return { gaps, winnable, threats };
  }, [prompts, a]);

  const kpisDisplay = threats.length ? { ...brandKpis, competitors: threats } : brandKpis;

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
        <BrandKpis kpis={kpisDisplay} live={live} />
      </div>

      {/* THE agent action — prove the gap on the live internet, fix it, re-verify */}
      <CitationProofLoop prompts={prompts} brand={brand} />

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
        {/* Transparent, editable $ model */}
        <div className="px-4 py-2 border-b border-border bg-bg flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
          <span className="font-mono text-fg-dim">winnable/yr = </span>
          <span className="font-mono text-green">volume<span className="text-fg-dim text-[9px]"> (real Profound)</span></span>
          <span className="font-mono text-fg-dim">× 12 ×</span>
          <Assume label="CTR" suffix="%" value={Number((a.clickThrough * 100).toFixed(2))} step={1} onChange={(v) => setA({ ...a, clickThrough: Math.max(0, v) / 100 })} />
          <span className="font-mono text-fg-dim">×</span>
          <Assume label="conv" suffix="%" value={Number((a.conversionRate * 100).toFixed(2))} step={0.25} onChange={(v) => setA({ ...a, conversionRate: Math.max(0, v) / 100 })} />
          <span className="font-mono text-fg-dim">×</span>
          <Assume label="ACV" prefix="$" value={a.acv} step={500} onChange={(v) => setA({ ...a, acv: Math.max(0, v) })} />
          <span className="font-mono text-fg-dim">× share-to-win</span>
          <span className="ml-auto text-amber">illustrative model · edit to your business</span>
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
                    <td className="px-4 py-2 text-right tnum text-green">+{compactUSD(winnableOf(p))}</td>
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

function Assume({ label, value, onChange, step, prefix, suffix }: { label: string; value: number; onChange: (v: number) => void; step: number; prefix?: string; suffix?: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-fg-dim">{label}</span>
      {prefix && <span className="text-fg-dim">{prefix}</span>}
      <input type="number" step={step} min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} className="tnum w-14 bg-bg-elev border border-border-strong rounded px-1.5 py-0.5 text-right text-amber focus:border-amber outline-none" />
      {suffix && <span className="text-fg-dim">{suffix}</span>}
    </span>
  );
}

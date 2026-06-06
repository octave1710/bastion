"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Prompt } from "@/lib/types";
import { buildPortfolio } from "@/lib/data";
import { decide, DEFAULT_POLICY, type Policy } from "@/lib/policy";
import { squarify } from "@/lib/treemap";
import { compactUSD, fmtInt } from "@/lib/economics";
import { AnimatedNumber } from "./AnimatedNumber";

// Colour by the agent's DECISION, not raw win/loss — this is a "defended
// continuously" view, so it shows coverage: held, ranking, bridged, or skipped.
const DECISION_COLOR: Record<string, string> = {
  holding: "var(--green)", // winning → maintain
  "organic-progress": "var(--violet)", // contested → organic
  "paid-active": "var(--blue)", // losing but actively bridged
  skipped: "var(--fg-dim)", // below ROI threshold
};

// The command center: a $-sized treemap (where the money is), a Top Movers panel
// (orientation), and a live decision ticker (alive). One glance = the whole
// portfolio, triaged by ROI, right now.
export function ScaleReveal({
  open,
  onClose,
  prompts,
  policy = DEFAULT_POLICY,
}: {
  open: boolean;
  onClose?: () => void;
  prompts?: Prompt[];
  policy?: Policy;
}) {
  const portfolio = useMemo(
    () => (prompts && prompts.length ? prompts : buildPortfolio(140)),
    [prompts]
  );

  const { rects, stats, movers, allDecisions, decStatus } = useMemo(() => {
    const items = portfolio.map((p) => ({ value: Math.max(p.annualValue, 1), data: p }));
    const rects = squarify(items, 100, 58);
    const value = portfolio.reduce((a, p) => a + p.annualValue, 0);
    const winning = portfolio.filter((p) => p.status === "winning").length;
    const ds = decide(portfolio, policy);
    const decStatus = new Map(ds.map((d) => [d.prompt.id, d.status]));
    const movers = [...portfolio].sort((a, b) => b.annualValue - a.annualValue).slice(0, 7);
    return {
      rects,
      stats: { total: portfolio.length, winning, value, defended: ds.filter((d) => d.defend).length },
      movers,
      decisions: ds.slice(0, 14),
      allDecisions: ds,
      decStatus,
    };
  }, [portfolio, policy]);

  // Streaming feed — a new decision scrolls in every ~450ms so it reads as live.
  const [feedLen, setFeedLen] = useState(0);
  useEffect(() => {
    if (!open) { setFeedLen(0); return; }
    const id = setInterval(() => setFeedLen((n) => n + 1), 450);
    return () => clearInterval(id);
  }, [open]);
  const stream = useMemo(() => {
    const all = allDecisions;
    if (!all.length) return [];
    const n = Math.min(12, feedLen);
    return Array.from({ length: n }, (_, i) => {
      const idx = (feedLen - 1 - i) % all.length;
      return { d: all[(idx + all.length) % all.length], seq: feedLen - i };
    });
  }, [allDecisions, feedLen]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 bg-bg/97 backdrop-blur-sm flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-7 py-4 border-b border-border">
        <div>
          <div className="eyebrow text-green">● the portfolio · defended continuously</div>
          <h2 className="mt-1 text-2xl font-semibold flex items-baseline gap-1.5">
            <AnimatedNumber value={stats.value} format={(n) => compactUSD(n)} durationMs={1400} className="tnum text-green glow-green" />
            <span className="text-fg-muted text-lg">/yr defended ·</span>
            <AnimatedNumber value={stats.total} format={(n) => fmtInt(n)} durationMs={1400} className="tnum" />
            <span className="text-fg-muted text-lg">positions ·</span>
            <AnimatedNumber value={stats.winning} format={(n) => fmtInt(n)} durationMs={1400} className="tnum text-green" />
            <span className="text-fg-muted text-lg">winning</span>
          </h2>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded text-xs font-medium border border-border-strong text-fg-muted hover:text-fg hover:border-fg-dim transition"
        >
          Exit ⎋
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Treemap — area ∝ defended dollars */}
        <div className="relative flex-1 m-4 mr-2">
          {rects.map((r, i) => {
            const p = r.data;
            const big = r.w > 9 && r.h > 7;
            const med = r.w > 5 && r.h > 4;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.01, 0.8), duration: 0.25 }}
                className="absolute rounded-[2px] overflow-hidden border border-bg p-1.5"
                style={{
                  left: `${r.x}%`,
                  top: `${(r.y / 58) * 100}%`,
                  width: `${r.w}%`,
                  height: `${(r.h / 58) * 100}%`,
                  background: DECISION_COLOR[decStatus.get(p.id) ?? "skipped"],
                  opacity: 0.6 + p.shareOfAnswer * 0.4,
                }}
                title={`${p.text} · ${compactUSD(p.annualValue)}/yr · ${Math.round(p.shareOfAnswer * 100)}% share`}
              >
                {big && (
                  <div className="text-bg">
                    <div className="text-[10px] leading-tight font-medium line-clamp-2">{p.text}</div>
                    <div className="text-[10px] tnum font-semibold mt-0.5">{compactUSD(p.annualValue)}</div>
                  </div>
                )}
                {med && !big && <div className="text-bg text-[9px] tnum font-semibold">{compactUSD(p.annualValue)}</div>}
              </motion.div>
            );
          })}
        </div>

        {/* Right rail: Top Movers + live decision ticker */}
        <aside className="w-[300px] shrink-0 flex flex-col gap-3 p-4 pl-2 min-h-0">
          <div className="bg-bg-panel border border-border rounded-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-bg-elev eyebrow text-fg-muted">Top positions by value</div>
            <div className="p-1.5">
              {movers.map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-1.5 py-1 text-[11px]">
                  <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: DECISION_COLOR[decStatus.get(p.id) ?? "skipped"] }} />
                  <span className="text-fg/85 truncate flex-1">{p.text}</span>
                  <span className="tnum text-fg-muted">{compactUSD(p.annualValue)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-bg-panel border border-border rounded-sm overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="px-3 py-2 border-b border-border bg-bg-elev flex items-center justify-between">
              <span className="eyebrow text-fg-muted">Live decisions · streaming</span>
              <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse" />
            </div>
            <div className="p-1.5 flex-1 overflow-hidden">
              <AnimatePresence initial={false} mode="popLayout">
                {stream.map(({ d, seq }) => (
                  <motion.div
                    key={seq}
                    layout
                    initial={{ opacity: 0, x: 14, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: "auto" }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.28 }}
                    className="flex items-center gap-2 px-1.5 py-1 text-[11px] font-mono"
                  >
                    <span className="text-green shrink-0">›</span>
                    <span className="text-fg/80 truncate flex-1">{d.prompt.text}</span>
                    <span
                      className="shrink-0 text-[10px]"
                      style={{ color: d.defend ? (d.lever === "paid+organic" ? "var(--blue)" : "var(--violet)") : "var(--fg-dim)" }}
                    >
                      {d.defend ? (d.lever === "paid+organic" ? "DEFEND·paid" : "DEFEND·org") : "SKIP"}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </aside>
      </div>

      <div className="flex items-center justify-center gap-5 px-7 py-2.5 border-t border-border text-xs">
        <Legend color="var(--green)" label="holding" />
        <Legend color="var(--violet)" label="organic" />
        <Legend color="var(--blue)" label="paid bridge" />
        <Legend color="var(--fg-dim)" label="skipped" />
        <span className="text-fg-dim">· area = $/yr defended · one person, the work of a hundred · point it at any brand</span>
      </div>
    </motion.div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-fg-muted">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

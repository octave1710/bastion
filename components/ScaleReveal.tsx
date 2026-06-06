"use client";

import type React from "react";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ALLOCATION, buildPortfolio } from "@/lib/data";
import { compactUSD, fmtInt } from "@/lib/economics";

const STATUS_COLOR: Record<string, string> = {
  winning: "var(--green)",
  contested: "var(--amber)",
  losing: "var(--red)",
};

// The scale reveal: thousands of positions defended continuously. "It does this
// everywhere, right now, while I talk. One person. The work of a hundred."
export function ScaleReveal({ open, onClose }: { open: boolean; onClose?: () => void }) {
  const portfolio = useMemo(() => buildPortfolio(2400), []);

  const stats = useMemo(() => {
    const total = portfolio.length;
    const winning = portfolio.filter((p) => p.status === "winning").length;
    const value = portfolio.reduce((a, p) => a + p.annualValue, 0);
    // Allocation comes from the shared source of truth so it matches the agent's
    // allocation artifact exactly.
    return { total, winning, value, defend: ALLOCATION.defend, skip: ALLOCATION.skip, paid: ALLOCATION.paid };
  }, [portfolio]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 bg-bg/95 backdrop-blur-sm flex flex-col"
    >
      <div className="flex items-center justify-between px-8 py-5 border-b border-border">
        <div>
          <div className="eyebrow text-green">● the full portfolio · defended continuously</div>
          <h2 className="mt-1 text-2xl font-semibold">
            <span className="tnum">{fmtInt(stats.total)}</span> positions ·{" "}
            <span className="tnum text-green">{compactUSD(stats.value)}/yr</span> defended
          </h2>
        </div>
        <div className="flex items-center gap-5">
          <AllocStat value={fmtInt(stats.defend)} label="defending" color="var(--green)" />
          <AllocStat value={fmtInt(stats.skip)} label="skipped · low ROI" color="var(--fg-dim)" />
          <AllocStat value={fmtInt(stats.paid)} label="paid bridges live" color="var(--blue)" />
          <div className="text-right text-sm text-fg-muted max-w-[16rem] border-l border-border pl-5">
            One person. The work of a hundred. Every cell is a dollar-valued prompt the
            agent defends — and decides to defend or skip by ROI — right now.
          </div>
          <button
            onClick={onClose}
            className="ml-2 shrink-0 px-3 py-1.5 rounded text-xs font-medium border border-border-strong text-fg-muted hover:text-fg hover:border-fg-dim transition"
          >
            Exit ⎋
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        <div
          className="grid gap-[2px] h-full content-start"
          style={{ gridTemplateColumns: "repeat(60, minmax(0, 1fr))" }}
        >
          {portfolio.map((p, i) => {
            const op = 0.35 + p.shareOfAnswer * 0.65;
            return (
              <div
                key={p.id}
                title={`${compactUSD(p.annualValue)}/yr · ${Math.round(p.shareOfAnswer * 100)}% share`}
                className="cell-pop aspect-square rounded-[1px]"
                style={
                  {
                    background: STATUS_COLOR[p.status],
                    ["--cell-opacity" as string]: op,
                    animationDelay: `${Math.min(i * 0.0007, 1.4)}s`,
                  } as React.CSSProperties
                }
              />
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 px-8 py-3 border-t border-border text-xs">
        <Legend color="var(--green)" label={`${fmtInt(stats.winning)} winning`} />
        <Legend color="var(--amber)" label="contested" />
        <Legend color="var(--red)" label="under defense" />
        <span className="text-fg-dim">· point it at any brand — plug-and-play</span>
      </div>
    </motion.div>
  );
}

function AllocStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="text-center">
      <div className="tnum text-2xl font-semibold leading-none" style={{ color }}>
        {value}
      </div>
      <div className="eyebrow !text-[8px] mt-1">{label}</div>
    </div>
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

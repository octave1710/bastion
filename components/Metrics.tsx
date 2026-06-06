"use client";

import { AnimatedNumber } from "./AnimatedNumber";
import { compactUSD } from "@/lib/economics";
import type { Phase } from "@/lib/useWarRoom";

// The two hero counters — readable from 10m. Defended Revenue is the OUTPUT
// (the dollar we protect); Revenue at Risk turns red under attack.
export function Metrics({
  defendedMonthly,
  revenueAtRisk,
  phase,
}: {
  defendedMonthly: number;
  revenueAtRisk: number;
  phase: Phase;
}) {
  const atRisk = revenueAtRisk > 0;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border border border-border panel-elev rounded-sm overflow-hidden">
      {/* DEFENDED REVENUE — the output metric */}
      <div className="bg-bg-panel px-7 py-6">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Defended Revenue</span>
          <span className="eyebrow text-green">● live</span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <AnimatedNumber
            value={defendedMonthly}
            format={(n) => compactUSD(n)}
            className="tnum text-6xl md:text-7xl font-semibold text-green leading-none glow-green"
          />
          <span className="tnum text-fg-dim text-2xl">/mo</span>
        </div>
        <p className="mt-3 text-sm text-fg-muted">
          Pipeline protected across the answer-share portfolio, defended continuously.
        </p>
      </div>

      {/* REVENUE AT RISK — turns red under attack */}
      <div
        className={`px-7 py-6 transition-colors duration-500 ${
          atRisk ? "bg-red-dim/20" : "bg-bg-panel"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="eyebrow">Revenue at Risk</span>
          <span
            className={`eyebrow ${atRisk ? "text-red pulse-red rounded px-1" : "text-fg-dim"}`}
          >
            {atRisk ? "▲ under attack" : "○ nominal"}
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <AnimatedNumber
            value={revenueAtRisk}
            format={(n) => compactUSD(n)}
            className={`tnum text-6xl md:text-7xl font-semibold leading-none ${
              atRisk ? "text-red glow-red" : "text-fg-dim"
            }`}
          />
          <span className="tnum text-fg-dim text-2xl">/yr</span>
        </div>
        <p className="mt-3 text-sm text-fg-muted">
          {atRisk
            ? `Hero position lost to a competitor — ${phase === "riposte" ? "riposte in progress" : "defending now"}.`
            : "No position currently undefended above threshold."}
        </p>
      </div>
    </div>
  );
}

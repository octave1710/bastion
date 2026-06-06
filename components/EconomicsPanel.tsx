"use client";

import { compactUSD, DEFAULT_ASSUMPTIONS, formulaBreakdown, monthlyValue } from "@/lib/economics";
import { HERO_PROMPT } from "@/lib/data";

// The dollar model, on screen and defensible. A Stripe/Ramp judge must see we
// know it's a MODEL, not a measurement — so every assumption is surfaced and
// the result is COMPUTED from the inputs above it (not asserted).
export function EconomicsPanel() {
  const inputs = {
    monthlyVolume: HERO_PROMPT.monthlyVolume,
    shareDelta: 0.18,
    clickThrough: DEFAULT_ASSUMPTIONS.clickThrough,
    conversionRate: DEFAULT_ASSUMPTIONS.conversionRate,
    acv: DEFAULT_ASSUMPTIONS.acv,
  };
  const rows = formulaBreakdown(inputs);
  const heroAnnual = monthlyValue(inputs) * 12;

  return (
    <div className="bg-bg-panel border border-border panel-elev rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-elev">
        <span className="eyebrow text-fg-muted">Unit economics · how a position is valued</span>
        <span className="eyebrow text-amber">illustrative</span>
      </div>
      <div className="px-4 py-3">
        <div className="font-mono text-[11px] text-fg-dim mb-3 leading-relaxed">
          value = volume × Δshare × CTR × conversion × ACV
        </div>
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between text-[12px]">
              <span className="text-fg-muted">{r.label}</span>
              <span className="tnum text-fg/90">{r.value}</span>
            </div>
          ))}
          <div className="h-px bg-border my-2" />
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-fg">Hero position value</span>
            <span className="tnum text-green text-lg">{compactUSD(heroAnnual)}/yr</span>
          </div>
        </div>
        <p className="mt-3 text-[10px] text-fg-dim leading-snug">
          Illustrative unit economics — the mechanism is the point. Citation share is an
          input; defended revenue is the output.
        </p>
      </div>
    </div>
  );
}

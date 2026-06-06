"use client";

import { useState } from "react";
import {
  annualValue,
  compactUSD,
  DEFAULT_ASSUMPTIONS,
  fmtInt,
  fmtUSD,
  pct,
  type Assumptions,
} from "@/lib/economics";
import { HERO_PROMPT } from "@/lib/data";

// The dollar model — Bastion's moat. Profound stops at visibility; we add the
// dollar layer. monthly_volume is REAL Profound data; CTR / conversion / ACV are
// ADJUSTABLE, labeled assumptions. Editable on screen so a judge sees it's an
// OWNED model, not a measurement.
export function EconomicsPanel() {
  const [a, setA] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const heroAnnual = annualValue(HERO_PROMPT.monthlyVolume, a);
  const dirty =
    a.clickThrough !== DEFAULT_ASSUMPTIONS.clickThrough ||
    a.conversionRate !== DEFAULT_ASSUMPTIONS.conversionRate ||
    a.acv !== DEFAULT_ASSUMPTIONS.acv;

  return (
    <div className="bg-bg-panel border border-border panel-elev rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-elev">
        <span className="eyebrow text-fg-muted">Unit economics · the dollar layer Profound doesn&rsquo;t have</span>
        <span className="eyebrow text-amber">adjustable</span>
      </div>
      <div className="px-4 py-3">
        <div className="font-mono text-[11px] text-fg-dim mb-3 leading-relaxed">
          value/yr = volume × 12 × CTR × conversion × ACV
        </div>
        <div className="space-y-1.5">
          {/* Real Profound input */}
          <Row label="Monthly prompt volume" hint="real Profound data">
            <span className="tnum text-fg/90">{fmtInt(HERO_PROMPT.monthlyVolume)}</span>
          </Row>
          <Row label="× months / year">
            <span className="tnum text-fg-dim">12</span>
          </Row>

          {/* Editable assumptions */}
          <PercentRow
            label="Click-through to site"
            value={a.clickThrough}
            onChange={(v) => setA({ ...a, clickThrough: v })}
          />
          <PercentRow
            label="Conversion rate"
            value={a.conversionRate}
            onChange={(v) => setA({ ...a, conversionRate: v })}
          />
          <DollarRow label="Average contract value" value={a.acv} onChange={(v) => setA({ ...a, acv: v })} />

          <div className="h-px bg-border my-2" />
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-fg">Hero position value</span>
            <span className="tnum text-green text-lg">{compactUSD(heroAnnual)}/yr</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[10px] text-fg-dim leading-snug max-w-[18rem]">
            Illustrative unit economics — adjustable. An owned model, not a measurement. Volume is real;
            tune the rest to your business.
          </p>
          {dirty && (
            <button
              onClick={() => setA(DEFAULT_ASSUMPTIONS)}
              className="shrink-0 text-[10px] text-fg-muted hover:text-fg border border-border-strong rounded px-2 py-0.5"
            >
              reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-fg-muted">
        {label}
        {hint && <span className="ml-1.5 text-[9px] text-green/80 uppercase tracking-wide">· {hint}</span>}
      </span>
      {children}
    </div>
  );
}

// Editable rows render an inline input with an "adjustable" affordance.
function PercentRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Row label={label} hint="assumption">
      <span className="inline-flex items-center gap-1">
        <input
          type="number"
          step={0.05}
          min={0}
          value={Number((value * 100).toFixed(2))}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) / 100))}
          className="tnum w-16 bg-bg border border-border-strong rounded px-1.5 py-0.5 text-right text-amber focus:border-amber outline-none"
        />
        <span className="tnum text-fg-dim text-[11px]">%</span>
      </span>
    </Row>
  );
}

function DollarRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Row label={label} hint="assumption">
      <span className="inline-flex items-center gap-1">
        <span className="tnum text-fg-dim text-[11px]">$</span>
        <input
          type="number"
          step={500}
          min={0}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
          className="tnum w-20 bg-bg border border-border-strong rounded px-1.5 py-0.5 text-right text-amber focus:border-amber outline-none"
        />
      </span>
    </Row>
  );
}

"use client";

import { AnimatedNumber } from "./AnimatedNumber";

export interface BrandKpiData {
  shareOfVoice: number;
  visibilityScore: number;
  avgPosition: number;
  rank: number;
  fieldSize: number;
  competitors: { name: string; vis: number }[];
}

// The HONEST headline: real Profound metrics for the brand, not an invented $.
// Share of Voice / Visibility / Average Position / Rank are exactly Profound's
// own KPIs, pulled live. The dollar layer lives elsewhere, clearly labeled.
export function BrandKpis({ kpis, live }: { kpis: BrandKpiData; live: boolean }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border panel-elev rounded-sm overflow-hidden">
      <Kpi
        label="AI Share of Voice"
        sublabel={`rank #${kpis.rank} of ${kpis.fieldSize} in category`}
        value={kpis.shareOfVoice * 100}
        format={(n) => `${n.toFixed(1)}%`}
        color="var(--green)"
        live={live}
      />
      <Kpi
        label="Visibility Score"
        sublabel="Profound metric"
        value={kpis.visibilityScore}
        format={(n) => n.toFixed(2)}
        color="var(--fg)"
        live={live}
      />
      <Kpi
        label="Avg. Citation Position"
        sublabel="lower is better"
        value={kpis.avgPosition}
        format={(n) => n.toFixed(1)}
        color="var(--blue)"
        live={live}
      />
      <div className="bg-bg-panel px-5 py-5">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Ahead of you</span>
          {live && <span className="eyebrow text-green">● live</span>}
        </div>
        <div className="mt-2.5 space-y-1">
          {kpis.competitors.slice(0, 3).map((c) => (
            <div key={c.name} className="flex items-center justify-between text-[12px]">
              <span className="text-fg/80">{c.name}</span>
              <span className="tnum text-red">{c.vis.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  sublabel,
  value,
  format,
  color,
  live,
}: {
  label: string;
  sublabel: string;
  value: number;
  format: (n: number) => string;
  color: string;
  live: boolean;
}) {
  return (
    <div className="bg-bg-panel px-5 py-5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">{label}</span>
        {live && <span className="eyebrow text-green">● live</span>}
      </div>
      <div className="mt-2" style={{ color }}>
        <AnimatedNumber
          value={value}
          format={format}
          className="tnum text-4xl md:text-5xl font-semibold leading-none"
        />
      </div>
      <p className="mt-2 text-[11px] text-fg-muted">{sublabel}</p>
    </div>
  );
}

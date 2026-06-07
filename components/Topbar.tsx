"use client";

import { BastionLogo } from "./BastionLogo";

export function Topbar({
  dataSource = "demo",
  brand = "Anthropic",
  category,
  syncedCount = 0,
}: {
  dataSource?: "demo" | "live";
  brand?: string;
  category?: string;
  syncedCount?: number;
}) {
  const live = dataSource === "live";
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-bg-panel">
      <BastionLogo size={27} tagline="the autonomous AEO operator on Profound" />

      <div className="flex items-center gap-4">
        <div
          className="hidden md:flex items-center gap-2 text-xs px-2.5 py-1 rounded border"
          style={{ borderColor: live ? "rgba(25,224,122,0.4)" : "var(--border-strong)", background: live ? "rgba(25,224,122,0.08)" : "transparent" }}
          title={live ? `Live data synced from Profound (${syncedCount} prompts)` : "Demo data — set PROFOUND_API_KEY for live"}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-green" : "bg-fg-dim"}`} />
          <span className="eyebrow !text-[10px]" style={{ color: live ? "var(--green)" : "var(--fg-dim)" }}>
            {live ? "Profound · live" : "demo data"}
          </span>
        </div>

        {/* Prominent brand lockup — the brand we defend. */}
        <div className="flex items-center gap-2.5 px-2.5 py-1 rounded-md border border-border-strong bg-bg-elev">
          <ClaudeMark />
          <div className="leading-tight">
            <div className="text-[13px] font-semibold text-fg">{brand}</div>
            <div className="eyebrow !text-[8px] text-fg-dim">defending {live && category ? `· ${category}` : "brand"}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

// Claude's mark — radial burst. Makes the defended brand instantly recognizable.
function ClaudeMark() {
  const lines = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    return { x1: 10 + Math.cos(a) * 2.5, y1: 10 + Math.sin(a) * 2.5, x2: 10 + Math.cos(a) * 8, y2: 10 + Math.sin(a) * 8 };
  });
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0" aria-label="Anthropic / Claude">
      <g stroke="#D97757" strokeWidth="1.5" strokeLinecap="round">
        {lines.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
        ))}
      </g>
    </svg>
  );
}

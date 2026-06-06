"use client";

import type { Phase } from "@/lib/useWarRoom";

const PHASE_LABEL: Record<Phase, string> = {
  peacetime: "PEACETIME · optimizing allocation",
  attack: "WARTIME · position lost",
  riposte: "WARTIME · riposte in progress",
  payoff: "WARTIME · position reconquered",
  scale: "PORTFOLIO · full scale",
};

export function Topbar({
  phase,
  running,
  onRun,
  onReset,
  dataSource = "demo",
  brand = "Anthropic",
  syncedCount = 2400,
}: {
  phase: Phase;
  running: boolean;
  onRun: () => void;
  onReset: () => void;
  dataSource?: "demo" | "live";
  brand?: string;
  syncedCount?: number;
}) {
  const live = dataSource === "live";
  const wartime = phase !== "peacetime" && phase !== "scale";
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-bg-panel">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <svg
            width="22"
            height="26"
            viewBox="0 0 22 26"
            fill="none"
            className="shrink-0"
            aria-hidden
          >
            <path
              d="M11 1.5 20 5v8.2c0 6-3.9 9.4-9 11.3-5.1-1.9-9-5.3-9-11.3V5l9-3.5Z"
              stroke="var(--green)"
              strokeWidth="1.4"
              fill="rgba(25,224,122,0.08)"
            />
            <path d="M11 8.5v8M7 12.5h8" stroke="var(--green)" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className="text-xl font-semibold tracking-tight text-fg">BASTION</span>
          <span className="text-border-strong">│</span>
          <span className="text-sm text-fg-muted">
            the trading desk for your share of AI answers
          </span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {/* Data-source badge: proves the live Profound integration. */}
        <div
          className="hidden md:flex items-center gap-2 text-xs px-2.5 py-1 rounded border"
          style={{
            borderColor: live ? "rgba(25,224,122,0.4)" : "var(--border-strong)",
            background: live ? "rgba(25,224,122,0.08)" : "transparent",
          }}
          title={
            live
              ? `Live data synced from Profound (${syncedCount} prompts)`
              : "Running on demo data — set PROFOUND_API_KEY for live data"
          }
        >
          <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-green" : "bg-fg-dim"}`} />
          <span className="eyebrow !text-[10px]" style={{ color: live ? "var(--green)" : "var(--fg-dim)" }}>
            {live ? "Profound · live" : "demo data"}
          </span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs">
          <span className="eyebrow text-fg-dim">Brand</span>
          <span className="text-fg/90 font-medium">{brand}</span>
        </div>
        <div
          className={`flex items-center gap-2 text-xs px-2.5 py-1 rounded ${
            wartime ? "bg-red/10 text-red" : "bg-green/10 text-green"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${wartime ? "bg-red pulse-red" : "bg-green"}`} />
          <span className="eyebrow !text-[10px]" style={{ color: "inherit" }}>
            {PHASE_LABEL[phase]}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRun}
            disabled={running}
            className="px-4 py-1.5 rounded text-sm font-semibold bg-green text-bg hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {running ? "● Running…" : "▶ Run Demo"}
          </button>
          <button
            onClick={onReset}
            className="px-3 py-1.5 rounded text-sm font-medium border border-border-strong text-fg-muted hover:text-fg hover:border-fg-dim transition"
          >
            Reset
          </button>
        </div>
      </div>
    </header>
  );
}

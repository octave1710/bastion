"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RIPOSTE_SCRIPT } from "@/lib/agent/script";
import type { AgentStepKind } from "@/lib/types";
import { Artifact } from "./Artifact";

const KIND_COLOR: Record<AgentStepKind, string> = {
  detect: "var(--amber)",
  teardown: "var(--red)",
  "value-check": "var(--blue)",
  allocation: "var(--green)",
  skip: "var(--fg-dim)",
  decide: "var(--violet)",
  "self-eval": "var(--green)",
  act: "var(--green)",
};

const MONITORED_ENGINES = ["ChatGPT", "Claude", "Gemini", "Perplexity", "Copilot"];

function IdleMonitor() {
  return (
    <div className="text-fg-dim">
      <div className="flex items-center gap-2 text-green/90">
        <span className="cursor-blink">Standing by · scanning answer engines</span>
      </div>
      <div className="mt-3 space-y-1.5">
        {MONITORED_ENGINES.map((e, i) => (
          <div key={e} className="flex items-center gap-2.5 text-[11px]">
            <span
              className="h-1.5 w-1.5 rounded-full bg-green animate-pulse"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
            <span className="text-fg/70 w-20">{e}</span>
            <div className="flex-1 h-px bg-border relative overflow-hidden">
              <div
                className="absolute inset-y-0 w-8 bg-green/40"
                style={{ animation: `sweep 2.4s ${i * 0.3}s linear infinite` }}
              />
            </div>
            <span className="text-green/70 tnum text-[10px]">nominal</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-fg-dim">
        2,400 positions · 0 active threats · last sweep just now.
      </p>
      <p className="mt-1 text-[11px] text-fg-dim/70">Press [space] to simulate a competitor attack.</p>
    </div>
  );
}

export function AgentConsole({
  revealed,
  running = false,
  paused = false,
  speed = 1,
  onTogglePause,
  onNext,
  onSpeed,
}: {
  revealed: number;
  running?: boolean;
  paused?: boolean;
  speed?: number;
  onTogglePause?: () => void;
  onNext?: () => void;
  onSpeed?: (s: number) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [revealed]);

  const steps = RIPOSTE_SCRIPT.slice(0, revealed);

  return (
    <div className="flex flex-col h-full bg-bg-panel border border-border panel-elev rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-elev">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full bg-green ${paused ? "" : "animate-pulse"}`} />
          <span className="eyebrow text-fg-muted">Bastion Agent · reasoning</span>
        </div>
        {running ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onTogglePause}
              className="px-2 py-0.5 rounded text-[11px] border border-border-strong text-fg-muted hover:text-fg hover:border-fg-dim transition"
              title="Space"
            >
              {paused ? "▶ resume" : "⏸ pause"}
            </button>
            <button
              onClick={onNext}
              className="px-2 py-0.5 rounded text-[11px] border border-border-strong text-fg-muted hover:text-fg hover:border-fg-dim transition"
              title="→"
            >
              ⏭ next
            </button>
            <div className="flex items-center rounded border border-border-strong overflow-hidden">
              {[0.5, 1, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => onSpeed?.(s)}
                  className={`px-1.5 py-0.5 text-[10px] tnum ${speed === s ? "bg-green text-bg" : "text-fg-dim hover:text-fg-muted"}`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        ) : (
          <span className="eyebrow">autonomous riposte</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[12px] leading-relaxed">
        {steps.length === 0 && <IdleMonitor />}
        <AnimatePresence initial={false}>
          {steps.map((step, si) => {
            const color = KIND_COLOR[step.kind];
            const isLast = si === steps.length - 1;
            const isSkip = step.kind === "skip";
            const isGate = step.kind === "self-eval";
            const isScale = step.kind === "allocation";
            const isAnalysis = step.kind === "teardown";
            return (
              <motion.div
                key={si}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`mb-3 pl-3 border-l-2 ${
                  isSkip ? "opacity-90" : ""
                }`}
                style={{ borderColor: color }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-semibold tracking-widest px-1.5 py-0.5 rounded"
                    style={{ color, background: `${color}1a` }}
                  >
                    {step.label}
                  </span>
                  {isGate && (
                    <span className="text-[9px] text-green tracking-wide">◇ GUARDRAIL · EVAL LOOP</span>
                  )}
                  {isSkip && (
                    <span className="text-[9px] text-fg-dim tracking-wide">◇ JUDGMENT</span>
                  )}
                  {isScale && (
                    <span className="text-[9px] text-green tracking-wide">◇ SCALE · ROI</span>
                  )}
                  {isAnalysis && (
                    <span className="text-[9px] text-red tracking-wide">◇ ANALYSIS</span>
                  )}
                </div>
                <div className="mt-1.5 space-y-0.5">
                  {step.lines.map((line, li) => (
                    <motion.p
                      key={li}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.12 + li * 0.18, duration: 0.25 }}
                      className={`${
                        line.startsWith("⚠") ? "text-amber" : "text-fg/85"
                      } ${isLast && li === step.lines.length - 1 ? "cursor-blink" : ""}`}
                    >
                      {line}
                    </motion.p>
                  ))}
                </div>
                {step.artifact && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.12 + step.lines.length * 0.18 }}
                  >
                    <Artifact artifact={step.artifact} />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={endRef} />
      </div>
    </div>
  );
}

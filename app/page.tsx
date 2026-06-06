"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWarRoom } from "@/lib/useWarRoom";
import { buildCuratedPrompts, ATTACKER, HERO_PROMPT, SKIP_PROMPT } from "@/lib/data";
import { Topbar } from "@/components/Topbar";
import { Metrics } from "@/components/Metrics";
import { PromptGrid } from "@/components/PromptGrid";
import { AgentConsole } from "@/components/AgentConsole";
import { EconomicsPanel } from "@/components/EconomicsPanel";
import { ScaleReveal } from "@/components/ScaleReveal";
import { Ambiance } from "@/components/Ambiance";
import { compactUSD } from "@/lib/economics";

interface DataSource {
  source: "demo" | "live";
  brand: string;
  count: number;
}

export default function WarRoom() {
  const { state, run, reset } = useWarRoom();
  const curated = useMemo(() => buildCuratedPrompts(), []);
  const [data, setData] = useState<DataSource>({ source: "demo", brand: "Anthropic", count: 2400 });

  // Pull the live Profound portfolio once. The grid stays on the coherent demo
  // scenario for reliability; this flips the data-source badge to LIVE and shows
  // the real brand + synced prompt count when a working key is configured.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/profound")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setData({
          source: d.source === "live" ? "live" : "demo",
          brand: d.brand || "Anthropic",
          count: Array.isArray(d.prompts) ? d.prompts.length : 2400,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Live-demo safety: keyboard triggers so the presenter never fumbles a click.
  // Space / Enter = run, R / Esc = reset.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (!state.running) run();
      } else if (e.key.toLowerCase() === "r" || e.code === "Escape") {
        reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, reset, state.running]);

  // Reveal the skipped low-value prompt in the grid once the agent's SKIP step fires.
  const skipId = state.revealed >= 5 ? SKIP_PROMPT.id : undefined;
  const curatedWithSkip = useMemo(() => {
    if (!skipId) return curated;
    // Inject the skip prompt next to the hero so the judgment beat is visible.
    const out = [...curated];
    if (!out.find((p) => p.id === SKIP_PROMPT.id)) out.splice(1, 0, SKIP_PROMPT);
    return out;
  }, [curated, skipId]);

  return (
    <div className="relative min-h-screen flex flex-col terminal-grid">
      <Ambiance phase={state.phase} />

      {/* Cinematic reconquest flash on the payoff beat. */}
      <AnimatePresence>
        {state.phase === "payoff" && (
          <div
            key="flash"
            className="reconquest-flash fixed inset-0 z-40 pointer-events-none"
            style={{ background: "radial-gradient(circle at 30% 45%, rgba(25,224,122,0.4), transparent 55%)" }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-col flex-1">
      <Topbar
        phase={state.phase}
        running={state.running}
        onRun={run}
        onReset={reset}
        dataSource={data.source}
        brand={data.brand}
        syncedCount={data.count}
      />

      {/* Attack alert banner */}
      <AnimatePresence>
        {state.revenueAtRisk > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-red-dim/30 border-b border-red/40"
          >
            <div className="px-6 py-2 flex items-center gap-3 text-sm">
              <span className="eyebrow text-red pulse-red rounded px-1">▲ alert</span>
              <span className="text-fg/90">
                <span className="text-red font-semibold">{ATTACKER}</span> overtook the citation on{" "}
                <span className="font-semibold">&ldquo;{HERO_PROMPT.text}&rdquo;</span> —{" "}
                <span className="tnum text-red">{compactUSD(HERO_PROMPT.annualValue)}/yr</span> at risk.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 px-6 py-5 grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-5">
        {/* LEFT: metrics + the live grid */}
        <div className="flex flex-col gap-5 min-w-0">
          <Metrics
            defendedMonthly={state.defendedMonthly}
            revenueAtRisk={state.revenueAtRisk}
            phase={state.phase}
          />
          <div className="flex flex-col gap-2 min-h-0">
            <div className="flex items-center justify-between">
              <span className="eyebrow text-fg-muted">
                High-intent prompts · share-of-answer
              </span>
              <span className="eyebrow">green = winning · red = losing</span>
            </div>
            <PromptGrid prompts={curatedWithSkip} hero={state.hero} skipPromptId={skipId} />
          </div>
        </div>

        {/* RIGHT: agent console + economics */}
        <div className="flex flex-col gap-5 min-h-0">
          <div className="h-[460px] min-h-0">
            <AgentConsole revealed={state.revealed} />
          </div>
          <EconomicsPanel />
        </div>
      </main>

      <footer className="px-6 py-2 border-t border-border flex items-center justify-between text-[10px] text-fg-dim">
        <span className="font-mono">
          BASTION · paid↔organic arbitrage · paid = temporary bridge, organic = permanent win
        </span>
        <span className="font-mono">[space] run · [r] reset</span>
      </footer>
      </div>

      <ScaleReveal open={state.showScale} onClose={reset} />
    </div>
  );
}

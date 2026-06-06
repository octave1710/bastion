"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { Prompt } from "@/lib/types";
import { DEFAULT_POLICY, type Policy } from "@/lib/policy";
import { compactUSD, fmtInt } from "@/lib/economics";

// Defense is half the game. Conquer = the prompts we DON'T own yet, ranked by the
// dollars we'd win by taking them. Real losing positions, real winnable upside.
export function ConquerView({ prompts, policy = DEFAULT_POLICY }: { prompts: Prompt[]; policy?: Policy }) {
  const { targets, totalUpside } = useMemo(() => {
    const targets = prompts
      .filter((p) => p.status !== "winning" && p.leader !== "us")
      .map((p) => {
        const target = 0.45; // a realistic winnable share of answer
        const upside = Math.max(0, p.annualValue * (target - p.shareOfAnswer));
        return { p, upside, target };
      })
      .filter((t) => t.upside > 0)
      .sort((a, b) => b.upside - a.upside)
      .slice(0, 24);
    return { targets, totalUpside: targets.reduce((a, t) => a + t.upside, 0) };
  }, [prompts]);

  function play(share: number, value: number): { label: string; color: string } {
    if (value > 400_000 && share < 0.15) return { label: "authority page + paid seed", color: "var(--blue)" };
    if (value > 200_000) return { label: "comparison page vs leader", color: "var(--violet)" };
    return { label: "targeted FAQ / proof block", color: "var(--green)" };
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border panel-elev rounded-sm overflow-hidden">
        <Stat label="Winnable upside /yr" value={compactUSD(totalUpside)} color="var(--green)" big />
        <Stat label="Conquer targets" value={fmtInt(targets.length)} color="var(--fg)" />
        <Stat label="Above defend threshold" value={fmtInt(targets.filter((t) => t.p.annualValue >= policy.defendThreshold).length)} color="var(--blue)" />
        <Stat label="Avg upside / target" value={compactUSD(targets.length ? totalUpside / targets.length : 0)} color="var(--violet)" />
      </div>

      <div className="bg-bg-panel border border-border panel-elev rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-bg-elev flex items-center justify-between">
          <span className="eyebrow text-fg-muted">
            Offense · prompts you&rsquo;re losing (real Profound share), ranked by winnable $
          </span>
          <span className="eyebrow text-amber">$ = illustrative estimate · share is real</span>
        </div>
        <div className="overflow-y-auto max-h-[560px]">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-bg-panel">
              <tr className="text-fg-dim eyebrow !text-[9px] text-left">
                <th className="px-4 py-2 font-normal">Prompt</th>
                <th className="px-2 py-2 font-normal">Leader</th>
                <th className="px-2 py-2 font-normal text-right">Our share</th>
                <th className="px-2 py-2 font-normal text-right">Value/yr</th>
                <th className="px-2 py-2 font-normal text-right">Winnable</th>
                <th className="px-4 py-2 font-normal">Recommended play</th>
              </tr>
            </thead>
            <tbody>
              {targets.map(({ p, upside }, i) => {
                const pl = play(p.shareOfAnswer, p.annualValue);
                return (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.03, 0.6) }}
                    className="border-t border-border/60 hover:bg-bg-elev"
                  >
                    <td className="px-4 py-1.5 text-fg/90 max-w-[260px] truncate">{p.text}</td>
                    <td className="px-2 py-1.5 text-red">{String(p.leader)}</td>
                    <td className="px-2 py-1.5 text-right tnum text-amber">{Math.round(p.shareOfAnswer * 100)}%</td>
                    <td className="px-2 py-1.5 text-right tnum text-fg-muted">{compactUSD(p.annualValue)}</td>
                    <td className="px-2 py-1.5 text-right tnum text-green">+{compactUSD(upside)}</td>
                    <td className="px-4 py-1.5">
                      <span className="text-[10px]" style={{ color: pl.color }}>{pl.label}</span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-fg-dim">
        Same agent, offense mode: it doesn&rsquo;t just defend what you have — it ranks what you could take, by the
        dollars at stake, and proposes the play. Defend + Conquer.
      </p>
    </div>
  );
}

function Stat({ label, value, color, big }: { label: string; value: string; color: string; big?: boolean }) {
  return (
    <div className="bg-bg-panel px-4 py-3">
      <div className={`tnum leading-none ${big ? "text-2xl" : "text-xl"}`} style={{ color }}>
        {value}
      </div>
      <div className="eyebrow mt-1.5">{label}</div>
    </div>
  );
}

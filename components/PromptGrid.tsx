"use client";

import { motion } from "framer-motion";
import type { Prompt } from "@/lib/types";
import { compactUSD, fmtInt } from "@/lib/economics";
import { HERO_PROMPT_ID } from "@/lib/data";
import type { HeroState } from "@/lib/useWarRoom";

const STATUS_COLOR: Record<string, string> = {
  winning: "var(--green)",
  contested: "var(--amber)",
  losing: "var(--red)",
  skipped: "var(--fg-dim)",
};

function effectiveStatus(p: Prompt, hero: HeroState): Prompt["status"] {
  if (p.id !== HERO_PROMPT_ID) return p.status;
  if (hero === "losing") return "losing";
  return "winning"; // winning or reconquered both read green
}

export function PromptGrid({
  prompts,
  hero,
  skipPromptId,
}: {
  prompts: Prompt[];
  hero: HeroState;
  skipPromptId?: string;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border panel-elev rounded-sm overflow-hidden">
      {prompts.map((p) => {
        const isHero = p.id === HERO_PROMPT_ID;
        const status =
          p.id === skipPromptId ? "skipped" : effectiveStatus(p, hero);
        const color = STATUS_COLOR[status];
        const reconquered = isHero && hero === "reconquered";
        return (
          <motion.div
            key={p.id}
            layout
            whileHover={{ y: -2 }}
            animate={{
              backgroundColor:
                status === "losing"
                  ? "rgba(255,59,59,0.10)"
                  : reconquered
                    ? "rgba(25,224,122,0.10)"
                    : "rgba(14,16,20,1)",
            }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className={`group relative px-3 py-2.5 overflow-hidden transition-shadow hover:z-10 ${
              isHero ? "ring-1 ring-inset" : ""
            }`}
            style={isHero ? { boxShadow: `inset 0 0 0 1px ${color}55` } : undefined}
          >
            {/* status spine */}
            <span
              className="absolute left-0 top-0 bottom-0 w-[3px]"
              style={{ background: color }}
            />
            {isHero && (
              <div className="mb-1 inline-flex items-center gap-1 text-[8px] tracking-widest font-semibold" style={{ color }}>
                ★ HERO · FULL LOOP LIVE
              </div>
            )}
            <div className="flex items-start justify-between gap-2">
              <span
                className="text-[12px] leading-tight text-fg/90 line-clamp-2"
                title={p.text}
              >
                {p.text}
              </span>
              <span
                className="tnum text-[10px] mt-0.5 shrink-0"
                style={{ color }}
              >
                {status === "skipped" ? "SKIP" : compactUSD(p.annualValue)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="eyebrow !text-[9px] !tracking-wider text-fg-dim">
                {fmtInt(p.monthlyVolume)}/mo
              </span>
              <span className="tnum text-[10px]" style={{ color }}>
                {Math.round(p.shareOfAnswer * 100)}%
              </span>
            </div>
            {/* share bar */}
            <div className="mt-1.5 h-1 w-full bg-bg rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: color }}
                animate={{ width: `${Math.round(p.shareOfAnswer * 100)}%` }}
                transition={{ duration: 0.7 }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

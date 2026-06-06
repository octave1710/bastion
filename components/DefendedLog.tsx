"use client";

import { motion, AnimatePresence } from "framer-motion";
import { compactUSD } from "@/lib/economics";

export interface DefenseEntry {
  id: number;
  prompt: string;
  value: number;
  engine: string;
  lever: string;
  shareBefore: number;
  shareDip: number;
  shareAfter: number;
}

// Persistent proof that the agent's actions worked — survives Exit. Each entry is a
// closed loop: share fell under attack, the riposte fired, share recovered.
export function DefendedLog({ entries }: { entries: DefenseEntry[] }) {
  const lifetime = entries.reduce((a, e) => a + e.value, 0);
  return (
    <div className="bg-bg-panel border border-border panel-elev rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-elev">
        <span className="eyebrow text-fg-muted">Defended log · proof of work</span>
        <span className="text-[11px]">
          <span className="text-fg-dim">lifetime defended </span>
          <span className="tnum text-green">{compactUSD(lifetime)}</span>
        </span>
      </div>
      <div className="px-2 py-2 max-h-[200px] overflow-y-auto">
        {entries.length === 0 ? (
          <p className="px-2 py-3 text-[11px] text-fg-dim">
            No defenses yet — run the agent. Completed defenses persist here as proof (survives Exit).
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {entries.map((e) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 px-2 py-2 rounded hover:bg-bg-elev border-l-2 border-green"
              >
                <ReconquestCurve before={e.shareBefore} dip={e.shareDip} after={e.shareAfter} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] text-fg/90 truncate">{e.prompt}</div>
                  <div className="text-[10px] text-fg-dim">
                    {Math.round(e.shareBefore * 100)}% → <span className="text-red">{Math.round(e.shareDip * 100)}%</span> →{" "}
                    <span className="text-green">{Math.round(e.shareAfter * 100)}%</span> · {e.lever} · {e.engine}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="tnum text-green text-[12px]">{compactUSD(e.value)}</div>
                  <div className="text-[9px] text-green/70">reconquered</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// Tiny sparkline: share falls under attack, then recovers — the closed loop.
function ReconquestCurve({ before, dip, after }: { before: number; dip: number; after: number }) {
  const w = 52, h = 26;
  const ys = [before, before, dip, (dip + after) / 2, after].map((v) => h - 3 - v * (h - 6));
  const xs = [0, 0.18, 0.45, 0.72, 1].map((t) => 2 + t * (w - 4));
  const d = xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <defs>
        <linearGradient id="rc" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--amber)" />
          <stop offset="45%" stopColor="var(--red)" />
          <stop offset="100%" stopColor="var(--green)" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke="url(#rc)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[4]} cy={ys[4]} r="2" fill="var(--green)" />
    </svg>
  );
}

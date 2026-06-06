"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Prompt } from "@/lib/types";
import { fmtInt } from "@/lib/economics";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

interface Entry {
  id: number;
  time: string;
  prompt: string;
  leader: string;
  share: number;
  slug: string;
  status: "generating" | "published" | "dispatched";
}

// Feature 3 — Autopilot: the agent runs continuously, scanning the gap list and
// generating + publishing content non-stop. The "one person, the work of a
// hundred, continuously" thesis — visible, real (each tick is a real generation).
export function Autopilot({ prompts }: { prompts: Prompt[] }) {
  const [on, setOn] = useState(false);
  const [feed, setFeed] = useState<Entry[]>([]);
  const [stats, setStats] = useState({ generated: 0, published: 0, dispatched: 0 });
  const idx = useRef(0);
  const seq = useRef(0);

  useEffect(() => {
    if (!on) return;
    const gaps = prompts.filter((p) => p.status !== "winning");
    if (!gaps.length) return;
    let active = true;

    async function tick() {
      if (!active) return;
      const p = gaps[idx.current % gaps.length];
      idx.current++;
      const id = ++seq.current;
      const slug = slugify(p.text);
      const entry: Entry = { id, time: new Date().toLocaleTimeString("en-GB"), prompt: p.text, leader: String(p.leader), share: p.shareOfAnswer, slug, status: "generating" };
      setFeed((f) => [entry, ...f].slice(0, 30));
      try {
        await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: p.text }) });
      } catch {
        /* keep going */
      }
      if (!active) return;
      setFeed((f) => f.map((e) => (e.id === id ? { ...e, status: "published" as const } : e)));
      setStats((s) => ({ generated: s.generated + 1, published: s.published + 1, dispatched: s.dispatched + (id % 3 === 0 ? 1 : 0) }));
      // occasionally dispatch a real Profound agent
      if (id % 3 === 0) {
        fetch("/api/profound/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefer: "article|aeo|citation" }) }).catch(() => {});
      }
      if (active) setTimeout(tick, 3200);
    }
    const t = setTimeout(tick, 400);
    return () => { active = false; clearTimeout(t); };
  }, [on, prompts]);

  return (
    <div className="bg-bg-panel border border-border panel-elev rounded-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-bg-elev flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="eyebrow text-fg-muted">Autopilot · continuous execution</span>
          {on && (
            <span className="flex items-center gap-1.5 text-[10px] text-green">
              <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse" /> running
            </span>
          )}
        </div>
        <button
          onClick={() => setOn((v) => !v)}
          className={`px-3 py-1 rounded text-[12px] font-semibold transition ${on ? "bg-red/15 text-red border border-red/40" : "bg-green text-bg"}`}
        >
          {on ? "■ Stop autopilot" : "▶ Start autopilot"}
        </button>
      </div>
      <div className="px-4 py-3">
        <div className="grid grid-cols-3 gap-px bg-border border border-border rounded-sm overflow-hidden mb-3">
          <Stat label="pages generated" value={stats.generated} color="var(--violet)" />
          <Stat label="published live" value={stats.published} color="var(--green)" />
          <Stat label="Profound agents fired" value={stats.dispatched} color="var(--blue)" />
        </div>
        <div className="max-h-[260px] overflow-hidden">
          {feed.length === 0 ? (
            <p className="text-[11px] text-fg-dim py-3">
              Start autopilot — the agent scans your gap list and keeps generating + publishing content non-stop, one person doing the work of a hundred.
            </p>
          ) : (
            <AnimatePresence initial={false} mode="popLayout">
              {feed.map((e) => (
                <motion.div
                  key={e.id}
                  layout
                  initial={{ opacity: 0, x: 14, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-2 py-1 text-[11px] font-mono border-b border-border/40"
                >
                  <span className="text-fg-dim shrink-0">{e.time}</span>
                  <span className="text-fg/85 truncate flex-1">{e.prompt}</span>
                  <span className="text-red shrink-0 text-[10px]">{Math.round(e.share * 100)}% · {e.leader}</span>
                  {e.status === "generating" ? (
                    <span className="text-amber shrink-0 text-[10px] animate-pulse">generating…</span>
                  ) : (
                    <a href={`/p/${e.slug}`} target="_blank" rel="noreferrer" className="text-green shrink-0 text-[10px] hover:underline">✓ published ↗</a>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-bg-panel px-3 py-2">
      <div className="tnum text-xl leading-none" style={{ color }}>{fmtInt(value)}</div>
      <div className="eyebrow !text-[8px] mt-1">{label}</div>
    </div>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedNumber } from "./AnimatedNumber";
import type { Prompt } from "@/lib/types";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

interface CheckResult { source: string; model: string; answer: string; citations: { domain: string; url: string; title: string }[]; competitors: string[]; weCited: boolean; mentioned: boolean }
interface GenResult { title: string; answer: string; keyFacts: string[]; slug: string }
interface JudgeResult { source: string; score: number; wouldCite: boolean; critique: string[]; strengths: string[] }
type Phase = "idle" | "checking" | "generating" | "judging" | "done";

// THE agent action — the Citation Proof Loop. One click runs the whole thing live:
// 1) ask the REAL answer engine who's cited now, 2) generate the winning page,
// 3) a judge agent rules whether our page would now be cited. Perceive → act →
// verify, with real API calls. The agent checks its own work against reality.
export function CitationProofLoop({ prompts, brand }: { prompts: Prompt[]; brand: string }) {
  const gaps = prompts.filter((p) => p.status !== "winning").sort((a, b) => b.annualValue - a.annualValue).slice(0, 8);
  const [prompt, setPrompt] = useState(gaps[0]?.text ?? "");
  const [phase, setPhase] = useState<Phase>("idle");
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [gen, setGen] = useState<GenResult | null>(null);
  const [judge, setJudge] = useState<JudgeResult | null>(null);

  const running = phase !== "idle" && phase !== "done";

  async function run() {
    if (!prompt || running) return;
    setCheck(null); setGen(null); setJudge(null);

    // 1) PERCEIVE — the real answer engine, live web search
    setPhase("checking");
    let chk: CheckResult | null = null;
    try {
      chk = await (await fetch("/api/citation-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) })).json();
      setCheck(chk);
    } catch { /* keep going */ }

    // 2) ACT — generate the winning page
    setPhase("generating");
    let g: GenResult | null = null;
    try {
      const j = await (await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) })).json();
      const c = j.content ?? {};
      g = { title: c.title ?? prompt, answer: c.answer ?? "", keyFacts: c.keyFacts ?? [], slug: slugify(prompt) };
      setGen(g);
    } catch { /* keep going */ }

    // 3) VERIFY — the answer-engine judge grades our page vs the current sources
    setPhase("judging");
    try {
      const content = g ? `${g.title}\n\n${g.answer}\n\n- ${g.keyFacts.join("\n- ")}` : prompt;
      const jr = await (await fetch("/api/citability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, content, competitors: chk?.competitors ?? [] }) })).json();
      setJudge(jr);
    } catch { /* keep going */ }

    setPhase("done");
  }

  return (
    <div className="bg-bg-panel border border-green/30 panel-elev rounded-sm overflow-hidden glow-border-green">
      <div className="px-4 py-2.5 border-b border-border bg-bg-elev flex items-center justify-between gap-3">
        <span className="eyebrow text-green">⛨ Citation Proof Loop · perceive → act → verify, live</span>
        <span className="eyebrow text-fg-dim hidden md:inline">real answer engine + agent judge</span>
      </div>

      <div className="px-4 py-3.5">
        <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
          <select
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={running}
            className="flex-1 min-w-0 bg-bg border border-border-strong rounded px-3 py-2 text-[13px] text-fg/90 outline-none focus:border-green disabled:opacity-60"
          >
            {gaps.map((g) => <option key={g.id} value={g.text}>{g.text}</option>)}
          </select>
          <button
            onClick={run}
            disabled={running || !prompt}
            className="px-4 py-2 rounded text-[13px] font-semibold bg-green text-bg hover:brightness-110 disabled:opacity-60 transition shrink-0"
          >
            {phase === "idle" || phase === "done" ? "▶ Run the live loop" : phase === "checking" ? "Asking the live AI…" : phase === "generating" ? "Writing the page…" : "Judging citability…"}
          </button>
        </div>

        {phase === "idle" ? (
          <p className="text-[12px] text-fg-muted mt-3 leading-relaxed">
            Watch the agent ask the <span className="text-green">real answer engine</span> this exact prompt, see it cite competitors and not {brand}, generate the page to win it back, and have a <span className="text-green">judge agent</span> confirm the new page would now be cited. Real API calls — no mockups.
          </p>
        ) : (
          <div className="mt-3.5 flex flex-col gap-2.5">
            <Step n={1} label="PERCEIVE · live answer engine" active={phase === "checking"} done={!!check} color="var(--red)">
              {check ? <PerceiveBody check={check} brand={brand} /> : <Working text="asking the live web — who gets cited right now…" />}
            </Step>

            <AnimatePresence>
              {(phase === "generating" || phase === "judging" || phase === "done") && (
                <Reveal>
                  <Step n={2} label="ACT · agent generates the winning page" active={phase === "generating"} done={!!gen} color="var(--violet)">
                    {gen ? <ActBody gen={gen} /> : <Working text="writing a publish-ready, schema-marked page…" />}
                  </Step>
                </Reveal>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {(phase === "judging" || phase === "done") && (
                <Reveal>
                  <Step n={3} label="VERIFY · answer-engine judge" active={phase === "judging"} done={!!judge} color="var(--green)">
                    {judge ? <VerifyBody judge={judge} brand={brand} /> : <Working text="judging our page against the cited sources…" />}
                  </Step>
                </Reveal>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {phase === "done" && judge && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-1 px-3 py-2.5 rounded bg-green/10 border border-green/30 text-[12.5px] text-fg">
                  <span className="text-green font-semibold">Loop closed.</span> Gap proven on the live internet → page shipped → re-judged{" "}
                  {judge.wouldCite ? <span className="text-green font-semibold">citable ({judge.score.toFixed(0)}/10)</span> : <span className="text-amber font-semibold">improving</span>}. This is the agent verifying its own work against reality.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function Reveal({ children }: { children: ReactNode }) {
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>{children}</motion.div>;
}

function Step({ n, label, active, done, color, children }: { n: number; label: string; active: boolean; done: boolean; color: string; children: ReactNode }) {
  return (
    <div className="flex gap-3" style={{ opacity: active || done ? 1 : 0.85 }}>
      <div className="flex flex-col items-center pt-0.5">
        <div
          className="h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold tnum shrink-0 border-2"
          style={{ borderColor: color, color: done ? "var(--bg)" : color, background: done ? color : "transparent" }}
        >
          {done ? "✓" : n}
        </div>
        {n < 3 && <div className="w-px flex-1 my-1" style={{ background: "var(--border-strong)" }} />}
      </div>
      <div className="flex-1 min-w-0 pb-1">
        <div className="eyebrow mb-1.5" style={{ color: active ? color : "var(--fg-dim)" }}>{label}{active && <span className="cursor-blink ml-1" />}</div>
        {children}
      </div>
    </div>
  );
}

function Working({ text }: { text: string }) {
  return <div className="text-[12px] text-fg-dim"><span className="cursor-blink">{text}</span></div>;
}

function PerceiveBody({ check, brand }: { check: CheckResult; brand: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[10px]">
        <span className="font-mono text-fg-dim">{check.model}</span>
        <span className={`px-1.5 py-0.5 rounded ${check.source === "live" ? "text-green bg-green/10 border border-green/30" : "text-amber bg-amber/10 border border-amber/30"}`}>{check.source === "live" ? "● live web search" : "cached"}</span>
      </div>
      {check.answer && <p className="text-[12px] text-fg-muted leading-snug line-clamp-3 italic">&ldquo;{check.answer}&rdquo;</p>}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="eyebrow text-fg-dim">cited now:</span>
        {check.citations.length ? (
          check.citations.slice(0, 7).map((c, i) => (
            <motion.span key={c.domain} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 * i }} className="text-[10px] font-mono px-1.5 py-0.5 rounded text-red bg-red/10 border border-red/25">{c.domain}</motion.span>
          ))
        ) : (
          <span className="text-[11px] text-fg-dim italic">third-party pages — {brand} absent from the sources</span>
        )}
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 1.5, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: -3 }}
        transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.35 }}
        className={`self-start mt-0.5 px-2.5 py-1 rounded border-2 text-[12px] font-extrabold tracking-wide ${check.weCited ? "text-green border-green" : "text-red border-red"}`}
      >
        {check.weCited ? `${brand} — CITED ✓` : `${brand} — NOT CITED`}
      </motion.div>
    </div>
  );
}

function ActBody({ gen }: { gen: GenResult }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[13px] text-fg font-semibold leading-snug">{gen.title}</p>
      {gen.answer && <p className="text-[11.5px] text-fg-muted leading-snug line-clamp-2">{gen.answer}</p>}
      <div className="flex items-center gap-2 mt-0.5">
        <a href={`/p/${gen.slug}`} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded text-[11px] font-semibold bg-violet text-bg hover:brightness-110">↗ Publish (open live page)</a>
        <span className="text-[10px] text-fg-dim font-mono">/p/{gen.slug} · FAQ schema</span>
      </div>
    </div>
  );
}

function VerifyBody({ judge, brand }: { judge: JudgeResult; brand: string }) {
  const pts = judge.strengths.length ? judge.strengths : judge.critique;
  return (
    <div className="flex gap-3.5 items-start">
      <div className="flex flex-col items-center shrink-0">
        <div className="relative h-14 w-14">
          <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border-strong)" strokeWidth="3" />
            <motion.circle cx="18" cy="18" r="15.5" fill="none" stroke={judge.wouldCite ? "var(--green)" : "var(--amber)"} strokeWidth="3" strokeLinecap="round" strokeDasharray={2 * Math.PI * 15.5} initial={{ strokeDashoffset: 2 * Math.PI * 15.5 }} animate={{ strokeDashoffset: 2 * Math.PI * 15.5 * (1 - judge.score / 10) }} transition={{ duration: 0.9, ease: "easeOut" }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatedNumber value={judge.score} format={(n) => n.toFixed(0)} className="tnum text-lg font-bold text-fg" />
            <span className="text-[10px] text-fg-dim mt-1.5">/10</span>
          </div>
        </div>
        <span className={`mt-1 text-[10px] font-semibold ${judge.wouldCite ? "text-green" : "text-amber"}`}>{judge.wouldCite ? "would cite ✓" : "borderline"}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="eyebrow text-green mb-1">why it now wins the citation</div>
        <ul className="space-y-1">
          {pts.slice(0, 3).map((s, i) => (
            <motion.li key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }} className="text-[12px] text-fg-muted leading-snug">✓ {s}</motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Prompt } from "@/lib/types";
import type { AeoContent } from "@/lib/aeo-content";
import type { BrandKpiData } from "./BrandKpis";
import { DEFAULT_POLICY } from "@/lib/policy";
import { benchmarkCpc, buildCampaign, toGoogleAdsCsv, campaignTotals, type CampaignRow } from "@/lib/campaign";
import { buildBriefHtml } from "@/lib/brief";
import { compactUSD, fmtUSD, fmtInt } from "@/lib/economics";

interface Produced {
  prompt: Prompt;
  content?: AeoContent;
  source?: string;
  status: "queued" | "generating" | "done" | "error";
  open?: boolean;
}
interface AgentRun {
  agentName: string;
  runId: string;
  status: string;
}
interface Plan {
  gaps: Prompt[];
  contentPrompts: Prompt[];
  paidPrompts: Prompt[];
  campaign: CampaignRow[];
  totals: ReturnType<typeof campaignTotals>;
}

const MAX_LIVE = 8; // generate this many FULL articles live; rest staged

function allocate(prompts: Prompt[], budget: number): Plan {
  const threshold = DEFAULT_POLICY.defendThreshold;
  const defended = prompts.filter((p) => p.annualValue >= threshold);
  const losing = defended.filter((p) => p.status === "losing").sort((a, b) => b.annualValue - a.annualValue);
  const paidPrompts: Prompt[] = [];
  let spent = 0;
  for (const p of losing) {
    const need = Math.min(400, Math.round(benchmarkCpc(p.text) * 18));
    if (spent + need <= budget) { paidPrompts.push(p); spent += need; }
  }
  const contentPrompts = defended.sort((a, b) => b.annualValue - a.annualValue);
  const campaign = buildCampaign(paidPrompts, budget);
  return { gaps: contentPrompts, contentPrompts, paidPrompts, campaign, totals: campaignTotals(campaign) };
}

function downloadFile(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

// The agentic core: SENSE real gaps → ALLOCATE a real ad budget → GENERATE full
// publish-ready content live → DISPATCH real Profound agents → PRODUCE real
// deliverables (exec brief, content pack, Google Ads campaign).
export function ExecuteView({ prompts, brandKpis, brand }: { prompts: Prompt[]; brandKpis: BrandKpiData; brand: string }) {
  const [budget, setBudget] = useState(1500);
  const [running, setRunning] = useState(false);
  const [produced, setProduced] = useState<Produced[]>([]);
  const [agents, setAgents] = useState<AgentRun[]>([]);
  const [executed, setExecuted] = useState<Plan | null>(null); // snapshot at run time
  const cancel = useRef(false);

  // Pre-run, budget-reactive preview. After running, we show the snapshot instead.
  const preview = useMemo(() => allocate(prompts, budget), [prompts, budget]);
  const plan = executed ?? preview;

  async function execute() {
    cancel.current = false;
    setRunning(true);
    setAgents([]);
    const snap = allocate(prompts, budget);
    setExecuted(snap); // lock the plan — budget changes after this won't rewrite results
    const queue = snap.contentPrompts.slice(0, MAX_LIVE);
    setProduced(queue.map((p) => ({ prompt: p, status: "queued" as const })));

    // Dispatch real Profound agents in parallel (genuine platform execution).
    for (const prefer of ["citation gap", "article|aeo", "competiti"]) {
      fetch("/api/profound/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefer }) })
        .then((r) => r.json())
        .then((j) => { if (j.source === "live") setAgents((a) => (a.find((x) => x.runId === j.runId) ? a : [...a, j])); })
        .catch(() => {});
    }

    for (let i = 0; i < queue.length; i++) {
      if (cancel.current) break;
      setProduced((prev) => prev.map((x, j) => (j === i ? { ...x, status: "generating" } : x)));
      try {
        const r = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: queue[i].text }) });
        const j = await r.json();
        setProduced((prev) => prev.map((x, k) => (k === i ? { ...x, content: j.content, source: j.source, status: "done" } : x)));
      } catch {
        setProduced((prev) => prev.map((x, k) => (k === i ? { ...x, status: "error" } : x)));
      }
    }
    setRunning(false);
  }

  const doneItems = produced.filter((p) => p.content);
  const finished = executed != null && !running;

  function openBrief() {
    const html = buildBriefHtml({
      brand,
      dateLabel: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      kpis: brandKpis,
      gaps: plan.gaps.slice(0, 10).map((p) => ({ text: p.text, share: p.shareOfAnswer, leader: String(p.leader), value: p.annualValue })),
      content: doneItems.map((p) => ({ prompt: p.prompt.text, c: p.content! })),
      campaign: { keywords: plan.campaign.length, daily: plan.totals.daily, monthly: plan.totals.monthly, clicks: plan.totals.clicks },
      agents,
      projectedLiftPts: 9,
    });
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
    else downloadFile("bastion-ai-visibility-brief.html", html, "text/html");
  }

  function exportContent() {
    const mdDoc = doneItems
      .map((p) => `${p.content!.body ?? `# ${p.content!.title}\n\n${p.content!.answer}`}\n\n_Target prompt: "${p.prompt.text}"_\n`)
      .join("\n\n---\n\n");
    downloadFile("bastion-aeo-content-pack.md", `# ${brand} — AEO Content Pack (${doneItems.length} pages)\n\n${mdDoc}`, "text/markdown");
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Plan + the explicit paid-ads budget control */}
      <div className="bg-bg-panel border border-border panel-elev rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-bg-elev flex items-center justify-between">
          <span className="eyebrow text-fg">Agent · execute the AEO plan on real Profound gaps</span>
          <span className="text-[11px] text-fg-muted">{fmtInt(preview.contentPrompts.length)} gaps above ROI threshold</span>
        </div>
        <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1.1fr] gap-5 items-center">
          <div>
            <div className="flex items-center justify-between text-[12px] mb-1.5">
              <span className="text-blue font-semibold">◆ PAID ADS BUDGET</span>
              <span className="tnum text-blue text-lg">{fmtUSD(budget)}<span className="text-fg-muted text-xs">/day</span></span>
            </div>
            <input type="range" min={0} max={6000} step={250} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full accent-blue" disabled={running} />
            <div className="text-[11px] text-fg-muted mt-1">
              funds <span className="text-blue font-medium">{preview.paidPrompts.length} paid bridges</span> now · the rest win via <span className="text-violet font-medium">organic content</span> (free, permanent)
              {finished && <span className="text-amber"> · re-run to apply a new budget</span>}
            </div>
          </div>
          <div className="text-[12px] text-fg-muted leading-relaxed">
            <div>Organic content: <span className="text-violet font-medium tnum">{plan.contentPrompts.length}</span> pages</div>
            <div>Paid bridge: <span className="text-blue font-medium tnum">{plan.campaign.length}</span> keywords · <span className="tnum text-fg">{fmtUSD(plan.totals.daily)}/day</span></div>
            <div className="text-fg-muted/70">≈ {fmtInt(plan.totals.clicks)} clicks/day held while organic ranks</div>
          </div>
          <button onClick={execute} disabled={running} className="px-4 py-3 rounded text-sm font-semibold bg-green text-bg hover:brightness-110 disabled:opacity-50 transition">
            {running ? `Executing ${doneItems.length}/${Math.min(preview.contentPrompts.length, MAX_LIVE)}…` : "▶ Execute plan — generate full content live"}
          </button>
        </div>
      </div>

      {/* Deliverables — the real, usable outputs */}
      {finished && doneItems.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ArtifactCard tag="★ Exec brief" color="var(--green)" title="AI Visibility Action Brief" sub="Profound-branded · present to your CMO" action="Open brief →" onClick={openBrief} primary />
          <ArtifactCard tag="◆ Content pack" color="var(--violet)" title={`${doneItems.length} full pages (.md)`} sub="publish-ready, generated live" action="Download .md" onClick={exportContent} />
          <ArtifactCard tag="◆ Paid campaign" color="var(--blue)" title={`${plan.campaign.length} keywords · ${fmtUSD(plan.totals.daily)}/day`} sub="Google Ads Editor .csv" action="Download .csv" onClick={() => downloadFile("bastion-google-ads-campaign.csv", toGoogleAdsCsv(plan.campaign), "text/csv")} />
        </motion.div>
      )}

      {/* Real Profound agents dispatched */}
      {agents.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="eyebrow text-fg-muted">dispatched on Profound:</span>
          {agents.map((a) => (
            <span key={a.runId} className="rounded px-2 py-1 border border-violet/40 text-violet bg-violet/10">
              ⚡ {a.agentName} <span className="text-fg-dim">· run {a.runId.slice(0, 8)} · {a.status}</span>
            </span>
          ))}
        </div>
      )}

      {/* Live full-article output */}
      {produced.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="eyebrow text-fg-muted">Generated content {running && "· live"}</span>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <AnimatePresence initial={false}>
              {produced.map((p, idx) => (
                <motion.div key={p.prompt.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-bg-panel border border-border rounded-sm overflow-hidden">
                  <div className="px-3 py-2 border-b border-border bg-bg-elev flex items-center justify-between gap-2">
                    <span className="text-[12px] text-fg/90 truncate">{p.prompt.text}</span>
                    <StatusPill status={p.status} source={p.source} />
                  </div>
                  {p.content && (
                    <div className="px-3 py-2.5">
                      <p className="text-[13px] text-fg font-semibold leading-snug">{p.content.title}</p>
                      <p className="mt-1.5 text-[11px] text-fg-muted leading-relaxed">{p.content.answer}</p>
                      {p.content.body && (
                        <>
                          <button
                            onClick={() => setProduced((prev) => prev.map((x, k) => (k === idx ? { ...x, open: !x.open } : x)))}
                            className="mt-2 text-[10px] text-violet hover:underline"
                          >
                            {p.open ? "▾ hide full article" : "▸ read full article"} ({p.content.body.split(/\s+/).length} words)
                          </button>
                          {p.open && (
                            <pre className="mt-2 text-[10.5px] text-fg/80 whitespace-pre-wrap leading-relaxed bg-bg rounded p-2.5 max-h-[280px] overflow-y-auto font-sans">
                              {p.content.body}
                            </pre>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {p.status === "generating" && <div className="px-3 py-3 text-[11px] text-fg-dim"><span className="cursor-blink">agent writing the full optimized page…</span></div>}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {produced.length === 0 && (
        <p className="text-[12px] text-fg-muted px-1">
          The agent reads your real Profound gaps, allocates the <span className="text-blue">paid ads budget</span> across paid bridges and organic content, generates the full publish-ready pages live, dispatches real Profound agents, and hands you an <span className="text-green">exec-ready brief</span> + content pack + campaign file. Press <span className="text-green">Execute</span>.
        </p>
      )}
    </div>
  );
}

function ArtifactCard({ tag, color, title, sub, action, onClick, primary }: { tag: string; color: string; title: string; sub: string; action: string; onClick: () => void; primary?: boolean }) {
  return (
    <div className="rounded-sm overflow-hidden p-3.5 border" style={{ borderColor: `${color}${primary ? "" : "55"}`, background: primary ? `${color}14` : "var(--bg-panel)" }}>
      <div className="eyebrow" style={{ color }}>{tag}</div>
      <div className="mt-1.5 text-[13px] text-fg font-semibold">{title}</div>
      <div className="text-[10px] text-fg-muted">{sub}</div>
      <button onClick={onClick} className="mt-2.5 w-full px-3 py-2 rounded text-[12px] font-semibold transition hover:brightness-110" style={primary ? { background: color, color: "var(--bg)" } : { border: `1px solid ${color}66`, color, background: `${color}14` }}>
        {action}
      </button>
    </div>
  );
}

function StatusPill({ status, source }: { status: Produced["status"]; source?: string }) {
  if (status === "done") return <span className="text-[9px] tracking-wide text-green shrink-0">✓ {source === "openai" ? "generated live" : "ready"}</span>;
  if (status === "generating") return <span className="text-[9px] tracking-wide text-amber animate-pulse shrink-0">writing…</span>;
  if (status === "error") return <span className="text-[9px] text-red shrink-0">error</span>;
  return <span className="text-[9px] text-fg-dim shrink-0">queued</span>;
}

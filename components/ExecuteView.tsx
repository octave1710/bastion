"use client";

import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Prompt } from "@/lib/types";
import type { AeoContent } from "@/lib/aeo-content";
import type { BrandKpiData } from "./BrandKpis";
import { DEFAULT_POLICY } from "@/lib/policy";
import { benchmarkCpc, buildCampaign, toGoogleAdsCsv, campaignTotals, type CampaignRow } from "@/lib/campaign";
import { buildBriefHtml } from "@/lib/brief";
import { Autopilot } from "./Autopilot";
import { compactUSD, fmtUSD, fmtInt } from "@/lib/economics";

interface Produced {
  prompt: Prompt;
  content?: AeoContent;
  source?: string;
  status: "queued" | "generating" | "done" | "error";
  channel?: Channel;
}
type Channel = "article" | "linkedin" | "x" | "reddit" | "email";
interface AgentRun { agentName: string; runId: string; status: string }
interface Plan { contentPrompts: Prompt[]; paidPrompts: Prompt[]; campaign: CampaignRow[]; totals: ReturnType<typeof campaignTotals> }

const MAX_LIVE = 6;
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

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
  return { contentPrompts, paidPrompts, campaign, totals: campaignTotals(campaign) };
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export function ExecuteView({ prompts, brandKpis, brand }: { prompts: Prompt[]; brandKpis: BrandKpiData; brand: string }) {
  const [budget, setBudget] = useState(1500);
  const [running, setRunning] = useState(false);
  const [produced, setProduced] = useState<Produced[]>([]);
  const [agents, setAgents] = useState<AgentRun[]>([]);
  const [executed, setExecuted] = useState<Plan | null>(null);
  const cancel = useRef(false);

  const preview = useMemo(() => allocate(prompts, budget), [prompts, budget]);
  const plan = executed ?? preview;
  const doneItems = produced.filter((p) => p.content);
  const finished = executed != null && !running;

  async function execute() {
    cancel.current = false;
    setRunning(true);
    setAgents([]);
    const snap = allocate(prompts, budget);
    setExecuted(snap);
    const queue = snap.contentPrompts.slice(0, MAX_LIVE);
    setProduced(queue.map((p) => ({ prompt: p, status: "queued" as const, channel: "article" as Channel })));

    for (const prefer of ["citation gap", "article|aeo", "draft outreach|reddit"]) {
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

  function openBrief() {
    const html = buildBriefHtml({
      brand,
      dateLabel: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      kpis: brandKpis,
      gaps: plan.contentPrompts.slice(0, 10).map((p) => ({ text: p.text, share: p.shareOfAnswer, leader: String(p.leader), value: p.annualValue })),
      content: doneItems.map((p) => ({ prompt: p.prompt.text, c: p.content! })),
      campaign: { keywords: plan.campaign.length, daily: plan.totals.daily, monthly: plan.totals.monthly, clicks: plan.totals.clicks },
      agents,
      projectedLiftPts: 9,
    });
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); } else download("bastion-brief.html", html, "text/html");
  }

  function exportContent() {
    const md = doneItems.map((p) => `${p.content!.body ?? `# ${p.content!.title}\n\n${p.content!.answer}`}\n\n_Prompt: "${p.prompt.text}" · Published: /p/${slugify(p.prompt.text)}_\n`).join("\n\n---\n\n");
    download("bastion-aeo-content-pack.md", `# ${brand} — AEO Content Pack (${doneItems.length} pages)\n\n${md}`, "text/markdown");
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Plan + explicit paid-ads budget */}
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
              funds <span className="text-blue font-medium">{preview.paidPrompts.length} paid bridges</span> · the rest win via <span className="text-violet font-medium">organic content</span>
              {finished && <span className="text-amber"> · re-run to apply</span>}
            </div>
          </div>
          <div className="text-[12px] text-fg-muted leading-relaxed">
            <div>Content kits: <span className="text-violet font-medium tnum">{plan.contentPrompts.length}</span></div>
            <div>Paid bridge: <span className="text-blue font-medium tnum">{plan.campaign.length}</span> kw · <span className="tnum text-fg">{fmtUSD(plan.totals.daily)}/day</span></div>
            <div className="text-fg-muted/80">≈ {fmtInt(plan.totals.clicks)} clicks/day held while organic ranks</div>
          </div>
          <button onClick={execute} disabled={running} className="px-4 py-3 rounded text-sm font-semibold bg-green text-bg hover:brightness-110 disabled:opacity-50 transition">
            {running ? `Executing ${doneItems.length}/${Math.min(preview.contentPrompts.length, MAX_LIVE)}…` : "▶ Execute — generate + distribute + publish"}
          </button>
        </div>
      </div>

      {/* Feature 3 — continuous execution */}
      <Autopilot prompts={prompts} />

      {finished && doneItems.length > 0 && (
        <>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Artifact tag="★ Exec brief" color="var(--green)" title="AI Visibility Action Brief" sub="Profound-branded · present to your CMO" action="Open brief →" onClick={openBrief} primary />
            <Artifact tag="◆ Content pack" color="var(--violet)" title={`${doneItems.length} full pages (.md)`} sub="publish-ready, generated live" action="Download .md" onClick={exportContent} />
            <Artifact tag="◆ Paid campaign" color="var(--blue)" title={`${plan.campaign.length} keywords · ${fmtUSD(plan.totals.daily)}/day`} sub="Google Ads Editor .csv" action="Download .csv" onClick={() => download("bastion-google-ads-campaign.csv", toGoogleAdsCsv(plan.campaign), "text/csv")} />
          </motion.div>

          <PaidOrganicAutopilot plan={plan} />
        </>
      )}

      {agents.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="eyebrow text-fg-muted">dispatched on Profound:</span>
          {agents.map((a) => (
            <span key={a.runId} className="rounded px-2 py-1 border border-violet/40 text-violet bg-violet/10">⚡ {a.agentName} <span className="text-fg-dim">· run {a.runId.slice(0, 8)} · {a.status}</span></span>
          ))}
        </div>
      )}

      {produced.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="eyebrow text-fg-muted">Generated content kits {running && "· live"} — page + distribution, ready to publish</span>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <AnimatePresence initial={false}>
              {produced.map((p, idx) => (
                <ContentKit key={p.prompt.id} p={p} onChannel={(ch) => setProduced((prev) => prev.map((x, k) => (k === idx ? { ...x, channel: ch } : x)))} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-fg-muted px-1">
          The agent reads your real Profound gaps, allocates the <span className="text-blue">paid ads budget</span>, generates a full content kit per gap (page + schema + LinkedIn/X/Reddit/email), publishes live pages, dispatches real Profound agents, and hands you an <span className="text-green">exec brief</span>. Press <span className="text-green">Execute</span>.
        </p>
      )}
    </div>
  );
}

// The Paid↔Organic Autopilot: the agent manages the bridge lifecycle — paid holds
// now, organic wins permanently, paid auto-tapers to $0 as organic ranks.
function PaidOrganicAutopilot({ plan }: { plan: Plan }) {
  const days = 8;
  const bridgeCost = plan.totals.daily * days;
  const monthlySaved = plan.totals.monthly; // paid you stop paying once organic ranks
  const annualSaved = plan.totals.daily * 365 - bridgeCost;
  return (
    <div className="bg-bg-panel border border-border panel-elev rounded-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-bg-elev flex items-center justify-between">
        <span className="eyebrow text-fg-muted">Paid ↔ Organic Autopilot · the agent cuts paid as organic ranks</span>
        <span className="eyebrow text-amber">$ illustrative</span>
      </div>
      <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-5 items-center">
        <div>
          <div className="flex items-center justify-between text-[10px] text-fg-dim mb-1"><span>Day 0 — paid holds the position</span><span>Day {days} — organic ranks, paid → $0</span></div>
          <div className="flex gap-[3px] items-end h-16">
            {Array.from({ length: days + 1 }, (_, i) => {
              const paid = Math.max(0, 1 - i / days);
              const organic = i / days;
              return (
                <div key={i} className="flex-1 flex flex-col justify-end gap-[2px] h-full">
                  <div style={{ height: `${organic * 100}%`, background: "var(--violet)" }} className="rounded-t-sm" title={`Day ${i}: organic ${Math.round(organic * 100)}%`} />
                  <div style={{ height: `${paid * 100}%`, background: "var(--blue)" }} className="rounded-b-sm" title={`Day ${i}: paid ${Math.round(paid * 100)}%`} />
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-2 text-[10px]">
            <span className="text-blue">■ paid bridge (temporary)</span>
            <span className="text-violet">■ organic (permanent)</span>
          </div>
        </div>
        <div className="text-[12px] space-y-1.5">
          <div className="flex justify-between"><span className="text-fg-muted">Bridge cost ({days} days)</span><span className="tnum text-blue">{fmtUSD(bridgeCost)}</span></div>
          <div className="flex justify-between"><span className="text-fg-muted">Paid saved /mo once organic ranks</span><span className="tnum text-green">{compactUSD(monthlySaved)}</span></div>
          <div className="flex justify-between border-t border-border pt-1.5"><span className="text-fg">Net saved /yr by switching to organic</span><span className="tnum text-green font-semibold">{compactUSD(annualSaved)}</span></div>
          <p className="text-[10px] text-fg-dim pt-1">The agent monitors organic recovery on Profound and auto-tapers the campaign — you stop paying once you own the answer.</p>
        </div>
      </div>
    </div>
  );
}

const CHANNELS: { id: Channel; label: string; how: string }[] = [
  { id: "article", label: "Page", how: "publish to your blog / docs" },
  { id: "linkedin", label: "LinkedIn", how: "post from your company page" },
  { id: "x", label: "X thread", how: "post as a thread" },
  { id: "reddit", label: "Reddit", how: "answer the relevant thread" },
  { id: "email", label: "Outreach", how: "send to a journalist / partner" },
];

function ContentKit({ p, onChannel }: { p: Produced; onChannel: (c: Channel) => void }) {
  const ch = p.channel ?? "article";
  const c = p.content;
  const slug = slugify(p.prompt.text);
  const d = c?.distribution;
  const body =
    ch === "article" ? (c?.body ?? c?.answer ?? "") :
    ch === "linkedin" ? (d?.linkedin ?? "") :
    ch === "x" ? (d?.xThread ?? []).map((t, i) => `${i + 1}/ ${t}`).join("\n\n") :
    ch === "reddit" ? (d?.reddit ?? "") : (d?.email ?? "");
  const how = CHANNELS.find((x) => x.id === ch)?.how ?? "";

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-bg-panel border border-border rounded-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-bg-elev flex items-center justify-between gap-2">
        <span className="text-[12px] text-fg/90 truncate">{p.prompt.text}</span>
        <StatusPill status={p.status} source={p.source} />
      </div>
      {c ? (
        <div className="px-3 py-2.5">
          <p className="text-[13px] text-fg font-semibold leading-snug">{c.title}</p>
          {/* channel switcher */}
          <div className="flex flex-wrap gap-1 mt-2">
            {CHANNELS.map((x) => (
              <button key={x.id} onClick={() => onChannel(x.id)} className={`px-2 py-0.5 rounded text-[10px] transition ${ch === x.id ? "bg-violet text-bg font-semibold" : "text-fg-dim hover:text-fg-muted border border-border-strong"}`}>{x.label}</button>
            ))}
          </div>
          <div className="text-[10px] text-fg-dim mt-1.5">↳ {how}</div>
          <pre className="mt-1.5 text-[11px] text-fg/85 whitespace-pre-wrap leading-relaxed bg-bg rounded p-2.5 max-h-[220px] overflow-y-auto font-sans">{body}</pre>
          <div className="mt-2 flex items-center gap-2">
            <a href={`/p/${slug}`} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded text-[11px] font-semibold bg-green text-bg hover:brightness-110">↗ Publish (open live page)</a>
            <button onClick={() => navigator.clipboard?.writeText(body)} className="px-2.5 py-1 rounded text-[11px] border border-border-strong text-fg-muted hover:text-fg">Copy</button>
            <span className="ml-auto text-[9px] text-fg-dim">/p/{slug}</span>
          </div>
        </div>
      ) : p.status === "generating" ? (
        <div className="px-3 py-4 text-[11px] text-fg-dim"><span className="cursor-blink">agent writing the page + LinkedIn + X + Reddit + email…</span></div>
      ) : (
        <div className="px-3 py-4 text-[11px] text-fg-dim">queued</div>
      )}
    </motion.div>
  );
}

function Artifact({ tag, color, title, sub, action, onClick, primary }: { tag: string; color: string; title: string; sub: string; action: string; onClick: () => void; primary?: boolean }) {
  return (
    <div className="rounded-sm overflow-hidden p-3.5 border" style={{ borderColor: `${color}${primary ? "" : "55"}`, background: primary ? `${color}14` : "var(--bg-panel)" }}>
      <div className="eyebrow" style={{ color }}>{tag}</div>
      <div className="mt-1.5 text-[13px] text-fg font-semibold">{title}</div>
      <div className="text-[10px] text-fg-muted">{sub}</div>
      <button onClick={onClick} className="mt-2.5 w-full px-3 py-2 rounded text-[12px] font-semibold transition hover:brightness-110" style={primary ? { background: color, color: "var(--bg)" } : { border: `1px solid ${color}66`, color, background: `${color}14` }}>{action}</button>
    </div>
  );
}

function StatusPill({ status, source }: { status: Produced["status"]; source?: string }) {
  if (status === "done") return <span className="text-[9px] tracking-wide text-green shrink-0">✓ {source === "openai" ? "generated live" : "ready"}</span>;
  if (status === "generating") return <span className="text-[9px] tracking-wide text-amber animate-pulse shrink-0">writing…</span>;
  if (status === "error") return <span className="text-[9px] text-red shrink-0">error</span>;
  return <span className="text-[9px] text-fg-dim shrink-0">queued</span>;
}

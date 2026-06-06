"use client";

import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Prompt } from "@/lib/types";
import type { AeoContent } from "@/lib/aeo-content";
import { DEFAULT_POLICY } from "@/lib/policy";
import { benchmarkCpc, buildCampaign, toGoogleAdsCsv, campaignTotals } from "@/lib/campaign";
import { compactUSD, fmtUSD, fmtInt } from "@/lib/economics";

interface Produced {
  prompt: Prompt;
  content?: AeoContent;
  source?: string;
  status: "queued" | "generating" | "done" | "error";
}

const MAX_LIVE = 12; // generate this many live; rest queued (shown, not blocked)

function downloadFile(name: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// The agentic core: the agent SENSES gaps, ALLOCATES a real budget across paid vs
// organic, GENERATES real content live, and PRODUCES real downloadable artifacts.
export function ExecuteView({ prompts }: { prompts: Prompt[] }) {
  const [budget, setBudget] = useState(1500); // $/day — real reallocation lever
  const [running, setRunning] = useState(false);
  const [produced, setProduced] = useState<Produced[]>([]);
  const [done, setDone] = useState(false);
  const cancel = useRef(false);

  // SENSE + ALLOCATE: real split driven by the budget.
  const { contentPrompts, paidPrompts, campaign, totals } = useMemo(() => {
    const threshold = DEFAULT_POLICY.defendThreshold;
    const defended = prompts.filter((p) => p.annualValue >= threshold);
    const losing = defended
      .filter((p) => p.status === "losing")
      .sort((a, b) => b.annualValue - a.annualValue);

    // Fund paid bridges from the budget, top-value first, until it runs out.
    const paidPrompts: Prompt[] = [];
    let spent = 0;
    for (const p of losing) {
      const need = Math.min(400, Math.round(benchmarkCpc(p.text) * 18));
      if (spent + need <= budget) {
        paidPrompts.push(p);
        spent += need;
      }
    }
    // Organic content is produced for ALL defended prompts (the permanent fix).
    const contentPrompts = defended.sort((a, b) => b.annualValue - a.annualValue);
    const campaign = buildCampaign(paidPrompts, budget);
    return { contentPrompts, paidPrompts, campaign, totals: campaignTotals(campaign) };
  }, [prompts, budget]);

  async function execute() {
    cancel.current = false;
    setRunning(true);
    setDone(false);
    const queue = contentPrompts.slice(0, MAX_LIVE);
    setProduced(queue.map((p) => ({ prompt: p, status: "queued" as const })));

    for (let i = 0; i < queue.length; i++) {
      if (cancel.current) break;
      setProduced((prev) => prev.map((x, j) => (j === i ? { ...x, status: "generating" } : x)));
      try {
        const r = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: queue[i].text }),
        });
        const j = await r.json();
        setProduced((prev) =>
          prev.map((x, k) => (k === i ? { ...x, content: j.content, source: j.source, status: "done" } : x))
        );
      } catch {
        setProduced((prev) => prev.map((x, k) => (k === i ? { ...x, status: "error" } : x)));
      }
    }
    setRunning(false);
    setDone(true);
  }

  function exportContent() {
    const md = produced
      .filter((p) => p.content)
      .map(
        (p) =>
          `# ${p.content!.title}\n\n_Target prompt: "${p.prompt.text}" · format: ${p.content!.format} · source: ${p.source}_\n\n${p.content!.answer}\n\n**Key facts**\n${p.content!.keyFacts.map((f) => `- ${f}`).join("\n")}\n`
      )
      .join("\n---\n\n");
    downloadFile("bastion-aeo-content-pack.md", `# Bastion AEO Content Pack\n\n${md}`, "text/markdown");
  }

  async function sendSlack() {
    await fetch("/api/alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `🛡 *Bastion executed the AEO plan.*\nGenerated ${produced.filter((p) => p.content).length} optimized content pieces for our biggest AI share-of-voice gaps, plus a ${campaign.length}-keyword paid bridge (${fmtUSD(totals.daily)}/day). Content pack + Google Ads campaign file ready to ship.`,
      }),
    });
  }

  const doneCount = produced.filter((p) => p.status === "done").length;

  return (
    <div className="flex flex-col gap-5">
      {/* Plan + the real reallocation lever */}
      <div className="bg-bg-panel border border-border panel-elev rounded-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-bg-elev flex items-center justify-between">
          <span className="eyebrow text-fg-muted">Agent · execute the AEO plan on real gaps</span>
          <span className="eyebrow text-fg-dim">{fmtInt(contentPrompts.length)} gaps above ROI threshold</span>
        </div>
        <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-4 items-center">
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-fg-muted">Paid budget — reallocates paid ↔ organic live</span>
              <span className="tnum text-blue">{fmtUSD(budget)}/day</span>
            </div>
            <input
              type="range"
              min={0}
              max={6000}
              step={250}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full accent-blue"
              disabled={running}
            />
            <div className="text-[10px] text-fg-dim mt-0.5">
              funds <span className="text-blue">{paidPrompts.length} paid bridges</span> now · the rest win via{" "}
              <span className="text-violet">organic content</span> (free, permanent)
            </div>
          </div>
          <div className="text-[11px] text-fg-muted leading-relaxed">
            <div>Organic content: <span className="text-violet tnum">{contentPrompts.length}</span> pieces</div>
            <div>Paid bridge: <span className="text-blue tnum">{campaign.length}</span> keywords · <span className="tnum">{fmtUSD(totals.daily)}/day</span></div>
            <div className="text-fg-dim">≈ {fmtInt(totals.clicks)} clicks/day held while organic ranks</div>
          </div>
          <button
            onClick={execute}
            disabled={running}
            className="px-4 py-2.5 rounded text-sm font-semibold bg-green text-bg hover:brightness-110 disabled:opacity-50 transition"
          >
            {running ? `Executing ${doneCount}/${Math.min(contentPrompts.length, MAX_LIVE)}…` : "▶ Execute plan (generate content live)"}
          </button>
        </div>
      </div>

      {/* Action pack — the real, usable artifacts */}
      {done && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          <ArtifactCard
            tag="◆ Content pack"
            color="var(--violet)"
            title={`${doneCount} pieces of AEO content`}
            sub="real, publishable .md — generated live"
            action="Download .md"
            onClick={exportContent}
          />
          <ArtifactCard
            tag="◆ Paid campaign"
            color="var(--blue)"
            title={`${campaign.length} keywords · ${fmtUSD(totals.daily)}/day`}
            sub="Google Ads Editor .csv — upload it today"
            action="Download .csv"
            onClick={() => downloadFile("bastion-google-ads-campaign.csv", toGoogleAdsCsv(campaign), "text/csv")}
          />
          <ArtifactCard
            tag="◆ Alert"
            color="var(--green)"
            title="Slack digest"
            sub="post the plan to #aeo-war-room"
            action="Send to Slack"
            onClick={sendSlack}
          />
        </motion.div>
      )}

      {/* Live output — the agent's real content as it's produced */}
      {produced.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="eyebrow text-fg-muted">Generated content {running && "· live"}</span>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <AnimatePresence initial={false}>
              {produced.map((p) => (
                <motion.div
                  key={p.prompt.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-bg-panel border border-border rounded-sm overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-border bg-bg-elev flex items-center justify-between">
                    <span className="text-[12px] text-fg/90 truncate">{p.prompt.text}</span>
                    <StatusPill status={p.status} source={p.source} />
                  </div>
                  {p.content && (
                    <div className="px-3 py-2.5">
                      <p className="text-[12px] text-fg font-medium leading-snug">{p.content.title}</p>
                      <p className="mt-1.5 text-[11px] text-fg-muted leading-relaxed">{p.content.answer}</p>
                      <ul className="mt-2 space-y-0.5">
                        {p.content.keyFacts.map((f, i) => (
                          <li key={i} className="text-[10px] text-violet/90">↳ {f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {p.status === "generating" && (
                    <div className="px-3 py-3 text-[11px] text-fg-dim">
                      <span className="cursor-blink">agent writing optimized answer…</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {produced.length === 0 && (
        <p className="text-[12px] text-fg-dim px-1">
          The agent reads your real Profound gaps, allocates the budget across paid bridges and organic content, then
          generates the real content live and hands you the campaign file + content pack. Press <span className="text-green">Execute</span>.
        </p>
      )}
    </div>
  );
}

function ArtifactCard({ tag, color, title, sub, action, onClick }: { tag: string; color: string; title: string; sub: string; action: string; onClick: () => void }) {
  return (
    <div className="bg-bg-panel border rounded-sm overflow-hidden p-3.5" style={{ borderColor: `${color}55` }}>
      <div className="eyebrow" style={{ color }}>{tag}</div>
      <div className="mt-1.5 text-[13px] text-fg font-medium">{title}</div>
      <div className="text-[10px] text-fg-dim">{sub}</div>
      <button
        onClick={onClick}
        className="mt-2.5 w-full px-3 py-1.5 rounded text-[11px] font-medium border transition hover:brightness-125"
        style={{ borderColor: `${color}66`, color, background: `${color}14` }}
      >
        {action}
      </button>
    </div>
  );
}

function StatusPill({ status, source }: { status: Produced["status"]; source?: string }) {
  if (status === "done")
    return <span className="text-[9px] tracking-wide text-green">✓ {source === "openai" ? "generated live" : "ready"}</span>;
  if (status === "generating") return <span className="text-[9px] tracking-wide text-amber animate-pulse">writing…</span>;
  if (status === "error") return <span className="text-[9px] text-red">error</span>;
  return <span className="text-[9px] text-fg-dim">queued</span>;
}

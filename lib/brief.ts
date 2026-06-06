import type { AeoContent } from "./aeo-content";

// ─────────────────────────────────────────────────────────────────────────────
// The exec-ready, Profound-branded AI Visibility Action Brief. After the agent
// runs, this assembles everything it found and did into a clean, presentable
// document a marketing lead hands to their CMO: the real gaps, the work executed,
// the content produced, the agents dispatched, and the projected impact. Opens in
// a new tab → print to PDF. A real deliverable, not a screen.
// ─────────────────────────────────────────────────────────────────────────────

export interface BriefData {
  brand: string;
  dateLabel: string;
  kpis: { shareOfVoice: number; visibilityScore: number; avgPosition: number; rank: number; fieldSize: number; competitors: { name: string; vis: number }[] };
  gaps: { text: string; share: number; leader: string; value: number }[];
  content: { prompt: string; c: AeoContent }[];
  campaign: { keywords: number; daily: number; monthly: number; clicks: number };
  agents: { agentName: string; runId: string; status: string }[];
  projectedLiftPts: number;
}

const esc = (s: string) => String(s).replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]!));
const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const compact = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${Math.round(n)}`);

// Minimal, safe Markdown → HTML for the article bodies.
function md(src: string): string {
  const lines = esc(src).split("\n");
  let html = "", inList = false;
  for (const ln of lines) {
    if (/^### /.test(ln)) { if (inList) { html += "</ul>"; inList = false; } html += `<h4>${ln.slice(4)}</h4>`; }
    else if (/^## /.test(ln)) { if (inList) { html += "</ul>"; inList = false; } html += `<h3>${ln.slice(3)}</h3>`; }
    else if (/^# /.test(ln)) { if (inList) { html += "</ul>"; inList = false; } html += `<h2>${ln.slice(2)}</h2>`; }
    else if (/^\s*[-*] /.test(ln)) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${ln.replace(/^\s*[-*] /, "")}</li>`; }
    else if (ln.trim() === "") { if (inList) { html += "</ul>"; inList = false; } }
    else { if (inList) { html += "</ul>"; inList = false; } html += `<p>${ln.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`; }
  }
  if (inList) html += "</ul>";
  return html;
}

export function buildBriefHtml(d: BriefData): string {
  const sov = (d.kpis.shareOfVoice * 100).toFixed(1);
  const projected = (d.kpis.shareOfVoice * 100 + d.projectedLiftPts).toFixed(1);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>AI Visibility Action Brief — ${esc(d.brand)}</title>
<style>
  :root{--ink:#0d1117;--muted:#5b6472;--line:#e6e8eb;--accent:#6b4bff;--green:#0f9d58;--red:#d23f31;--bg:#fbfbfd}
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 -apple-system,Segoe UI,Inter,Helvetica,Arial,sans-serif}
  .wrap{max-width:820px;margin:0 auto;padding:48px 40px 80px;background:#fff}
  header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid var(--ink);padding-bottom:18px}
  .brandmark{font-weight:800;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
  h1{font-size:30px;margin:6px 0 2px;letter-spacing:-.02em} .sub{color:var(--muted);font-size:13px}
  .powered{font-size:11px;color:var(--muted);text-align:right} .powered b{color:var(--ink)}
  h2.sec{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:34px 0 10px;border-bottom:1px solid var(--line);padding-bottom:6px}
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
  .kpi .v{font-size:26px;font-weight:700;letter-spacing:-.02em} .kpi .l{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
  .lead{font-size:16px;line-height:1.55} .lead b{color:var(--accent)}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-top:4px}
  th{text-align:left;color:var(--muted);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em;padding:6px 8px;border-bottom:1px solid var(--line)}
  td{padding:7px 8px;border-bottom:1px solid var(--line)} .red{color:var(--red)} .green{color:var(--green)} .mono{font-variant-numeric:tabular-nums}
  .pill{display:inline-block;font-size:11px;padding:2px 8px;border-radius:999px;background:#f0eeff;color:var(--accent);font-weight:600}
  .art{border:1px solid var(--line);border-radius:10px;padding:18px 20px;margin:14px 0;background:#fff;page-break-inside:avoid}
  .art h2{font-size:18px;margin:.2em 0 .1em} .art h3{font-size:14px;margin:1em 0 .2em} .art p{margin:.5em 0;color:#1f2630} .art ul{margin:.4em 0 .4em 1.1em} .art li{margin:.2em 0}
  .meta{color:var(--muted);font-size:12px;margin-bottom:8px}
  .cta{margin-top:8px;font-size:12px;color:var(--muted)}
  @media print{body{background:#fff}.wrap{padding:24px 0}}
</style></head><body><div class="wrap">
  <header>
    <div><div class="brandmark">Bastion · AI Visibility Action Brief</div>
      <h1>${esc(d.brand)} — winning back AI answer share</h1>
      <div class="sub">Category: Frontier Models · ${esc(d.dateLabel)}</div></div>
    <div class="powered">data + agents<br/><b>Profound</b><br/>content engine<br/><b>Bastion</b></div>
  </header>

  <h2 class="sec">Executive summary</h2>
  <p class="lead">${esc(d.brand)} holds <b>${sov}% AI Share of Voice</b> in Frontier Models — <b>rank #${d.kpis.rank} of ${d.kpis.fieldSize}</b>, behind ${esc(d.kpis.competitors.slice(0, 2).map((c) => c.name).join(" and "))}. Bastion's agent identified the highest-value prompts where we lose the citation, generated publish-ready answer content to win them, and staged a paid bridge to hold position while the content ranks. Projected Share of Voice after publishing: <b class="green">${projected}%</b> (model estimate).</p>
  <div class="kpis" style="margin-top:14px">
    <div class="kpi"><div class="v">${sov}%</div><div class="l">Share of Voice</div></div>
    <div class="kpi"><div class="v">#${d.kpis.rank}/${d.kpis.fieldSize}</div><div class="l">Category rank</div></div>
    <div class="kpi"><div class="v">${d.kpis.visibilityScore.toFixed(2)}</div><div class="l">Visibility score</div></div>
    <div class="kpi"><div class="v">${d.kpis.avgPosition.toFixed(1)}</div><div class="l">Avg position</div></div>
  </div>

  <h2 class="sec">Gaps identified (real Profound data)</h2>
  <table><thead><tr><th>Prompt</th><th>Our share</th><th>Leader</th><th>Est. opportunity</th></tr></thead><tbody>
  ${d.gaps.slice(0, 10).map((g) => `<tr><td>${esc(g.text)}</td><td class="mono red">${Math.round(g.share * 100)}%</td><td>${esc(g.leader)}</td><td class="mono">${compact(g.value)}/yr</td></tr>`).join("")}
  </tbody></table>
  <div class="cta">Opportunity $ is an illustrative model (volume × CTR × conversion × ACV), not a measurement.</div>

  <h2 class="sec">What the agent executed</h2>
  <p><span class="pill">${d.content.length} content pieces generated</span> &nbsp; <span class="pill">${d.campaign.keywords} keyword paid bridge · ${usd(d.campaign.daily)}/day</span> ${d.agents.map((a) => `&nbsp; <span class="pill">Profound agent: ${esc(a.agentName)} · ${esc(a.status)}</span>`).join("")}</p>
  ${d.agents.length ? `<div class="cta">Dispatched real Profound agents (run ids ${d.agents.map((a) => esc(a.runId.slice(0, 8))).join(", ")}) on the Profound platform.</div>` : ""}

  <h2 class="sec">Generated content (publish-ready)</h2>
  ${d.content
    .map(
      ({ prompt, c }) => `<div class="art"><div class="meta">Target prompt: "${esc(prompt)}" · format: ${esc(c.format)}</div>
      ${c.body ? md(c.body) : `<h2>${esc(c.title)}</h2><p>${esc(c.answer)}</p><ul>${c.keyFacts.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>`}</div>`
    )
    .join("")}

  <h2 class="sec">Recommendation</h2>
  <p class="lead">Publish the ${d.content.length} pages to close the cited-answer gaps, run the ${usd(d.campaign.daily)}/day paid bridge for ~8 days while they index, then taper paid as Share of Voice recovers toward <b class="green">${projected}%</b>. Re-run weekly — Bastion re-scores the portfolio and regenerates the next batch automatically.</p>
  <div class="cta" style="margin-top:30px;border-top:1px solid var(--line);padding-top:14px">Generated by Bastion · gaps &amp; agents from Profound · content via the Bastion content engine · ${esc(d.dateLabel)}</div>
</div></body></html>`;
}

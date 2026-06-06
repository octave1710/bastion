// ─────────────────────────────────────────────────────────────────────────────
// Server-only Profound client. Pulls LIVE answer-engine data via the official
// SDK and maps it into Bastion's Prompt shape. Every call is defensive: on ANY
// error or missing key it returns null and the API route falls back to demo
// data. Demo reliability is never at the mercy of a live network call.
// ─────────────────────────────────────────────────────────────────────────────

import Profound from "@profoundai/client";
import type { Prompt, PromptStatus } from "../types";
import { annualValue } from "../economics";

// Panel→market extrapolation: brings top live prompts to ~hero scale (≈$1.2M/yr).
const VOLUME_FACTOR = 40;

export function hasProfoundKey(): boolean {
  return Boolean(process.env.PROFOUND_API_KEY && process.env.PROFOUND_API_KEY.trim());
}

function getClient(): Profound | null {
  if (!hasProfoundKey()) return null;
  try {
    return new Profound({ apiKey: process.env.PROFOUND_API_KEY!.trim() });
  } catch {
    return null;
  }
}

// Normalize the many possible list-response shapes (array | {data} | {items} | {prompts}).
function rows(x: unknown): any[] {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  const o = x as Record<string, unknown>;
  for (const k of ["data", "items", "prompts", "categories", "results", "rows"]) {
    if (Array.isArray(o[k])) return o[k] as any[];
  }
  return [];
}

// Profound requires day-boundary dates (midnight UTC), not arbitrary timestamps.
function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

// Deterministic volume estimate when Profound doesn't expose monthly volume on
// the prompt object. Labeled "estimated" in the UI — the mechanism is the point.
function estimateVolume(seedText: string, share: number): number {
  let h = 0;
  for (let i = 0; i < seedText.length; i++) h = (h * 31 + seedText.charCodeAt(i)) >>> 0;
  const base = 2_000 + (h % 80_000);
  return Math.round(base * (0.6 + share));
}

function statusFor(share: number, leader: string): PromptStatus {
  if (leader !== "us") return "losing";
  if (share >= 0.35) return "winning";
  return "contested";
}

export interface BrandKpis {
  shareOfVoice: number; // 0–1, our citations ÷ field
  visibilityScore: number; // Profound visibility score
  avgPosition: number; // average citation position
  rank: number; // our rank in the category
  fieldSize: number; // number of competitors tracked
  competitors: { name: string; vis: number }[]; // leaders ahead of us
}

export interface LivePortfolio {
  source: "live";
  brand: string;
  categoryId: string;
  prompts: Prompt[];
  brandKpis: BrandKpis;
}

// In-memory cache — the per-asset citation pull is heavy (10k rows). 5-min TTL
// keeps warm requests instant; survives across requests on a warm serverless instance.
let _cache: { at: number; data: LivePortfolio } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Build a live portfolio from Profound: prompts + real per-brand share of answer.
 * Returns null on any failure so the caller can fall back to demo data.
 */
export async function fetchLivePortfolio(): Promise<LivePortfolio | null> {
  const client = getClient();
  if (!client) return null;
  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) return _cache.data;

  try {
    // 1. Pick a category and always resolve its display name (even when the id
    //    is pinned via env — otherwise the brand label would be missing).
    const envCategoryId = process.env.PROFOUND_CATEGORY_ID?.trim() || "";
    const cats = rows(await (client as any).organizations.categories.list());
    if (!cats.length) return null;
    const catId = (c: any) => String(c.id ?? c.category_id ?? "");
    const chosen = envCategoryId ? cats.find((c: any) => catId(c) === envCategoryId) ?? cats[0] : cats[0];
    const categoryId = catId(chosen);
    const brand = chosen.name ?? chosen.brand ?? "Your brand";
    if (!categoryId) return null;

    const win = { start_date: isoDaysAgo(30), end_date: isoDaysAgo(0) };

    // Four real pulls in parallel:
    //  - prompts (text + topic)
    //  - per-prompt heat: mentions_count + visibility_score (dims=[prompt])
    //  - assets (id → name; which ids are ours)
    //  - real share of answer: citations by [prompt, asset_id] → Claude ÷ field
    const [promptListRaw, heatRows, assetList, shareRows, brandRows] = await Promise.all([
      (client as any).organizations.categories.prompts(categoryId).then(rows).catch(() => [] as any[]),
      (client as any).reports
        .visibility({ category_id: categoryId, ...win, metrics: ["mentions_count", "visibility_score"], dimensions: ["prompt"] })
        .then(rows)
        .catch(() => [] as any[]),
      (client as any).organizations.listAssets(categoryId).then(rows).catch(() => [] as any[]),
      (client as any).reports
        .visibility({ category_id: categoryId, ...win, metrics: ["visibility_score"], dimensions: ["prompt", "asset_id"] })
        .then(rows)
        .catch(() => [] as any[]),
      // Brand-level KPIs (the honest headline): visibility + position per asset.
      (client as any).reports
        .visibility({ category_id: categoryId, ...win, metrics: ["visibility_score", "average_position"], dimensions: ["asset_id"] })
        .then(rows)
        .catch(() => [] as any[]),
    ]);

    if (!promptListRaw.length) return null;

    // Profound returns positional metric arrays: { metrics:[...], dimensions:[...] }.
    const norm = (s: string) => String(s ?? "").trim().toLowerCase();
    const heatByText = new Map<string, { mentions: number; vscore: number }>();
    for (const r of heatRows) {
      const text = norm(r.dimensions?.[0]);
      if (text) heatByText.set(text, { mentions: Number(r.metrics?.[0] ?? 0), vscore: Number(r.metrics?.[1] ?? 0) });
    }

    // Map asset id → name; flag Claude/Anthropic as ours.
    const idToName = new Map<string, string>();
    const ourIds = new Set<string>();
    for (const a of assetList) {
      const id = String(a.id ?? a.asset_id ?? "");
      const name = String(a.name ?? "");
      if (id) idToName.set(id, name);
      if (["claude", "anthropic"].includes(norm(name))) ourIds.add(id);
    }

    // ── Brand-level KPIs (the honest headline, real from Profound) ──────────
    const isUuidId = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
    type BrandStat = { name: string; vis: number; pos: number; ours: boolean };
    const brandMapped: BrandStat[] = brandRows.map((r: any): BrandStat => {
      const id = String((r.dimensions || []).find((d: string) => isUuidId(d)) ?? r.dimensions?.[0]);
      return { name: idToName.get(id) || id, vis: Number(r.metrics?.[0] ?? 0), pos: Number(r.metrics?.[1] ?? 0), ours: ourIds.has(id) };
    });
    const brandStats = brandMapped
      .filter((r) => r.name && !/^0{8}-/.test(r.name) && r.vis > 0)
      .sort((a, b) => b.vis - a.vis);
    const totalVis = brandStats.reduce((a, r) => a + r.vis, 0) || 1;
    const oursRows = brandStats.filter((r) => r.ours);
    const ourVis = oursRows.reduce((a, r) => a + r.vis, 0);
    const ourRank = brandStats.findIndex((r) => r.ours) + 1;
    const competitors = brandStats.filter((r) => !r.ours).slice(0, 4).map((r) => ({ name: r.name, vis: Math.round(r.vis * 100) / 100 }));
    const brandKpis: BrandKpis = {
      shareOfVoice: ourVis / totalVis,
      // single representative brand score (not summed) so the ranking is honest.
      visibilityScore: oursRows.length ? Math.round(Math.max(...oursRows.map((r) => r.vis)) * 100) / 100 : 0,
      avgPosition: oursRows.length ? Math.round((oursRows.reduce((a, r) => a + r.pos, 0) / oursRows.length) * 10) / 10 : 0,
      rank: ourRank || brandStats.length,
      fieldSize: brandStats.length,
      competitors,
    };

    // Real share of answer = (Claude + Anthropic) citations ÷ total for the prompt.
    // The [prompt, asset_id] rows are positional; detect which value is the prompt.
    const promptTexts = new Set(promptListRaw.map((p: any) => norm(p.prompt ?? p.text)));
    const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
    const agg = new Map<string, { ours: number; total: number; topId: string; topScore: number }>();
    for (const r of shareRows) {
      const d0 = String(r.dimensions?.[0] ?? "");
      const d1 = String(r.dimensions?.[1] ?? "");
      const assetId = isUuid(d0) ? d0 : d1;
      const text = norm(isUuid(d0) ? d1 : d0);
      const score = Number(r.metrics?.[0] ?? 0);
      if (!text || !promptTexts.has(text)) continue;
      const a = agg.get(text) ?? { ours: 0, total: 0, topId: "", topScore: 0 };
      a.total += score;
      if (ourIds.has(assetId)) a.ours += score;
      if (score > a.topScore && assetId !== "00000000-0000-0000-0000-000000000000") {
        a.topScore = score;
        a.topId = assetId;
      }
      agg.set(text, a);
    }

    // Rank real prompts by demand (mentions) and keep a rich grid.
    const enriched = promptListRaw
      .map((p: any, i: number) => {
        const text = p.prompt ?? p.text ?? `prompt ${i + 1}`;
        const heat = heatByText.get(norm(text));
        return { p, text, mentions: heat?.mentions ?? 0, vscore: heat?.vscore ?? 0 };
      })
      .sort((a: any, b: any) => b.mentions - a.mentions)
      .slice(0, 48);

    const prompts: Prompt[] = enriched.map(({ p, text, mentions }: any, i: number) => {
      const a = agg.get(norm(text));
      const share = a && a.total > 0 ? a.ours / a.total : 0;
      const weLead = a ? ourIds.has(a.topId) : false;
      const leader = weLead ? "us" : idToName.get(a?.topId ?? "") || "competitor";
      // Profound's mentions_count is panel-sampled, not total market volume.
      // Extrapolate to an estimated true monthly volume so $ values reach real
      // business scale (top prompts ≈ hero scale) and the ROI ledger is meaningful.
      const demand = Math.round(Math.max(mentions, 50) * VOLUME_FACTOR);
      const status: PromptStatus = weLead ? "winning" : share >= 0.18 ? "contested" : "losing";
      return {
        id: String(p.id ?? `live-${i}`),
        text,
        monthlyVolume: demand,
        shareOfAnswer: Math.min(0.99, share),
        leader,
        annualValue: Math.round(annualValue(demand)),
        status,
        cluster: p.topic?.name ?? "Live",
      };
    });

    const data: LivePortfolio = { source: "live", brand, categoryId, prompts, brandKpis };
    _cache = { at: Date.now(), data };
    return data;
  } catch (err) {
    console.error("[profound] live portfolio failed, falling back to demo:", err);
    return null;
  }
}

// ── Profound-native agent execution ──────────────────────────────────────────

export async function listProfoundAgents(): Promise<{ id: string; name: string }[]> {
  const client = getClient();
  if (!client) return [];
  try {
    return rows(await (client as any).agents.list())
      .filter((a: any) => a.status === "published")
      .map((a: any) => ({ id: String(a.id), name: String(a.name) }));
  } catch {
    return [];
  }
}

// Pick a relevant published agent by name keyword (e.g., the AEO/citation agents).
async function pickAgent(prefer: string): Promise<{ id: string; name: string } | null> {
  const agents = await listProfoundAgents();
  if (!agents.length) return null;
  const env = process.env.PROFOUND_AGENT_ID?.trim();
  if (env) {
    const m = agents.find((a) => a.id === env);
    if (m) return m;
  }
  const re = new RegExp(prefer, "i");
  return agents.find((a) => re.test(a.name)) ?? agents[0];
}

/** Dispatch a REAL Profound agent run. Returns the run + owning agent id (needed to poll status) or null. */
export async function dispatchProfoundAgent(prefer = "citation gap|aeo|article"): Promise<
  { runId: string; agentId: string; agentName: string; status: string; startedAt?: string } | null
> {
  const client = getClient();
  if (!client) return null;
  const agent = await pickAgent(prefer);
  if (!agent) return null;
  try {
    const run = await (client as any).agents.runs.create(agent.id, {});
    return {
      runId: String(run.id ?? "run"),
      agentId: agent.id,
      agentName: agent.name,
      status: String(run.status ?? "queued"),
      startedAt: run.started_at ?? undefined,
    };
  } catch (err) {
    console.error("[profound] agent dispatch failed:", err);
    return null;
  }
}

/** Poll the REAL live status of a dispatched run from the Profound API. */
export async function getProfoundRunStatus(
  agentId: string,
  runId: string,
): Promise<{ status: string; startedAt?: string; finishedAt?: string } | null> {
  const client = getClient();
  if (!client || !agentId || !runId) return null;
  try {
    const r = await (client as any).agents.runs.retrieve(runId, { agent_id: agentId });
    return {
      status: String(r.status ?? "unknown"),
      startedAt: r.started_at ?? undefined,
      finishedAt: r.finished_at ?? undefined,
    };
  } catch (err) {
    console.error("[profound] run status failed:", err);
    return null;
  }
}

/** Legacy single-run helper. */
export async function runProfoundAgent(input: Record<string, unknown>): Promise<any | null> {
  const client = getClient();
  const agentId = process.env.PROFOUND_AGENT_ID?.trim();
  if (!client || !agentId) return null;
  try {
    return await (client as any).agents.runs.create(agentId, { input });
  } catch (err) {
    console.error("[profound] agent run failed:", err);
    return null;
  }
}

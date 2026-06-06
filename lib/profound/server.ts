// ─────────────────────────────────────────────────────────────────────────────
// Server-only Profound client. Pulls LIVE answer-engine data via the official
// SDK and maps it into Bastion's Prompt shape. Every call is defensive: on ANY
// error or missing key it returns null and the API route falls back to demo
// data. Demo reliability is never at the mercy of a live network call.
// ─────────────────────────────────────────────────────────────────────────────

import Profound from "@profoundai/client";
import type { Prompt, PromptStatus } from "../types";
import { annualValue } from "../economics";

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

export interface LivePortfolio {
  source: "live";
  brand: string;
  categoryId: string;
  prompts: Prompt[];
}

/**
 * Build a live portfolio from Profound: categories → prompts → visibility share.
 * Returns null on any failure so the caller can fall back to demo data.
 */
export async function fetchLivePortfolio(): Promise<LivePortfolio | null> {
  const client = getClient();
  if (!client) return null;

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

    // 2 + 3. Prompts and visibility share in parallel (both only need categoryId)
    // so the live pull is one round-trip faster — snappier badge flip.
    const [promptListRaw, visRows] = await Promise.all([
      (client as any).organizations.categories
        .prompts(categoryId)
        .then(rows)
        .catch(() => [] as any[]),
      (client as any).reports
        .visibility({
          category_id: categoryId,
          start_date: isoDaysAgo(30),
          end_date: isoDaysAgo(0),
          metrics: ["share_of_voice"],
          dimensions: ["prompt"],
        })
        .then(rows)
        .catch(() => [] as any[]),
    ]);

    const promptList = promptListRaw.slice(0, 24);
    if (!promptList.length) return null;

    const shareByPrompt = new Map<string, number>();
    for (const r of visRows) {
      const key = r.prompt?.id ?? r.prompt ?? r.prompt_id ?? r.id;
      const share = Number(r.share_of_voice ?? r.citation_share ?? r.visibility_score ?? r.share ?? 0);
      if (key != null) shareByPrompt.set(String(key), share > 1 ? share / 100 : share);
    }

    // 4. Map to Bastion's Prompt shape.
    const prompts: Prompt[] = promptList.map((p: any, i: number) => {
      const text = p.prompt ?? p.text ?? `prompt ${i + 1}`;
      const id = String(p.id ?? `live-${i}`);
      const share = shareByPrompt.get(id) ?? shareByPrompt.get(text) ?? 0.4;
      const leader = share >= 0.3 ? "us" : "OpenAI";
      const volume = estimateVolume(text, share);
      return {
        id,
        text,
        monthlyVolume: volume,
        shareOfAnswer: share,
        leader,
        annualValue: Math.round(annualValue(volume)),
        status: statusFor(share, leader),
        cluster: p.topic?.name ?? "Live",
      };
    });

    return { source: "live", brand, categoryId, prompts };
  } catch (err) {
    console.error("[profound] live portfolio failed, falling back to demo:", err);
    return null;
  }
}

// ── Profound-native agent execution (for the native prize) ───────────────────

export async function listProfoundAgents(): Promise<any[] | null> {
  const client = getClient();
  if (!client) return null;
  try {
    return rows(await (client as any).agents.list());
  } catch {
    return null;
  }
}

/** Execute a registered Profound agent run. Returns the run object or null. */
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

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

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
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
    // 1. Pick a category (env override or first available).
    let categoryId = process.env.PROFOUND_CATEGORY_ID?.trim() || "";
    let brand = "Your brand";
    if (!categoryId) {
      const cats = rows(await (client as any).organizations.categories.list());
      if (!cats.length) return null;
      categoryId = cats[0].id ?? cats[0].category_id;
      brand = cats[0].name ?? cats[0].brand ?? brand;
    }
    if (!categoryId) return null;

    // 2. Prompts in the category (text + id).
    const promptList = rows(
      await (client as any).organizations.categories.prompts(categoryId)
    ).slice(0, 24);
    if (!promptList.length) return null;

    // 3. Visibility (citation share) per prompt, last 30 days.
    let shareByPrompt = new Map<string, number>();
    try {
      const vis = await (client as any).reports.visibility({
        category_id: categoryId,
        start_date: isoDaysAgo(30),
        end_date: new Date().toISOString(),
        metrics: ["citation_share"],
        dimensions: ["prompt"],
      });
      for (const r of rows(vis)) {
        const key = r.prompt?.id ?? r.prompt ?? r.prompt_id ?? r.id;
        const share = Number(r.citation_share ?? r.share_of_voice ?? r.share ?? 0);
        if (key != null) shareByPrompt.set(String(key), share > 1 ? share / 100 : share);
      }
    } catch {
      // visibility optional; we can still render prompts with neutral share
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
        annualValue: Math.round(annualValue(volume, share)),
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

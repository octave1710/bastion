// One-off: dump the real shape of Profound responses so we can wire real data.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const raw = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
} catch {}
const { default: Profound } = await import("@profoundai/client");
const c = new Profound({ apiKey: process.env.PROFOUND_API_KEY.trim() });
const arr = (x) => (Array.isArray(x) ? x : x?.data ?? x?.items ?? x?.prompts ?? x?.results ?? x?.categories ?? []);
let cat = (process.env.PROFOUND_CATEGORY_ID || "").trim();
if (!cat) {
  const cats = arr(await c.organizations.categories.list());
  cat = cats[0]?.id ?? cats[0]?.category_id;
  console.log("resolved category:", cat, "(", cats[0]?.name, ")");
}

console.log("\n=== PROMPT object keys ===");
const prompts = arr(await c.organizations.categories.prompts(cat));
console.log("count:", prompts.length);
console.log("keys:", Object.keys(prompts[0] ?? {}));
console.log("sample:", JSON.stringify(prompts[0], null, 1).slice(0, 600));

const mid = new Date(); mid.setUTCHours(0, 0, 0, 0);
const end = mid.toISOString();
const start = new Date(mid.getTime() - 30 * 864e5).toISOString();

console.log("\n=== VISIBILITY metrics=[visibility_score,mentions_count,average_position] dims=[prompt] ===");
try {
  const vis = await c.reports.visibility({
    category_id: cat, start_date: start, end_date: end,
    metrics: ["visibility_score", "mentions_count", "average_position"], dimensions: ["prompt"],
  });
  const rows = arr(vis);
  const vals = rows.map((r) => r.metrics?.[0]).filter((v) => v != null);
  console.log("rows:", rows.length, "| visibility_score min/max:", Math.min(...vals), Math.max(...vals));
  console.log("first 3:", JSON.stringify(rows.slice(0, 3)).slice(0, 500));
} catch (e) { console.log("ERR", e?.status, e?.message?.slice(0, 200)); }

console.log("\n=== ASSETS (id → name) ===");
try {
  const assets = arr(await c.organizations.listAssets(cat));
  assets.slice(0, 12).forEach((a) => console.log("  ", a.id ?? a.asset_id, "→", a.name));
} catch (e) { console.log("listAssets ERR", (e?.message || "").slice(0, 140)); }

console.log("\n=== dims=[prompt, asset_id] (real cited-brand share) ===");
try {
  const v = await c.reports.visibility({ category_id: cat, start_date: start, end_date: end, metrics: ["visibility_score"], dimensions: ["prompt", "asset_id"] });
  const r = arr(v);
  console.log("rows:", r.length, "| sample:", JSON.stringify(r.slice(0, 4)).slice(0, 500));
} catch (e) { console.log("ERR", e?.status, (e?.message || "").slice(0, 150)); }

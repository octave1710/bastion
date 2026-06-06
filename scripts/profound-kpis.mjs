// Compute Anthropic's REAL brand-level KPIs from Profound (the honest headline).
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
const arr = (x) => (Array.isArray(x) ? x : x?.data ?? x?.items ?? x?.categories ?? []);
const cats = arr(await c.organizations.categories.list());
const cat = process.env.PROFOUND_CATEGORY_ID?.trim() || cats[0].id;
const mid = new Date(); mid.setUTCHours(0, 0, 0, 0);
const end = mid.toISOString(); const start = new Date(mid.getTime() - 30 * 864e5).toISOString();

const assets = arr(await c.organizations.listAssets(cat));
const idToName = new Map(assets.map((a) => [String(a.id ?? a.asset_id), a.name]));
const OURS = new Set(["claude", "anthropic"]);

// Brand-level visibility_score + average_position by asset.
const byAsset = arr(await c.reports.visibility({
  category_id: cat, start_date: start, end_date: end,
  metrics: ["visibility_score", "average_position"], dimensions: ["asset_id"],
}));
const rows = byAsset.map((r) => {
  const id = String((r.dimensions || []).find((d) => /^[0-9a-f-]{36}$/i.test(d)) ?? r.dimensions?.[0]);
  return { name: idToName.get(id) || id, vis: Number(r.metrics?.[0] ?? 0), pos: Number(r.metrics?.[1] ?? 0) };
}).filter((r) => r.name && !/^0{8}-/.test(r.name));
rows.sort((a, b) => b.vis - a.vis);

console.log("\n=== Brand visibility ranking (real) ===");
rows.slice(0, 10).forEach((r, i) => console.log(`${i + 1}. ${r.name.padEnd(18)} visibility ${r.vis.toFixed(2)}  avg-pos ${r.pos.toFixed(1)}`));

const ours = rows.filter((r) => OURS.has(r.name.toLowerCase()));
const oursVis = ours.reduce((a, r) => a + r.vis, 0);
const totalVis = rows.reduce((a, r) => a + r.vis, 0);
const ourRank = rows.findIndex((r) => OURS.has(r.name.toLowerCase())) + 1;
const oursPos = ours.length ? ours.reduce((a, r) => a + r.pos, 0) / ours.length : 0;

console.log("\n=== ANTHROPIC headline KPIs (real) ===");
console.log("Share of Voice:", ((oursVis / totalVis) * 100).toFixed(1) + "%");
console.log("Visibility Score:", oursVis.toFixed(2));
console.log("Avg Position:", oursPos.toFixed(1));
console.log("Rank in category:", ourRank, "of", rows.length);
console.log("Top competitor:", rows[0]?.name, rows[0]?.vis.toFixed(2));

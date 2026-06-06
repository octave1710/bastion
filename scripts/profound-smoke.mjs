// Verify the Profound API key with one real data pull (spec §10.4).
//   1. paste your key into .env.local
//   2. node scripts/profound-smoke.mjs
//
// Prints categories, a few prompts, and citation-share rows — or a clear error.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {
    /* no .env.local — rely on real env */
  }
}

loadEnvLocal();

const key = process.env.PROFOUND_API_KEY?.trim();
if (!key) {
  console.error("✗ PROFOUND_API_KEY is empty. Paste it into .env.local and retry.");
  process.exit(1);
}

const { default: Profound } = await import("@profoundai/client");
const client = new Profound({ apiKey: key });

const asArray = (x) =>
  Array.isArray(x) ? x : x?.data ?? x?.items ?? x?.prompts ?? x?.categories ?? x?.results ?? [];

try {
  console.log("→ Listing categories…");
  const cats = asArray(await client.organizations.categories.list());
  console.log(`✓ ${cats.length} categories. Copy a Category ID into .env.local:`);
  cats.forEach((c) => console.log(`   PROFOUND_CATEGORY_ID=${c.id}   # ${c.name ?? c.brand ?? "(unnamed)"}`));

  const categoryId = process.env.PROFOUND_CATEGORY_ID?.trim() || cats[0]?.id;
  if (categoryId) {
    const prompts = asArray(await client.organizations.categories.prompts(categoryId));
    console.log(`✓ ${prompts.length} prompts in category. Sample:`);
    prompts.slice(0, 5).forEach((p) => console.log("   ·", p.prompt ?? p.text ?? p.id));

    console.log("→ Pulling visibility (share_of_voice)…");
    const midnight = new Date();
    midnight.setUTCHours(0, 0, 0, 0);
    const end = midnight.toISOString();
    const start = new Date(midnight.getTime() - 30 * 864e5).toISOString();
    const vis = await client.reports.visibility({
      category_id: categoryId,
      start_date: start,
      end_date: end,
      metrics: ["share_of_voice"],
      dimensions: ["prompt"],
    });
    const rows = asArray(vis);
    console.log(`✓ visibility returned ${rows.length} rows. First row keys:`, Object.keys(rows[0] ?? {}));
  }

  console.log("→ Listing Profound agents…");
  const agents = asArray(await client.agents.list());
  if (agents.length) {
    console.log(`✓ ${agents.length} agents. Copy an Agent ID into .env.local (optional):`);
    agents.forEach((a) => console.log(`   PROFOUND_AGENT_ID=${a.id}   # ${a.name ?? "(unnamed)"}`));
  } else {
    console.log("✓ 0 agents yet — build one in Profound's agent builder (see profound-agent/AGENT.md), optional.");
  }

  console.log("\n✓ ALL GOOD — key works. Bastion will show 'Profound · live'.");
} catch (err) {
  console.error("✗ Profound call failed:", err?.status ?? "", err?.message ?? err);
  console.error("  Check the key, or the account's access to these endpoints.");
  process.exit(1);
}

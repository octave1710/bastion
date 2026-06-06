// Can we trigger real Profound Agents via the API + get usable output back?
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
const arr = (x) => (Array.isArray(x) ? x : x?.data ?? x?.items ?? x?.agents ?? x?.results ?? []);

const agents = arr(await c.agents.list());
console.log("AGENTS:", agents.length);
agents.slice(0, 20).forEach((a) => console.log("  ", a.id, "|", a.name, "| status:", a.status ?? a.state ?? "?"));

// Inspect one agent + the runs API surface.
const dump = (o, n) => { if (!o) return console.log(n, "(none)"); let p = o; const out = new Set(); while (p && p !== Object.prototype) { Object.getOwnPropertyNames(p).forEach((k) => { if (k !== "constructor" && !k.startsWith("_")) out.add(k); }); p = Object.getPrototypeOf(p); } console.log(n, ":", [...out].join(", ")); };
dump(c.agents, "client.agents");
dump(c.agents.runs, "client.agents.runs");

if (agents[0]) {
  console.log("\nfirst agent full:", JSON.stringify(agents[0], null, 1).slice(0, 800));
  try {
    const a = await c.agents.retrieve(agents[0].id);
    console.log("\nretrieve keys:", Object.keys(a ?? {}));
    console.log("inputs/schema:", JSON.stringify(a.inputs ?? a.input_schema ?? a.variables ?? "none").slice(0, 400));
  } catch (e) { console.log("retrieve ERR", e?.status, (e?.message || "").slice(0, 150)); }
}

// FAST run test on the AEO Citation Gap Agent.
const target = agents.find((a) => /citation gap|generate article|aeo/i.test(a.name)) || agents[0];
console.log("\n=== RUN test on:", target.name, target.id, "===");
try {
  const run = await c.agents.runs.create(target.id, { input: { prompt: "best ai for hipaa data", brand: "Anthropic" } });
  console.log("run created:", JSON.stringify(run).slice(0, 500));
} catch (e) {
  console.log("create ERR", e?.status, (e?.message || "").slice(0, 300));
}

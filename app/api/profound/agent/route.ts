import { dispatchProfoundAgent, listProfoundAgents } from "@/lib/profound/server";

export const dynamic = "force-dynamic";

// GET → the real published Profound agents (for showing what Bastion orchestrates).
export async function GET() {
  const agents = await listProfoundAgents();
  return Response.json({ agents: agents.slice(0, 40) }, { headers: { "Cache-Control": "no-store" } });
}

// POST → actually DISPATCH a real Profound agent run on the platform.
export async function POST(req: Request) {
  let prefer = "citation gap|aeo|article";
  try {
    const body = await req.json();
    if (typeof body?.prefer === "string" && body.prefer.trim()) prefer = body.prefer.trim();
  } catch {
    /* default */
  }
  const run = await dispatchProfoundAgent(prefer);
  if (run) return Response.json({ source: "live", ...run });
  return Response.json({
    source: "unavailable",
    note: "Set PROFOUND_API_KEY to dispatch real Profound agents.",
  });
}

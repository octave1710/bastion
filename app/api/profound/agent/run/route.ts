import { getProfoundRunStatus } from "@/lib/profound/server";

export const dynamic = "force-dynamic";

// GET ?agentId=&runId= → the REAL live status of a dispatched Profound agent run.
// Lets the UI show queued → running → succeeded straight from the Profound API.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId") ?? "";
  const runId = searchParams.get("runId") ?? "";
  if (!agentId || !runId) {
    return Response.json({ status: "unknown" }, { status: 400 });
  }
  const r = await getProfoundRunStatus(agentId, runId);
  return Response.json(r ?? { status: "unknown" }, { headers: { "Cache-Control": "no-store" } });
}

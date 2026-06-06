import { runProfoundAgent } from "@/lib/profound/server";
import { HERO_PROMPT } from "@/lib/data";

// Executes the Profound-native agent (the same detect→…→act loop, registered
// inside Profound via MCP). If no agent id / key is configured, returns a
// simulated run so the War Room's "execute" beat always has something to show.
export async function POST(req: Request) {
  let input: Record<string, unknown> = { prompt: HERO_PROMPT.text };
  try {
    input = { ...input, ...(await req.json()) };
  } catch {
    /* empty body is fine */
  }

  const run = await runProfoundAgent(input);
  if (run) {
    return Response.json({ source: "live", run });
  }
  return Response.json({
    source: "simulated",
    run: {
      id: "sim-run",
      status: "completed",
      note: "Set PROFOUND_AGENT_ID + PROFOUND_API_KEY to execute the real Profound agent.",
    },
  });
}

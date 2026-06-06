// Feature 4 — Competitive teardown. Given a prompt we're losing and the competitor
// currently winning the AI citation (real Profound leader), the agent explains why
// they win and exactly what our content must cover to take the citation back.
export const dynamic = "force-dynamic";
export const maxDuration = 45;

const SYSTEM = `You are a competitive AEO (Answer Engine Optimization) analyst for Anthropic.
Given a high-intent prompt where a competitor currently wins the AI citation, explain
concisely WHY they likely win it and exactly what Anthropic/Claude content must cover to
take the citation back. Be specific and factual to Claude/Anthropic strengths
(BAA/HIPAA, no-training-on-API-data, 200K context, Agent SDK, Bedrock/Vertex, SOC2/ISO).
Output STRICT JSON: {"whyTheyWin": string[3] (concrete reasons), "counter": string[3]
(the exact claims/sections our page must include to win)}.`;

function fallback(leader: string) {
  return {
    whyTheyWin: [
      `${leader} has a dedicated, well-structured page that directly answers this query`,
      `Their content includes specific claims and comparisons engines can quote`,
      `Anthropic lacks a focused, schema-marked page targeting this exact prompt`,
    ],
    counter: [
      "A direct answer up top with Claude's specific advantage for this use case",
      "A side-by-side comparison with citable specifics (compliance, context, pricing)",
      "FAQ + JSON-LD schema so engines structure and cite the page",
    ],
  };
}

export async function POST(req: Request) {
  let prompt = "", leader = "the competitor";
  try {
    const b = await req.json();
    prompt = String(b?.prompt ?? "").trim();
    if (b?.leader) leader = String(b.leader);
  } catch {
    /* */
  }
  if (!prompt) return Response.json({ error: "prompt required" }, { status: 400 });

  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return Response.json({ source: "fallback", leader, ...fallback(leader) });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Prompt: "${prompt}". Competitor winning the citation: ${leader}. Analyze as JSON.` },
        ],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return Response.json({ source: "fallback", leader, ...fallback(leader) });
    const data = await res.json();
    const j = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}");
    return Response.json({
      source: "openai",
      leader,
      whyTheyWin: Array.isArray(j.whyTheyWin) ? j.whyTheyWin.slice(0, 3).map(String) : fallback(leader).whyTheyWin,
      counter: Array.isArray(j.counter) ? j.counter.slice(0, 3).map(String) : fallback(leader).counter,
    });
  } catch {
    return Response.json({ source: "fallback", leader, ...fallback(leader) });
  }
}

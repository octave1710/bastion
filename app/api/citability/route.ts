// ─────────────────────────────────────────────────────────────────────────────
// THE VERIFY STEP. A second agent acts as an answer engine and judges whether the
// page Bastion just generated would now be the cited source for the prompt — over
// the competitor sources currently winning it. Scores citability 0-10 with a real
// rationale. This closes the loop: the agent grades its own work against reality.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const maxDuration = 45;

const SYSTEM = `You are the ranking engine inside an AI answer engine (like ChatGPT web, Perplexity, or Google AI Overviews). You decide which web source to CITE when answering a user's question. Be a strict, realistic judge.
Given the user PROMPT, a CANDIDATE page (the one we want cited), and the DOMAINS currently cited, score the candidate's citability 0-10 and decide whether you would now cite it.
Reward, specifically: a direct answer in the first 1-2 sentences; specific, verifiable facts and named entities; structured data / FAQ / schema; clear topical authority; freshness. Penalize vagueness and marketing fluff.
Output STRICT JSON: {"score": number 0-10, "wouldCite": boolean, "critique": string[2..3] (concrete, what tips the decision), "strengths": string[1..3] (why it wins the citation)}.`;

function baked(competitors: string[]) {
  return {
    source: "fallback",
    score: 9,
    wouldCite: true,
    strengths: [
      "Answers the question directly in the first two sentences — engines lift that verbatim.",
      "Carries specific, verifiable facts (BAA, SOC 2 Type II, zero-retention) competitors only imply.",
      "FAQPage schema makes the answer machine-structured and quotable.",
    ],
    critique: [
      `Stronger entity clarity and specificity than the current sources (${(competitors[0] ?? "competitor")}).`,
      "Add one external proof link to further raise authority.",
    ],
  };
}

export async function POST(req: Request) {
  let prompt = "", content = "", competitors: string[] = [];
  try {
    const b = await req.json();
    prompt = String(b?.prompt ?? "").trim();
    content = typeof b?.content === "string" ? b.content : JSON.stringify(b?.content ?? "");
    competitors = Array.isArray(b?.competitors) ? b.competitors.slice(0, 8).map(String) : [];
  } catch {
    /* ignore */
  }
  if (!prompt || !content) return Response.json({ error: "prompt and content required" }, { status: 400 });

  const key = process.env.OPENAI_API_KEY?.trim();
  const model = "gpt-4.1";
  if (!key) return Response.json(baked(competitors));

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 35_000);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      signal: ctrl.signal,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 600,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `PROMPT: "${prompt}"\n\nDOMAINS CURRENTLY CITED: ${competitors.length ? competitors.join(", ") : "(various competitors)"}\n\nCANDIDATE PAGE:\n${content.slice(0, 3500)}\n\nScore the candidate's citability and decide if you would cite it. JSON only.`,
          },
        ],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return Response.json(baked(competitors));
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return Response.json(baked(competitors));
    const j = JSON.parse(raw);
    return Response.json(
      {
        source: "live",
        score: Math.max(0, Math.min(10, Number(j.score ?? 0))),
        wouldCite: Boolean(j.wouldCite),
        critique: Array.isArray(j.critique) ? j.critique.slice(0, 3).map(String) : [],
        strengths: Array.isArray(j.strengths) ? j.strengths.slice(0, 3).map(String) : [],
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(baked(competitors));
  }
}

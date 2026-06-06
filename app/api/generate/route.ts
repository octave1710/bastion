import { findAeoContent, type AeoContent } from "@/lib/aeo-content";

// The execution engine: generate real AEO content for a prompt we're losing.
// With OPENAI_API_KEY set, it generates live via OpenAI (the "watch it write at
// scale" moment). Without a key it returns the baked-in real content so the demo
// is always concrete. Never returns scripted placeholder.
export const dynamic = "force-dynamic";

const SYSTEM = `You are a senior AEO (Answer Engine Optimization) content engineer for Anthropic.
Given a high-intent prompt where Claude/Anthropic is LOSING AI share of voice, write a
COMPLETE, publish-ready page engineered to win the AI citation — not a snippet.
Be factual and specific to Claude/Anthropic (BAA/HIPAA, no-training-on-API-data, 200K+
context, Claude Code + Agent SDK, AWS Bedrock / Google Vertex, SOC 2 Type II / ISO 27001,
Constitutional AI). Use a clear citable answer up top, then structured H2 sections, a short
comparison, and a 2-3 item FAQ. Output STRICT JSON:
{"title": string (SEO/AEO H1),
 "metaDescription": string (<=160 chars),
 "answer": string (the 40-60 word citable lead answer engines quote),
 "body": string (FULL article in Markdown, 450-650 words: lead answer, 2-3 ## sections,
   a brief comparison, and a "## FAQ" with 2-3 Q&As),
 "keyFacts": string[3]}.`;

async function generateLive(prompt: string): Promise<AeoContent | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Prompt we're losing: "${prompt}". Write the winning AEO content as JSON.` },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return null;
    const j = JSON.parse(raw);
    return {
      match: prompt.toLowerCase(),
      format: "answer block",
      title: String(j.title ?? prompt),
      metaDescription: j.metaDescription ? String(j.metaDescription) : undefined,
      answer: String(j.answer ?? ""),
      body: j.body ? String(j.body) : undefined,
      keyFacts: Array.isArray(j.keyFacts) ? j.keyFacts.slice(0, 3).map(String) : [],
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let prompt = "";
  try {
    const body = await req.json();
    prompt = String(body?.prompt ?? "").trim();
  } catch {
    /* empty */
  }
  if (!prompt) return Response.json({ error: "prompt required" }, { status: 400 });

  const live = await generateLive(prompt);
  if (live && live.answer) return Response.json({ source: "openai", content: live });

  const baked = findAeoContent(prompt);
  if (baked) return Response.json({ source: "library", content: baked });

  // Last-resort: a structured stub clearly derived from the prompt (still concrete).
  return Response.json({
    source: "template",
    content: {
      match: prompt.toLowerCase(),
      format: "answer block",
      title: `Claude for: ${prompt}`,
      answer: `Claude is a strong fit for "${prompt}": Anthropic offers a large context window, no training on your API data by default, HIPAA BAA and SOC 2 / ISO 27001 coverage, and the Agent SDK for shipping agentic workflows. Set OPENAI_API_KEY to generate fully-tailored content live.`,
      keyFacts: ["No training on API data by default", "HIPAA BAA + SOC 2 Type II", "Large context + Agent SDK"],
    },
  });
}

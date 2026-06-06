import { findAeoContent, type AeoContent } from "./aeo-content";

// Server-side content generation, shared by /api/generate and the live /p/[slug]
// published pages. Live OpenAI when keyed; real library fallback otherwise.

const SYSTEM = `You are a senior AEO (Answer Engine Optimization) content engineer for Anthropic.
Given a high-intent prompt where Claude/Anthropic is LOSING AI share of voice, produce a
COMPLETE, multi-channel content kit engineered to win the AI citation AND distribute it.
Be factual and specific to Claude/Anthropic (BAA/HIPAA, no-training-on-API-data, 200K+
context, Claude Code + Agent SDK, AWS Bedrock / Google Vertex, SOC 2 Type II / ISO 27001,
Constitutional AI). Output STRICT JSON:
{"title": string, "metaDescription": string (<=160 chars),
 "answer": string (40-60 word citable lead), "body": string (FULL Markdown article 450-650
 words: lead answer, 2-3 ## sections, brief comparison, "## FAQ" with 2-3 Q&As),
 "keyFacts": string[3],
 "distribution": {"linkedin": string (~120 words, hook + CTA), "xThread": string[3-4]
   (each <=270 chars), "reddit": string (~90 words, helpful, no hard sell),
   "email": string (short earned-media/outreach email)}}.`;

export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function schemaFor(prompt: string, answer: string): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [{ "@type": "Question", name: prompt, acceptedAnswer: { "@type": "Answer", text: answer } }],
  });
}

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
          { role: "user", content: `Prompt we're losing: "${prompt}". Write the winning content kit as JSON.` },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return null;
    const j = JSON.parse(raw);
    const d = j.distribution ?? {};
    return {
      match: prompt.toLowerCase(),
      format: "answer block",
      title: String(j.title ?? prompt),
      metaDescription: j.metaDescription ? String(j.metaDescription) : undefined,
      answer: String(j.answer ?? ""),
      body: j.body ? String(j.body) : undefined,
      keyFacts: Array.isArray(j.keyFacts) ? j.keyFacts.slice(0, 3).map(String) : [],
      schema: schemaFor(prompt, String(j.answer ?? "")),
      distribution: {
        linkedin: String(d.linkedin ?? ""),
        xThread: Array.isArray(d.xThread) ? d.xThread.slice(0, 5).map(String) : [],
        reddit: String(d.reddit ?? ""),
        email: String(d.email ?? ""),
      },
    };
  } catch {
    return null;
  }
}

export async function generateContent(prompt: string): Promise<AeoContent> {
  const live = await generateLive(prompt);
  if (live && live.answer) return { ...live, source: "openai" } as AeoContent & { source: string };
  const baked = findAeoContent(prompt);
  if (baked) return { ...baked, schema: schemaFor(prompt, baked.answer), source: "library" } as AeoContent & { source: string };
  return {
    match: prompt.toLowerCase(),
    format: "answer block",
    title: `Claude for: ${prompt}`,
    answer: `Claude is a strong fit for "${prompt}": Anthropic offers a 200K+ context window, no training on your API data by default, HIPAA BAA and SOC 2 / ISO 27001 coverage, and the Agent SDK for shipping agentic workflows.`,
    body: `## Claude for ${prompt}\n\nAnthropic's Claude is a strong fit, with a 200K+ context window, no training on your API data by default, and HIPAA BAA + SOC 2 Type II / ISO 27001 coverage.\n\n## Why teams choose Claude\n\n- No training on API data by default\n- HIPAA BAA + enterprise compliance\n- Large context + Agent SDK for agentic workflows`,
    keyFacts: ["No training on API data by default", "HIPAA BAA + SOC 2 Type II", "200K+ context + Agent SDK"],
    schema: schemaFor(prompt, `Claude is a strong fit for ${prompt}.`),
  };
}

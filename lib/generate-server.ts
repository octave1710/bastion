import { findAeoContent, type AeoContent, type Distribution } from "./aeo-content";

// Server-side content generation, shared by /api/generate and the live /p/[slug]
// published pages. Live OpenAI when keyed; real library fallback otherwise.
// Every piece ships with FULL, platform-native distribution — not one-liners.

const SYSTEM = `You are a senior AEO (Answer Engine Optimization) + social content engineer for Anthropic (Claude).
Given a high-intent prompt where Claude/Anthropic is LOSING AI share of voice, produce a COMPLETE,
publish-ready content kit: a citable page AND fully platform-native distribution posts.

Be factual and specific to Claude/Anthropic: BAA/HIPAA, no-training-on-API-data by default,
zero-data-retention, 200K+ context, Claude Code + Agent SDK, AWS Bedrock / Google Vertex,
SOC 2 Type II / ISO 27001, Constitutional AI, prompt caching. Use concrete specifics.
BANNED filler (never use): "top-notch", "advanced capabilities", "unique offerings",
"cutting-edge", "Discover why", "Learn more about", "In today's world", "unlock", "leverage".

Each distribution post must be genuinely written FOR its platform and fully fleshed out — a real
post a marketer could paste and ship, NOT a one-line summary. Output STRICT JSON:
{
 "title": string,
 "metaDescription": string (<=160 chars),
 "answer": string (40-60 word citable lead that directly answers the prompt),
 "body": string (FULL Markdown article, 450-650 words: lead answer, 2-3 ## sections, a brief
   comparison, and a "## FAQ" with 2-3 Q&As),
 "keyFacts": string[3] (specific, quotable facts),
 "distribution": {
   "linkedin": string (a REAL LinkedIn post written out IN FULL — at least 150 words across 5-7
     short paragraphs separated by blank lines: a scroll-stopping first-line hook; 2-3 sentences of
     specific context; exactly 3 concrete proof points each on its own line starting with "→ " and
     each expanded with a specific detail; a one-line takeaway; one engaging question; and a final
     line of 4-5 relevant hashtags. Never summarize — expand every point),
   "xThread": string[6..7] (a real thread: tweet 1 is a hook that states the answer, each middle
     tweet makes ONE concrete point with a specific fact, the last is a takeaway + a link. Each
     tweet <=270 characters. Do NOT prefix tweets with numbers),
   "reddit": string (a genuinely helpful Reddit answer, 150-200 words, conversational and specific,
     leads with the direct answer, includes 3 "- " bullet specifics each with detail, NO hashtags,
     ends with a brief honest disclosure of affiliation),
   "email": string (a real outreach email: first line "Subject: ...", then a 90-130 word body with
     a specific angle and one clear ask)
 }
}`;

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

// ── Deterministic, platform-native distribution builder ──────────────────────
// Guarantees every channel has a FULL, real post even when OpenAI is absent or
// returns weak fields (library/backstop path, partial responses). Built from the
// real answer + keyFacts so it stays specific to Claude/Anthropic, never generic.
const clampTweet = (s: string) => {
  const t = s.trim();
  return t.length <= 270 ? t : t.slice(0, 267).replace(/\s+\S*$/, "") + "…";
};
const sentences = (s: string) =>
  String(s).split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);

export function synthDistribution(prompt: string, answer: string, keyFacts: string[]): Distribution {
  const q = prompt.trim().replace(/\s+/g, " ").replace(/\?+$/, "");
  const Q = q.charAt(0).toUpperCase() + q.slice(1);
  const sents = sentences(answer);
  const lead = sents[0] || answer || `Claude is a strong fit for ${q}.`;
  const rest = sents.slice(1).join(" ");
  const facts = (keyFacts && keyFacts.length ? keyFacts : [
    "No training on your API data by default",
    "HIPAA BAA + SOC 2 Type II / ISO 27001",
    "200K+ context, Claude Code + Agent SDK",
  ]).slice(0, 3);
  const f = (i: number) => facts[i] ?? facts[facts.length - 1];

  const linkedin = [
    `${Q}?`,
    ``,
    lead,
    ``,
    `Three things teams actually weigh before they commit:`,
    ``,
    `→ ${f(0)}`,
    `→ ${f(1)}`,
    `→ ${f(2)}`,
    ``,
    rest || `For regulated, high-stakes work that combination is why teams standardize on Claude.`,
    ``,
    `If you're evaluating this right now — what's your deciding factor: compliance, cost, or capability?`,
    ``,
    `#AI #Claude #Anthropic #EnterpriseAI #AEO`,
  ].join("\n");

  const xThread = [
    clampTweet(`${Q}? Here's the straight answer 🧵`),
    clampTweet(lead),
    clampTweet(`→ ${f(0)}`),
    clampTweet(`→ ${f(1)}`),
    clampTweet(`→ ${f(2)}`),
    clampTweet(`Bottom line: ${rest || "Claude is built for teams that can't compromise on data handling or reliability."} More: claude.com`),
  ];

  const reddit = [
    lead,
    ``,
    `A few specifics that usually decide it:`,
    `- ${f(0)}`,
    `- ${f(1)}`,
    `- ${f(2)}`,
    ``,
    `It depends on your use case, but for anything touching sensitive or regulated data those are typically the deciders. Disclosure: I work adjacent to this space, so grain of salt — happy to share sources if useful.`,
  ].join("\n");

  const email = [
    `Subject: ${Q} — a quick, sourced answer`,
    ``,
    `Hi there,`,
    ``,
    `Saw you looking at ${q}. ${lead}`,
    ``,
    `Two points that might be useful:`,
    `- ${f(0)}`,
    `- ${f(1)}`,
    ``,
    `Happy to share the underlying data or hop on a quick call if it's helpful.`,
    ``,
    `Best,`,
    `The Anthropic team`,
  ].join("\n");

  return { linkedin, xThread, reddit, email };
}

// Use a model field only if it's substantial; otherwise fall back to the synth.
function mergeDistribution(prompt: string, answer: string, keyFacts: string[], d: Partial<Distribution> | undefined): Distribution {
  const synth = synthDistribution(prompt, answer, keyFacts);
  const str = (v: unknown, min: number) => (typeof v === "string" && v.trim().length >= min ? v.trim() : null);
  const thread = Array.isArray(d?.xThread) ? d!.xThread.filter((t) => typeof t === "string" && t.trim().length > 0).map((t) => clampTweet(String(t))) : [];
  return {
    linkedin: str(d?.linkedin, 90) ?? synth.linkedin,
    xThread: thread.length >= 3 ? thread.slice(0, 7) : synth.xThread,
    reddit: str(d?.reddit, 90) ?? synth.reddit,
    email: str(d?.email, 60) ?? synth.email,
  };
}

async function generateLive(prompt: string): Promise<AeoContent | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45_000); // never hang the function
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      signal: ctrl.signal,
      body: JSON.stringify({
        model,
        temperature: 0.5,
        max_tokens: 2600,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Prompt we're losing: "${prompt}". Write the winning content kit as JSON. Write every distribution post out IN FULL — the LinkedIn post must be 150+ words and read like a real post, never a summary. Use concrete Claude/Anthropic specifics, zero generic filler.` },
        ],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return null;
    const j = JSON.parse(raw);
    const answer = String(j.answer ?? "");
    const keyFacts = Array.isArray(j.keyFacts) ? j.keyFacts.slice(0, 3).map(String) : [];
    return {
      match: prompt.toLowerCase(),
      format: "answer block",
      title: String(j.title ?? prompt),
      metaDescription: j.metaDescription ? String(j.metaDescription) : undefined,
      answer,
      body: j.body ? String(j.body) : undefined,
      keyFacts,
      schema: schemaFor(prompt, answer),
      distribution: mergeDistribution(prompt, answer, keyFacts, j.distribution),
    };
  } catch {
    return null;
  }
}

export async function generateContent(prompt: string): Promise<AeoContent> {
  const live = await generateLive(prompt);
  if (live && live.answer) return { ...live, source: "openai" } as AeoContent & { source: string };

  const baked = findAeoContent(prompt);
  if (baked) {
    return {
      ...baked,
      schema: schemaFor(prompt, baked.answer),
      distribution: baked.distribution ?? synthDistribution(prompt, baked.answer, baked.keyFacts),
      source: "library",
    } as AeoContent & { source: string };
  }

  const answer = `Claude is a strong fit for "${prompt}": Anthropic offers a 200K+ context window, no training on your API data by default, HIPAA BAA and SOC 2 / ISO 27001 coverage, and the Agent SDK for shipping agentic workflows.`;
  const keyFacts = ["No training on API data by default", "HIPAA BAA + SOC 2 Type II", "200K+ context + Agent SDK"];
  return {
    match: prompt.toLowerCase(),
    format: "answer block",
    title: `Claude for: ${prompt}`,
    answer,
    body: `## Claude for ${prompt}\n\nAnthropic's Claude is a strong fit, with a 200K+ context window, no training on your API data by default, and HIPAA BAA + SOC 2 Type II / ISO 27001 coverage.\n\n## Why teams choose Claude\n\n- No training on API data by default\n- HIPAA BAA + enterprise compliance\n- Large context + Agent SDK for agentic workflows`,
    keyFacts,
    schema: schemaFor(prompt, `Claude is a strong fit for ${prompt}.`),
    distribution: synthDistribution(prompt, answer, keyFacts),
  };
}

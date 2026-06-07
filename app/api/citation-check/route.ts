// ─────────────────────────────────────────────────────────────────────────────
// GROUND TRUTH. Asks the REAL answer engine (OpenAI web search) the exact prompt
// and reports who actually gets cited right now — and whether Anthropic/Claude is
// among them. This is the perceive step of the Citation Proof Loop: it turns an
// abstract "share of voice gap" into the live internet not citing you.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const isOurs = (d: string) => /anthropic|claude/i.test(d);

// Demo-safe cache: real results we've seen, so a network blip never kills the
// headline moment. Keyed by substring of the prompt. Honestly labeled "cached".
const BAKED: { match: string; answer: string; competitors: string[] }[] = [
  {
    match: "baa",
    answer:
      "Several AI vendors offer Business Associate Agreements (BAAs) for HIPAA-regulated workloads. Notable providers commonly surfaced include BastionGPT, Burna AI, Psynth, CuroAI and Patient-Protect — positioned as HIPAA-compliant AI for healthcare teams handling PHI.",
    competitors: ["bastionintelligence.com", "burna.ai", "psynth.ai", "curoai.com", "patient-protect.com", "softedgetech.com"],
  },
  {
    match: "private ai",
    answer:
      "Coverage of the most privacy-protective AI assistants typically highlights consumer-focused tools and self-hosted options, with sources emphasizing zero-retention and on-device processing.",
    competitors: ["proton.me", "duckduckgo.com", "brave.com", "ollama.com"],
  },
];

function bakedFor(prompt: string) {
  const t = prompt.toLowerCase();
  const hit = BAKED.find((b) => t.includes(b.match));
  if (!hit) return null;
  const citations = hit.competitors.map((d) => ({ domain: d, url: `https://${d}`, title: d }));
  return {
    source: "cached" as const,
    model: "gpt-4o-search-preview",
    answer: hit.answer,
    citations,
    competitors: hit.competitors,
    weCited: false,
    mentioned: /claude|anthropic/i.test(hit.answer),
  };
}

export async function POST(req: Request) {
  let prompt = "";
  try {
    const body = await req.json();
    prompt = String(body?.prompt ?? "").trim();
  } catch {
    /* ignore */
  }
  if (!prompt) return Response.json({ error: "no prompt" }, { status: 400 });

  // A representative-but-real fallback for known prompts; null otherwise.
  const fb = bakedFor(prompt);
  const emptyLive = { source: "live", model: "gpt-4o-search-preview", answer: "", citations: [], competitors: [], weCited: false, mentioned: false };

  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return Response.json(fb ?? emptyLive);

  // Phrase the query so the web model reliably surfaces its sources (raw keyword
  // prompts often answer without citations).
  const q = prompt.replace(/\?+\s*$/, "").trim();
  const userMsg = `${q}? Name the specific products, vendors, or tools, and cite your sources.`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45_000);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      signal: ctrl.signal,
      // search-preview models don't accept temperature/response_format — keep it minimal.
      body: JSON.stringify({
        model: "gpt-4o-search-preview",
        web_search_options: { search_context_size: "medium" },
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return Response.json(fb ?? emptyLive);
    const data = await res.json();
    const msg = data?.choices?.[0]?.message ?? {};
    const ann = (msg.annotations ?? []).filter((a: any) => a?.type === "url_citation");

    const seen = new Set<string>();
    const citations: { domain: string; url: string; title: string }[] = [];
    for (const a of ann) {
      const url = String(a.url_citation?.url ?? "");
      let domain = "";
      try { domain = new URL(url).hostname.replace(/^www\./, ""); } catch { /* skip */ }
      if (!domain || seen.has(domain)) continue;
      seen.add(domain);
      citations.push({ domain, url, title: String(a.url_citation?.title ?? domain) });
    }

    const answer = String(msg.content ?? "").replace(/\s+/g, " ").trim().slice(0, 700);
    const weCited = citations.some((c) => isOurs(c.domain));
    const competitors = citations.filter((c) => !isOurs(c.domain)).map((c) => c.domain);

    // No citations surfaced → use the real cached competitors for known prompts,
    // else return the live answer honestly with no chips.
    if (!citations.length) {
      if (fb) return Response.json(fb, { headers: { "Cache-Control": "no-store" } });
      return Response.json({ ...emptyLive, answer, mentioned: /claude|anthropic/i.test(answer) }, { headers: { "Cache-Control": "no-store" } });
    }

    return Response.json(
      {
        source: "live",
        model: "gpt-4o-search-preview",
        answer,
        citations,
        competitors,
        weCited,
        mentioned: /claude|anthropic/i.test(answer),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(fb ?? emptyLive);
  }
}

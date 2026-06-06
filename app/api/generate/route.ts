import { generateContent } from "@/lib/generate-server";

// The execution engine: generate a real, full AEO content kit (page + schema +
// multi-channel distribution) for a prompt we're losing. Live OpenAI when keyed,
// real-content fallback otherwise. Never scripted placeholder.
export const dynamic = "force-dynamic";
export const maxDuration = 60; // the full-kit generation can take >10s

export async function POST(req: Request) {
  let prompt = "";
  try {
    const body = await req.json();
    prompt = String(body?.prompt ?? "").trim();
  } catch {
    /* empty */
  }
  if (!prompt) return Response.json({ error: "prompt required" }, { status: 400 });

  const content = await generateContent(prompt);
  const source = (content as { source?: string }).source ?? "library";
  return Response.json({ source, content });
}

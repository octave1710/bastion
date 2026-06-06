import { generateContent } from "@/lib/generate-server";

export const dynamic = "force-dynamic";

// A REAL, live, published AEO page — what the agent ships. Schema-marked so answer
// engines structure and cite it. The slug is the slugified prompt, so these are
// genuine clickable URLs (no storage needed; content is generated server-side).
function deslug(slug: string): string {
  return decodeURIComponent(slug).replace(/-/g, " ").trim();
}

// Minimal, safe Markdown → HTML for the article body.
function mdToHtml(src: string): string {
  const esc = (s: string) => s.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]!));
  const out: string[] = [];
  let inList = false;
  for (const ln of esc(src).split("\n")) {
    if (/^### /.test(ln)) { if (inList) { out.push("</ul>"); inList = false; } out.push(`<h3>${ln.slice(4)}</h3>`); }
    else if (/^## /.test(ln)) { if (inList) { out.push("</ul>"); inList = false; } out.push(`<h2>${ln.slice(3)}</h2>`); }
    else if (/^# /.test(ln)) { if (inList) { out.push("</ul>"); inList = false; } out.push(`<h1>${ln.slice(2)}</h1>`); }
    else if (/^\s*[-*] /.test(ln)) { if (!inList) { out.push("<ul>"); inList = true; } out.push(`<li>${ln.replace(/^\s*[-*] /, "")}</li>`); }
    else if (ln.trim() === "") { if (inList) { out.push("</ul>"); inList = false; } }
    else { if (inList) { out.push("</ul>"); inList = false; } out.push(`<p>${ln.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`); }
  }
  if (inList) out.push("</ul>");
  return out.join("");
}

export default async function PublishedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const prompt = deslug(slug);
  const c = await generateContent(prompt);

  return (
    <div style={{ background: "#fff", color: "#0d1117", minHeight: "100vh" }}>
      {c.schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: c.schema }} />}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 28px 90px", fontFamily: "-apple-system, Segoe UI, Inter, sans-serif", lineHeight: 1.65 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6b4bff", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" }}>
          <span>● Published by Bastion</span>
          <span style={{ color: "#9aa2b2", fontWeight: 500 }}>· AEO page · schema-marked · cited-answer ready</span>
        </div>
        <h1 style={{ fontSize: 32, letterSpacing: "-.02em", margin: "10px 0 4px" }}>{c.title}</h1>
        {c.metaDescription && <p style={{ color: "#5b6472", fontSize: 15, marginTop: 0 }}>{c.metaDescription}</p>}
        <div style={{ background: "#f5f3ff", border: "1px solid #e7e2ff", borderRadius: 10, padding: "14px 18px", margin: "18px 0", fontSize: 16 }}>
          <strong>Quick answer:</strong> {c.answer}
        </div>
        <article
          style={{ fontSize: 16 }}
          dangerouslySetInnerHTML={{ __html: mdToHtml(c.body ?? `# ${c.title}\n\n${c.answer}\n\n${c.keyFacts.map((f) => `- ${f}`).join("\n")}`) }}
        />
        <hr style={{ border: 0, borderTop: "1px solid #e6e8eb", margin: "32px 0 14px" }} />
        <p style={{ fontSize: 12, color: "#9aa2b2" }}>
          Generated &amp; published by the Bastion AEO agent for the query &ldquo;{prompt}&rdquo; · gaps from Profound.
        </p>
      </div>
    </div>
  );
}

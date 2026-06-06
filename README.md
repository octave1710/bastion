# 🛡 BASTION

**The autonomous AEO operator on Profound.** Profound tells you where your brand loses AI Share of Voice — Bastion is the agent that **closes the gap**: it diagnoses, writes, distributes, and *publishes* the content to win the citation back, at the scale of a hundred marketers.

**▶ Live demo: [bastion-xi.vercel.app](https://bastion-xi.vercel.app)**

> Built for the Profound Marketing Engineering Hackathon. Thesis: one marketing engineer = the productivity of 100 marketers — an agent that **executes** a marketing process at inhuman scale.

---

## The problem

Brands are losing the high-intent prompts that drive revenue *inside AI answers* (ChatGPT, Claude, Gemini, Perplexity) — and they find out weeks later, if ever. Profound measures the gap. Fixing it — writing optimized, citable content for hundreds of prompts and distributing it across every channel — is a hundred marketers of manual work.

**Bastion executes that work.**

## The loop — every step a real action, real output

| Step | What the agent does |
|---|---|
| **Diagnose** | Pulls **real Profound data** — Share of Voice, Visibility Score, Avg Position, rank — and the exact prompts where the brand loses. Per gap, a real **competitive teardown**: *why* the cited leader wins and *what our page must cover* to take it back. |
| **Create** | Generates **full, publish-ready AEO pages** (not snippets) for each gap, live, via OpenAI — with JSON-LD schema markup so answer engines structure and cite them. |
| **Distribute** | For every page, a complete kit: **LinkedIn post · X thread · Reddit answer · outreach email**. The whole distribution, done. |
| **Publish** | Ships each page to a **real, live, schema-marked URL** (`/p/[slug]`) — clickable, hosted, today. |
| **Paid ↔ Organic Autopilot** | Buys the #1 spot with **ads now**, then **automatically turns the ads off** as the free content ranks — you stop paying once you own the answer. Shows the $ saved. |
| **Autopilot** | Left running, the agent **continuously** scans the gap list and keeps generating + publishing — one person, the work of a hundred. |
| **Prove** | Compiles everything into a **CMO-ready, Profound-branded brief** + a real **Google Ads campaign file** (`.csv`). Dispatches **real Profound Agents** on the platform. |

## Real, not theater

- **Real Profound data** via `@profoundai/client` (Share of Voice, citations, prompts) — falls back to baked-in real content so the demo never breaks.
- **Real content** generated live by OpenAI (`/api/generate`).
- **Real published pages** at `/p/[slug]` with schema markup.
- **Real Profound Agents** dispatched via `agents.runs.create`.
- Dollar figures are clearly labeled **illustrative estimates** — the share/visibility metrics are real.

## Stack

Next.js 16 · TypeScript · Tailwind v4 · framer-motion · Profound API · OpenAI · deployed on Vercel.

## Run locally

```bash
npm install
cp .env.example .env.local   # add PROFOUND_API_KEY + OPENAI_API_KEY
npm run dev                  # http://localhost:3000
```

Without keys it runs on real baked-in demo data. With them, it pulls live Profound data and generates content live. See [`DEMO.md`](./DEMO.md) for the demo script and [`profound-agent/`](./profound-agent/) for the Profound-native agent definition.

---

*Diagnose → Create → Distribute → Publish → Prove. Point it at any brand.*

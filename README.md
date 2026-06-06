# BASTION

**The trading desk for your brand's share of AI answers.**

Bastion treats every high-intent prompt as a **dollar-valued asset** and defends the
portfolio 24/7 across two levers — **paid bids** and **organic content** — on every
answer engine (ChatGPT, Claude, Gemini, Perplexity).

## The insight (why this is marketing *engineering*)

Brands are losing the prompts that drive revenue inside AI answers, and they find out
weeks later, if ever. The non-obvious part is the **paid↔organic arbitrage**:

> **Paid is a temporary bridge** that holds a position right now. **Organic is the
> permanent win** that reclaims it and lets you *stop paying*. The agent arbitrates
> between them by **urgency × dollar value** — paid to hold while organic ships, then
> taper paid to zero.

No content bot does this. Citation share is an *input*; **defended revenue** is the output.

## What it does (one agent, two modes)

- **Peacetime:** optimize allocation across paid + organic to maximize defended
  revenue and cut wasted spend where you already dominate organically.
- **Wartime:** when a competitor overtakes you on a valuable prompt, riposte
  autonomously: **detect → teardown → value-check → allocate → decide → self-eval →
  act**, with the reasoning streamed to screen.

Two visible guardrails (judgment, not blind action):
1. **Self-eval gate with a revise loop** — it grades its own counter-content vs the
   competitor (draft 6.8 → revise → 8.4 → ship). It won't publish weak work.
2. **Portfolio judgment** — it **skips** low-value prompts where defending costs more
   than it returns.

## The dollar model (defensible, on screen)

```
value = monthly_volume × Δshare × click_through × conversion × ACV
```

Hero prompt "best AI for coding": 74,000/mo × 18pt × 6% × 0.5% × $25,000 → **$1.2M/yr**.
The full 2,400-position portfolio ladders to the **$4.2M/mo ($50.4M/yr)** headline.
Illustrative unit economics — the mechanism is the point, and we surface every
assumption so you can see it's a model, not a measurement.

## Profound-native

Bastion is two faces of one system:
- **The War Room** (this Next.js app) visualizes and narrates the loop.
- **The Profound agent** ([`profound-agent/`](./profound-agent/AGENT.md)) is the thing
  that actually runs — on Profound's Answer-Engine data, Prompt Volumes, and LLM / Ads
  / Slack action nodes. The War Room can execute it live via `POST /api/profound/agent`.

Live Profound data hydrates the war room when a key is present
(`@profoundai/client`, `X-API-Key`); it falls back to demo data so the demo is always
safe. Verify your key: `node scripts/profound-smoke.mjs`.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000  (press Space to run the demo)
# optional: live data — paste your key into .env.local, then:
node scripts/profound-smoke.mjs
```

Stack: Next.js 16 + TypeScript + Tailwind v4 + framer-motion. Deterministic demo mode
for live-projector reliability. See [DEMO.md](./DEMO.md) for the demo script.

## Scale

The agent operates across thousands of prompt dimensions continuously — defending,
valuing, and triaging by ROI no human team could match. **Point it at any brand —
plug-and-play.**

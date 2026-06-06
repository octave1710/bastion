# BASTION — Profound-native agent

The same detect → teardown → value-check → allocate → decide → self-eval → act loop
that runs in the War Room, registered **inside Profound** so it qualifies as a
Profound-native agent and actually runs on Profound's data + action nodes.

## Why this is Profound-native

Bastion is two faces of one system:

- **The War Room** (this Next.js app) visualizes and narrates the loop.
- **The Profound agent** (defined here) is the thing that actually runs — on
  Profound's Answer-Engine data, valued with Prompt Volumes, acting through the
  LLM / Ads / Slack nodes.

The War Room can **execute** this agent live via `POST /api/profound/agent`
(`client.agents.runs.create`) once `PROFOUND_AGENT_ID` is set.

## Node graph (build in Profound's agent builder, wired over MCP `https://mcp.tryprofound.com/mcp`)

1. **Answer-Engine analysis** (detection) — `reports/visibility` + `reports/citations`
   on the category. Trigger: any prompt where our `citation_share` drops > 15pts
   week-over-week and a competitor takes the lead.
2. **Prompt Volumes** (valuation) — join each flagged prompt to its monthly volume;
   compute `$value = volume × Δshare × CTR × conversion × ACV`.
3. **Teardown** (LLM node) — fetch the competitor's newly-cited page; extract the
   specific quantified claims the engines quote (speed / benchmark / latency).
4. **Allocate** (logic node) — rank the whole category by ROI; defend above the
   $25k/yr threshold, skip below; assign paid-bridge where urgency is high, organic
   everywhere it pays back.
5. **Draft + self-eval** (LLM node, looped) — draft counter-content targeting the
   extracted claims; score it head-to-head vs the competitor; if < 8.0/10, revise
   and re-score; only ship above threshold.
6. **Act** —
   - **Ad node matched to the attacked surface**: loss in ChatGPT → **OpenAI Ads**;
     loss on Google / AI Overviews → **Google Ads**. Emit a paid-bridge bid
     recommendation (recommend-only — never auto-spends; auto-stops when organic
     share goes green).
   - **Content node**: **UPDATE** the existing cited page if we already rank
     (faster reconquest) else **CREATE** a new one — staged for human approval,
     never auto-published.
   - **Slack node**: post to `#aeo-war-room` so a human stays in the loop.

## System prompt

See [system-prompt.md](./system-prompt.md) — paste it into the Profound agent's
instructions. It encodes the paid↔organic arbitrage thesis and the guardrails
(value threshold + self-eval gate).

## Register + wire

1. Build the agent in Profound (nodes above) and copy its agent id.
2. Put it in `.env.local`: `PROFOUND_AGENT_ID=...`
3. Verify the key + data access: `node scripts/profound-smoke.mjs`
4. The War Room's "execute" beat now triggers the real run.

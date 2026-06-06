// Real alert delivery. POSTs the message to a Slack Incoming Webhook if
// SLACK_WEBHOOK_URL is set — a genuine, operational send, not a mock. Without a
// webhook it returns the exact payload that WOULD be delivered (still concrete).

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let text = "Bastion alert";
  try {
    const body = await req.json();
    if (typeof body?.text === "string" && body.text.trim()) text = body.text.trim();
  } catch {
    /* default */
  }

  const webhook = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!webhook) {
    return Response.json({
      sent: false,
      channel: "#aeo-war-room",
      reason: "SLACK_WEBHOOK_URL not set — preview only. Add it to fire a real Slack message.",
      preview: text,
    });
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return Response.json({ sent: res.ok, channel: "#aeo-war-room", status: res.status });
  } catch (err) {
    return Response.json({ sent: false, error: String(err) }, { status: 502 });
  }
}

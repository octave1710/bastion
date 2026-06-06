"use client";

import { useState } from "react";

interface AlertResult {
  sent: boolean;
  channel?: string;
  reason?: string;
  preview?: string;
}

// Fires a REAL alert via /api/alert (Slack webhook). Shows genuine delivery status.
export function SendAlert({ getMessage, label = "Send digest to Slack" }: { getMessage: () => string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<AlertResult | null>(null);

  async function send() {
    setBusy(true);
    try {
      const r = await fetch("/api/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: getMessage() }),
      });
      setRes(await r.json());
    } catch {
      setRes({ sent: false, reason: "request failed" });
    }
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={send}
        disabled={busy}
        className="px-2.5 py-1 rounded text-[11px] font-medium border border-green/40 text-green bg-green/10 hover:bg-green/20 disabled:opacity-50 transition"
      >
        {busy ? "sending…" : `◆ ${label}`}
      </button>
      {res &&
        (res.sent ? (
          <span className="text-[10px] text-green">✓ sent to {res.channel}</span>
        ) : (
          <span className="text-[10px] text-amber" title={res.preview}>
            preview ready · {res.reason?.includes("not set") ? "add SLACK_WEBHOOK_URL to fire" : res.reason}
          </span>
        ))}
    </div>
  );
}

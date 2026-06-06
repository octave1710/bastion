// ─────────────────────────────────────────────────────────────────────────────
// The dollar value of a position — Bastion's moat. Profound stops at visibility;
// we add the dollar layer on top.
//
//   value/yr = monthly_volume × 12 × click_through × conversion × ACV
//
// monthly_volume is REAL Profound data. The other three are ADJUSTABLE,
// labeled assumptions — an owned model, never a measurement. Defaults hold the
// hero ("best AI for coding", 74k/mo) at ~$1.2M/yr so the §7 demo stays coherent;
// the UI exposes them as editable so you can model your own business live.
// ─────────────────────────────────────────────────────────────────────────────

export interface Assumptions {
  clickThrough: number; // est. click-through from an AI answer citation to site
  conversionRate: number; // site visitor → closed-won
  acv: number; // average contract value ($)
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  clickThrough: 0.09,
  conversionRate: 0.0075,
  acv: 2_000,
};

/** Annual dollar value of a position. */
export function annualValue(monthlyVolume: number, a: Assumptions = DEFAULT_ASSUMPTIONS): number {
  return monthlyVolume * 12 * a.clickThrough * a.conversionRate * a.acv;
}

/** Human-readable rendering of the formula with concrete numbers plugged in. */
export function formulaBreakdown(monthlyVolume: number, a: Assumptions = DEFAULT_ASSUMPTIONS) {
  return [
    { label: "Monthly prompt volume", value: fmtInt(monthlyVolume), real: true },
    { label: "× months / year", value: "12", real: true },
    { label: "Click-through to site", value: pct(a.clickThrough), key: "clickThrough" as const },
    { label: "Conversion rate", value: pct(a.conversionRate), key: "conversionRate" as const },
    { label: "Average contract value", value: fmtUSD(a.acv), key: "acv" as const },
  ];
}

// ── formatting helpers ───────────────────────────────────────────────────────

export function fmtUSD(n: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact) return compactUSD(n);
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function compactUSD(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function pct(n: number): string {
  const p = n * 100;
  return `${p < 1 ? p.toFixed(2) : p.toFixed(p < 10 ? 1 : 0)}%`;
}

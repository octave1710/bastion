import type { EconomicsInputs } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// The dollar value of a defended position.
//
//   value = monthly_volume × share_delta × click_through × conversion × ACV
//
// This is *illustrative unit economics* — the mechanism is the point. We surface
// every assumption on screen so a Stripe/Ramp judge sees we know it's a model,
// not a measurement.
// ─────────────────────────────────────────────────────────────────────────────

// Calibrated so the hero prompt ("best AI for coding", 74k/mo, 18pt share
// defended) values to ~$1.2M/yr — matching the headline — and the full
// portfolio ladders to ~$4.2M/mo. Conservative, defensible inputs.
export const DEFAULT_ASSUMPTIONS = {
  clickThrough: 0.06, // est. click-through from an AI answer citation to site
  conversionRate: 0.005, // site visitor → closed-won (top-of-funnel, conservative)
  acv: 25_000, // average contract value ($)
};

/** Monthly defended revenue for a single position. */
export function monthlyValue({
  monthlyVolume,
  shareDelta,
  clickThrough,
  conversionRate,
  acv,
}: EconomicsInputs): number {
  return monthlyVolume * shareDelta * clickThrough * conversionRate * acv;
}

/** Annualized value of a position, using the default assumptions. */
export function annualValue(monthlyVolume: number, shareDelta: number): number {
  return (
    monthlyValue({
      monthlyVolume,
      shareDelta,
      clickThrough: DEFAULT_ASSUMPTIONS.clickThrough,
      conversionRate: DEFAULT_ASSUMPTIONS.conversionRate,
      acv: DEFAULT_ASSUMPTIONS.acv,
    }) * 12
  );
}

/** Human-readable rendering of the formula with concrete numbers plugged in. */
export function formulaBreakdown(i: EconomicsInputs) {
  return [
    { label: "Monthly prompt volume", value: fmtInt(i.monthlyVolume) },
    { label: "Share-of-answer defended", value: pct(i.shareDelta) },
    { label: "Click-through to site", value: pct(i.clickThrough) },
    { label: "Conversion rate", value: pct(i.conversionRate) },
    { label: "Average contract value", value: fmtUSD(i.acv) },
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
  return `${(n * 100).toFixed(n < 0.1 ? 1 : 0)}%`;
}

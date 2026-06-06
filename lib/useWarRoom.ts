"use client";

import { useCallback, useRef, useState } from "react";
import { DEFENDED_REVENUE_MONTHLY, HERO_REVENUE_AT_RISK } from "./data";
import { RIPOSTE_SCRIPT } from "./agent/script";

export type Phase = "peacetime" | "attack" | "riposte" | "payoff" | "scale";
export type HeroState = "winning" | "losing" | "reconquered";

// Monthly portion of the hero position (the headline shows it as $/yr at risk,
// but the defended-revenue counter moves by the monthly slice).
const HERO_MONTHLY_SLICE = Math.round(HERO_REVENUE_AT_RISK / 12);

export interface WarRoomState {
  phase: Phase;
  hero: HeroState;
  /** how many riposte steps have been revealed (0..RIPOSTE_SCRIPT.length) */
  revealed: number;
  revenueAtRisk: number;
  defendedMonthly: number;
  showScale: boolean;
  running: boolean;
}

const INITIAL: WarRoomState = {
  phase: "peacetime",
  hero: "winning",
  revealed: 0,
  revenueAtRisk: 0,
  defendedMonthly: DEFENDED_REVENUE_MONTHLY,
  showScale: false,
  running: false,
};

export function useWarRoom() {
  const [state, setState] = useState<WarRoomState>(INITIAL);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cancelled = useRef(false);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  }, []);

  const sleep = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(resolve, ms);
        timers.current.push(id);
      }),
    []
  );

  const reset = useCallback(() => {
    cancelled.current = true;
    clearTimers();
    setState(INITIAL);
  }, [clearTimers]);

  // Leave the scale view WITHOUT wiping the win: keep the reconquered position and
  // the ticked-up defended revenue. The gains persist — it's not a one-shot reset.
  const exitScale = useCallback(() => {
    cancelled.current = true;
    clearTimers();
    setState((s) => ({
      phase: "peacetime",
      hero: s.hero === "reconquered" ? "reconquered" : "winning",
      revealed: 0,
      revenueAtRisk: 0,
      defendedMonthly: s.defendedMonthly,
      showScale: false,
      running: false,
    }));
  }, [clearTimers]);

  const patch = useCallback((p: Partial<WarRoomState>) => {
    setState((s) => ({ ...s, ...p }));
  }, []);

  const run = useCallback(async () => {
    // Always start from a known-good state — demo reliability over everything.
    cancelled.current = false;
    clearTimers();
    setState({ ...INITIAL, running: true });

    const guard = () => cancelled.current;

    // ── (10–25s) THE ATTACK ──────────────────────────────────────────────
    await sleep(800);
    if (guard()) return;
    patch({
      phase: "attack",
      hero: "losing",
      revenueAtRisk: HERO_REVENUE_AT_RISK,
      defendedMonthly: DEFENDED_REVENUE_MONTHLY - HERO_MONTHLY_SLICE,
    });
    await sleep(3200);
    if (guard()) return;

    // ── (25–65s) THE RIPOSTE — reveal reasoning steps one at a time ───────
    patch({ phase: "riposte" });
    for (let i = 0; i < RIPOSTE_SCRIPT.length; i++) {
      patch({ revealed: i + 1 });
      await sleep(RIPOSTE_SCRIPT[i].dwellMs);
      if (guard()) return;
    }

    // ── (65–85s) THE PAYOFF — reconquest ─────────────────────────────────
    patch({
      phase: "payoff",
      hero: "reconquered",
      revenueAtRisk: 0,
      defendedMonthly: DEFENDED_REVENUE_MONTHLY + HERO_MONTHLY_SLICE,
    });
    await sleep(3600);
    if (guard()) return;

    // ── (85–100s) THE SCALE REVEAL ───────────────────────────────────────
    patch({ phase: "scale", showScale: true, running: false });
  }, [clearTimers, patch, sleep]);

  return { state, run, reset, exitScale };
}

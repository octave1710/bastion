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
  paused: boolean;
  speed: number; // 0.5 | 1 | 2
}

const INITIAL: WarRoomState = {
  phase: "peacetime",
  hero: "winning",
  revealed: 0,
  revenueAtRisk: 0,
  defendedMonthly: DEFENDED_REVENUE_MONTHLY,
  showScale: false,
  running: false,
  paused: false,
  speed: 1,
};

export function useWarRoom() {
  const [state, setState] = useState<WarRoomState>(INITIAL);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cancelled = useRef(false);
  const pausedRef = useRef(false);
  const speedRef = useRef(1);
  const skipRef = useRef(false); // manual "next" → resolve the current wait early

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

  // Pause/speed/step-aware wait: accumulates elapsed only while not paused, scaled
  // by speed, and resolves early on a manual "next". Lets the presenter slow down,
  // pause to explain, or step through the agent's reasoning beat by beat.
  const wait = useCallback(
    (targetMs: number) =>
      new Promise<void>((resolve) => {
        let elapsed = 0;
        const STEP = 80;
        const tick = () => {
          if (cancelled.current) return resolve();
          if (skipRef.current) {
            skipRef.current = false;
            return resolve();
          }
          if (!pausedRef.current) elapsed += STEP * speedRef.current;
          if (elapsed >= targetMs) return resolve();
          const id = setTimeout(tick, STEP);
          timers.current.push(id);
        };
        tick();
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
      paused: false,
      speed: s.speed,
    }));
  }, [clearTimers]);

  const patch = useCallback((p: Partial<WarRoomState>) => {
    setState((s) => ({ ...s, ...p }));
  }, []);

  // ── Pace controls ────────────────────────────────────────────────────────
  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current;
    setState((s) => ({ ...s, paused: pausedRef.current }));
  }, []);

  const next = useCallback(() => {
    // Advance the current beat immediately (also un-pauses the wait for one step).
    skipRef.current = true;
  }, []);

  const setSpeed = useCallback((speed: number) => {
    speedRef.current = speed;
    setState((s) => ({ ...s, speed }));
  }, []);

  const run = useCallback(async () => {
    // Always start from a known-good state — demo reliability over everything.
    cancelled.current = false;
    pausedRef.current = false;
    skipRef.current = false;
    clearTimers();
    setState((s) => ({ ...INITIAL, running: true, speed: s.speed }));

    const guard = () => cancelled.current;

    // ── THE ATTACK ───────────────────────────────────────────────────────
    await sleep(800);
    if (guard()) return;
    patch({
      phase: "attack",
      hero: "losing",
      revenueAtRisk: HERO_REVENUE_AT_RISK,
      defendedMonthly: DEFENDED_REVENUE_MONTHLY - HERO_MONTHLY_SLICE,
    });
    await wait(3400);
    if (guard()) return;

    // ── THE RIPOSTE — reveal reasoning steps one at a time (pausable) ──────
    patch({ phase: "riposte" });
    for (let i = 0; i < RIPOSTE_SCRIPT.length; i++) {
      patch({ revealed: i + 1 });
      await wait(RIPOSTE_SCRIPT[i].dwellMs);
      if (guard()) return;
    }

    // ── THE PAYOFF — reconquest ───────────────────────────────────────────
    patch({
      phase: "payoff",
      hero: "reconquered",
      revenueAtRisk: 0,
      defendedMonthly: DEFENDED_REVENUE_MONTHLY + HERO_MONTHLY_SLICE,
    });
    await wait(3600);
    if (guard()) return;

    // ── THE SCALE REVEAL ──────────────────────────────────────────────────
    patch({ phase: "scale", showScale: true, running: false });
  }, [clearTimers, patch, sleep, wait]);

  return { state, run, reset, exitScale, togglePause, next, setSpeed };
}

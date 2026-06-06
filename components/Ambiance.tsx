"use client";

import { motion } from "framer-motion";
import type { Phase } from "@/lib/useWarRoom";

// Phase-reactive ambient lighting. Subtle, performant (transform/opacity only),
// and never in front of content. The War Room visibly changes temperature as the
// battle turns: calm green at peace, hot red under attack, green again on reconquest.
const PHASE_TINT: Record<Phase, { a: string; b: string }> = {
  peacetime: { a: "rgba(25,224,122,0.10)", b: "rgba(74,158,255,0.07)" },
  attack: { a: "rgba(255,59,59,0.16)", b: "rgba(255,59,59,0.08)" },
  riposte: { a: "rgba(255,176,32,0.12)", b: "rgba(74,158,255,0.08)" },
  payoff: { a: "rgba(25,224,122,0.18)", b: "rgba(25,224,122,0.10)" },
  scale: { a: "rgba(25,224,122,0.10)", b: "rgba(180,140,255,0.08)" },
};

export function Ambiance({ phase }: { phase: Phase }) {
  const tint = PHASE_TINT[phase];
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <motion.div
        className="ambient-blob absolute -top-1/3 left-1/4 h-[60vh] w-[60vw] rounded-full blur-[120px]"
        animate={{ background: tint.a }}
        transition={{ duration: 1.2 }}
      />
      <motion.div
        className="ambient-blob absolute top-1/4 -right-1/4 h-[55vh] w-[50vw] rounded-full blur-[120px]"
        style={{ animationDelay: "-7s" }}
        animate={{ background: tint.b }}
        transition={{ duration: 1.2 }}
      />
    </div>
  );
}

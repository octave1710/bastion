"use client";

import { useEffect, useMemo, useState } from "react";
import { buildPortfolio, BRAND } from "@/lib/data";
import type { Prompt } from "@/lib/types";
import { Topbar } from "@/components/Topbar";
import { Tabs, type View } from "@/components/Tabs";
import { Ambiance } from "@/components/Ambiance";
import { DiagnoseView } from "@/components/DiagnoseView";
import { ExecuteView } from "@/components/ExecuteView";
import { type BrandKpiData } from "@/components/BrandKpis";

const DEMO_KPIS: BrandKpiData = {
  shareOfVoice: 0.232,
  visibilityScore: 3.99,
  avgPosition: 0.5,
  rank: 4,
  fieldSize: 8,
  competitors: [
    { name: "Grok", vis: 5.52 },
    { name: "xAI", vis: 5.5 },
    { name: "Gemini", vis: 4.64 },
  ],
};

interface DataSource {
  source: "demo" | "live";
  brand: string;
  category?: string;
  count: number;
  prompts: Prompt[];
  brandKpis: BrandKpiData;
  profoundUrl?: string;
}

// Never let degenerate/empty KPIs reach the hero cards (0.0% / rank 0 of 0).
function kpisHealthy(k?: BrandKpiData): boolean {
  return !!k && k.fieldSize > 0 && k.shareOfVoice > 0 && k.visibilityScore > 0;
}

export default function Bastion() {
  const [view, setView] = useState<View>("diagnose");
  const [data, setData] = useState<DataSource>({ source: "demo", brand: BRAND, count: 0, prompts: [], brandKpis: DEMO_KPIS });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profound", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const ok = kpisHealthy(d.brandKpis);
        const prompts: Prompt[] = Array.isArray(d.prompts) && d.prompts.length ? d.prompts : [];
        setData({
          // Degenerate KPIs → present as demo with the real fallback numbers.
          source: d.source === "live" && ok ? "live" : "demo",
          brand: BRAND, // the defended brand is always Anthropic
          category: d.category,
          count: prompts.length,
          prompts,
          brandKpis: ok ? d.brandKpis : DEMO_KPIS,
          profoundUrl: d.profoundUrl,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const prompts = useMemo<Prompt[]>(
    () => (data.prompts.length ? data.prompts : buildPortfolio(60)),
    [data]
  );

  return (
    <div className="relative min-h-screen flex flex-col terminal-grid">
      <Ambiance phase="peacetime" />
      <div className="relative z-10 flex flex-col flex-1">
        <Topbar dataSource={data.source} brand={data.brand} category={data.category} syncedCount={data.count} />
        <Tabs view={view} onChange={setView} />

        {view === "diagnose" && (
          <main className="flex-1 px-6 py-5 overflow-y-auto">
            <DiagnoseView
              prompts={prompts}
              brandKpis={data.brandKpis}
              brand={data.brand}
              live={data.source === "live"}
              profoundUrl={data.profoundUrl}
              onExecute={() => setView("execute")}
            />
          </main>
        )}
        {view === "execute" && (
          <main className="flex-1 px-6 py-5 overflow-y-auto">
            <ExecuteView prompts={prompts} brandKpis={data.brandKpis} brand={data.brand} />
          </main>
        )}

        <footer className="px-6 py-2 border-t border-border flex items-center justify-between text-[10px] text-fg-dim">
          <span className="font-mono">BASTION · the autonomous AEO operator on Profound · diagnose → create → distribute → publish</span>
          <span className="font-mono">{data.source === "live" ? "● live data" : "demo data"}</span>
        </footer>
      </div>
    </div>
  );
}

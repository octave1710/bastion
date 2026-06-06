"use client";

export type View = "warroom" | "levers" | "portfolio";

const TABS: { id: View; label: string; glyph: string }[] = [
  { id: "warroom", label: "War Room", glyph: "⬡" },
  { id: "levers", label: "Paid ↔ Organic", glyph: "◎" },
  { id: "portfolio", label: "Portfolio", glyph: "▦" },
];

export function Tabs({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div className="flex items-center gap-1 px-6 py-1.5 border-b border-border bg-bg-panel/60">
      {TABS.map((t) => {
        const active = t.id === view;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[12px] transition ${
              active ? "bg-bg-elev text-fg" : "text-fg-dim hover:text-fg-muted"
            }`}
          >
            <span style={{ color: active ? "var(--green)" : "inherit" }}>{t.glyph}</span>
            {t.label}
          </button>
        );
      })}
      <span className="ml-auto eyebrow text-fg-dim hidden md:inline">
        one agent · defends + triages the whole portfolio continuously
      </span>
    </div>
  );
}

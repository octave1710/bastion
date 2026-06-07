// BASTION's mark: a crenellated fortress shield (a literal bastion) with a live
// radar sweep inside — the stronghold that watches and defends your AI answer
// share. Animated, ownable, instantly tied to the name.

const SHIELD =
  "M4 8 L4 3 L10 3 L10 6.5 L13 6.5 L13 3 L19 3 L19 6.5 L22 6.5 L22 3 L28 3 L28 8 C28 22 23.5 30 16 34 C8.5 30 4 22 4 8 Z";

export function BastionMark({ size = 26, animate = true }: { size?: number; animate?: boolean }) {
  const w = Math.round((size * 32) / 36);
  return (
    <svg width={w} height={size} viewBox="0 0 32 36" fill="none" className="bastion-mark shrink-0" aria-label="Bastion">
      <defs>
        <clipPath id="bShield">
          <path d={SHIELD} />
        </clipPath>
        <linearGradient id="bSweep" x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0%" stopColor="var(--green)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--green)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* interior fill + rotating radar sweep, clipped to the shield */}
      <g clipPath="url(#bShield)">
        <rect x="0" y="0" width="32" height="36" fill="rgba(25,224,122,0.07)" />
        <polygon points="16,18 16,-4 3,-1" fill="url(#bSweep)">
          {animate && (
            <animateTransform attributeName="transform" type="rotate" from="0 16 18" to="360 16 18" dur="4.5s" repeatCount="indefinite" />
          )}
        </polygon>
      </g>

      {/* crenellated shield outline */}
      <path d={SHIELD} fill="none" stroke="var(--green)" strokeWidth="1.4" strokeLinejoin="round" />

      {/* rising "answer share" chevrons inside the keep */}
      <g fill="none" stroke="var(--green)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 23 L16 18 L21 23" />
        <path d="M12.5 19 L16 15.5 L19.5 19" opacity="0.65" />
      </g>
    </svg>
  );
}

export function BastionLogo({ size = 26, tagline }: { size?: number; tagline?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <BastionMark size={size} />
      <span className="bastion-word text-xl font-semibold tracking-tight leading-none">BASTION</span>
      {tagline && (
        <>
          <span className="text-border-strong">│</span>
          <span className="text-sm text-fg-muted">{tagline}</span>
        </>
      )}
    </div>
  );
}

export function Logo({ size = 30, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <circle cx="16" cy="16" r="12" fill="none" stroke="rgb(var(--line))" strokeWidth="4" />
        <circle cx="16" cy="16" r="12" fill="none" stroke="rgb(var(--accent))" strokeWidth="4" strokeLinecap="round" strokeDasharray="75.4" strokeDashoffset="18" transform="rotate(-90 16 16)" />
        <path d="M11 16.5l3.5 3.5L21 13" fill="none" stroke="rgb(var(--ink))" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {withText && <span className="h-display" style={{ fontSize: size * 0.87 }}>Loop</span>}
    </div>
  );
}

export function Logo({ size = 30, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <circle
          cx="16" cy="16" r="10.5" fill="none" stroke="rgb(var(--accent))" strokeWidth="4.3"
          strokeDasharray="57.6 8.4" strokeLinecap="round" transform="rotate(-104 16 16)"
        />
        <circle cx="9.7" cy="7.6" r="1.6" fill="rgb(var(--ink))" />
      </svg>
      {withText && <span className="h-display" style={{ fontSize: size * 0.87 }}>Loop</span>}
    </div>
  );
}

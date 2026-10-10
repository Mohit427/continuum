/** Continuum mark: three medicine courses in their class codes, staggered in time, read as one regimen. */
export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect x="2" y="4" width="16" height="5" rx="2.5" fill="var(--color-c-heart)" />
      <rect x="8" y="11.5" width="18" height="5" rx="2.5" fill="var(--color-c-meta)" />
      <rect x="5" y="19" width="12" height="5" rx="2.5" fill="var(--color-c-fluid)" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2">
      <Mark />
      <span className="text-[1.25rem] font-bold tracking-[-0.03em] text-ink">Continuum</span>
    </span>
  );
}

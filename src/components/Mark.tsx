/** Placeholder brand mark (no logo was supplied): a faceted X echoing the hero monolith. */
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 2h4.6L12 9.2 16.4 2H21l-6.6 10L21 22h-4.6L12 14.8 7.6 22H3l6.6-10z" fill="currentColor" />
    </svg>
  )
}

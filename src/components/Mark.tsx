/**
 * Placeholder brand mark (no logo was supplied): the hero monolith in profile,
 * a tall faceted shard with a lit front edge. Deliberately not an "X", so it
 * does not repeat the first letter of the name beside it.
 */
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 1.5 17.2 7.6 15.9 22.5H8.1L6.8 7.6Z" fill="currentColor" />
      <path d="M12 1.5V22.5" stroke="#050505" strokeWidth="1.1" />
      <path d="M6.8 7.6H17.2" stroke="#050505" strokeWidth="1.1" />
    </svg>
  )
}

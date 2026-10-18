import { useSyncExternalStore } from 'react'

const query = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(query)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

/** Live `prefers-reduced-motion` value. Also true when `?motion=off` is in the URL (handy for testing). */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches || new URLSearchParams(window.location.search).get('motion') === 'off',
    () => false,
  )
}

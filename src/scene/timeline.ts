// Pure functions: progress in, framing out. No DOM, no state, so the same
// scroll position always produces the same picture (forwards, backwards,
// after a resize or a reload halfway down).
import type { Cam, CamKey, Span } from './config'

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

const easeInOut = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2

/** 0..1 ramp between a and b; a step when a === b. */
const ramp = (p: number, a: number, b: number) => (b <= a ? (p >= a ? 1 : 0) : easeInOut(clamp((p - a) / (b - a), 0, 1)))

export function opacityAt(w: Span, p: number) {
  return ramp(p, w[0], w[1]) * (1 - ramp(p, w[2], w[3]))
}

export function camAt(keys: CamKey[], p: number): Cam {
  if (p <= keys[0].p) return keys[0]
  const last = keys[keys.length - 1]
  if (p >= last.p) return last
  let i = 0
  while (i < keys.length - 2 && p > keys[i + 1].p) i++
  const a = keys[i]
  const b = keys[i + 1]
  const t = easeInOut((p - a.p) / (b.p - a.p))
  return {
    zoom: a.zoom + (b.zoom - a.zoom) * t,
    fx: a.fx + (b.fx - a.fx) * t,
    fy: a.fy + (b.fy - a.fy) * t,
  }
}

/** Cover-fit an image into a w×h box with zoom and focus, clamped so no edge shows. */
export function frameRect(iw: number, ih: number, w: number, h: number, cam: Cam) {
  const s = Math.max(w / iw, h / ih) * Math.max(1, cam.zoom)
  const dw = iw * s
  const dh = ih * s
  const x = clamp(w / 2 - cam.fx * dw, w - dw, 0)
  const y = clamp(h / 2 - cam.fy * dh, h - dh, 0)
  return { x, y, dw, dh }
}

/**
 * Local position inside a beat window, -1 (entering) .. 0 (settled) .. 1 (leaving).
 * Used for the small vertical drift on hero copy.
 */
export function driftAt(w: Span, p: number) {
  if (p < w[1]) return w[1] <= w[0] ? 0 : -(1 - clamp((p - w[0]) / (w[1] - w[0]), 0, 1))
  if (p > w[2]) return w[3] <= w[2] ? 0 : clamp((p - w[2]) / (w[3] - w[2]), 0, 1)
  return 0
}

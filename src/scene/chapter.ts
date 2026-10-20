// Scroll maths for the "Three ways we help a business grow." chapter.
// Pure functions: scroll position and measured layout in, numbers out. No DOM,
// no timers, no state, so the same scroll position always gives the same
// picture (scrolling back, reloading half way down, resizing, jumping to #ai).

export type ChapterMetrics = {
  /** Document Y of the top of the chapter section. */
  top: number
  /** Stage height in px (100svh). */
  vh: number
  /** Where the reading line sits in the viewport, 0..1 (0.5 desktop, lower on phones). */
  ref: number
  /** Document Y and height of each service article. */
  items: { top: number; h: number }[]
}

export type ChapterState = {
  /** 0..1: the three ring fragments fly together and the heading builds. */
  intro: number
  /** 0..1: the ring moves from its intro position to the side of the cards. */
  shift: number
  /** Degrees. Slow scroll-linked turn of the tick ring. */
  rot: number
  /** Per service: figure opacity and how much of its line drawing is drawn. */
  figures: { vis: number; build: number }[]
  /** Index of the service nearest the reading line, or -1 during the intro. */
  active: number
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Smooth 0..1 ramp between a and b (cubic Hermite). */
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

export function chapterState(y: number, m: ChapterMetrics): ChapterState {
  const line = y + m.vh * m.ref
  const last = m.items.length - 1

  // Starts while the chapter is still rising into view, ends 40% of a screen after it is pinned.
  const intro = smooth(0, 1, (y + m.vh * 0.7 - m.top) / (m.vh * 1.1))

  const figures = m.items.map((it, i) => {
    // u: 0 when the article's top is on the reading line, 1 when its bottom is.
    const u = (line - it.top) / it.h
    const d = Math.abs(u - 0.5) * 2 // 0 at the middle of the article, 1 at its edges
    let vis = 1 - smooth(0.55, 1.4, d)
    // The last figure stays until the chapter ends; the first stays through the hand-off.
    if (i === last && u > 0.5) vis = 1
    const build = smooth(-0.2, 0.3, u)
    return { vis, build }
  })

  const u0 = m.items.length ? (line - m.items[0].top) / m.items[0].h : 0
  const shift = smooth(-0.3, 0.1, u0)

  let active = -1
  let best = 0.5
  figures.forEach((f, i) => {
    if (f.vis > best) {
      best = f.vis
      active = i
    }
  })

  return { intro, shift, rot: (line - m.top) * 0.02, figures, active }
}

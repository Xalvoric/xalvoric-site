// Contract shared by the two hero renderers: the canvas-2D stills renderer
// (instant, used as poster and fallback) and the WebGL monolith (loaded later).
// ScrollScene owns scroll, copy and the SVG overlay; renderers only draw.

export type FrameState = {
  /** Scroll progress of the hero section, 0–1. */
  p: number
  /** performance.now() for this frame. */
  now: number
  /** Eased pointer position, -1..1 (0 when there is no mouse). */
  tiltX: number
  tiltY: number
  /** Outline build-in: 0 → 1 while the lines draw on. */
  build: number
  /** Overall opacity of the outline lines (settle + scroll fade). */
  lineAlpha: number
}

export type AnchorName = 'mark0' | 'mark1' | 'callout0' | 'callout1' | 'callout2'

export type OutlineShape = {
  /** SVG polyline `points` strings in stage CSS pixels. */
  paths: string[]
  plate: { cx: number; cy: number; rx: number; ry: number }
}

export interface HeroRenderer {
  readonly kind: 'stills' | 'webgl'
  /** Stage size in CSS pixels. */
  resize(cssW: number, cssH: number): void
  /** Draw one frame. Returns true if it wants to keep animating without new input. */
  frame(s: FrameState): boolean
  /** Where a named anchor sits on screen, in stage CSS pixels. */
  anchor(name: AnchorName, s: FrameState): [number, number] | null
  /** SVG outline to draw over the scene; null if the renderer draws its own. */
  outline(s: FrameState): OutlineShape | null
  dispose(): void
}

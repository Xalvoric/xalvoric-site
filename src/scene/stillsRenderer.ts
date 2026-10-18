// Canvas-2D renderer for the three generated stills: push-in, crossfades,
// fog/glitch transitions. Paints within a few hundred ms of load, so it is the
// hero's first picture and the fallback when WebGL is unavailable or too slow.
import { callouts, layers, outline, TILT, type Cam } from './config'
import { camAt, frameRect, opacityAt } from './timeline'
import { drawTransition, transitionAt } from './effects'
import type { AnchorName, FrameState, HeroRenderer, OutlineShape } from './renderer'

/** Aspect of the source stills; only the ratio matters for framing maths. */
const IW = 1600
const IH = 900

export type MediaStatus = 'ready' | 'failed'

/** Pick one image width for the session; bounded so phones never decode more than 3 × 2048 px stills. */
function pickWidth(): 1280 | 2048 {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number }
  if (nav.connection?.saveData || (nav.deviceMemory ?? 8) <= 2) return 1280
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  // Source width needed to cover the viewport at zoom 1 (images are 16:9).
  const need = Math.max(window.innerWidth, (window.innerHeight * 16) / 9) * dpr
  return need > 1500 ? 2048 : 1280
}

function loadImage(url: string) {
  const img = new Image()
  img.decoding = 'async'
  img.src = url
  // decode() resolves once the bitmap is ready to paint, and rejects on 404 / bad data.
  return img.decode().then(() => img)
}

export class StillsRenderer implements HeroRenderer {
  readonly kind = 'stills'
  private ctx: CanvasRenderingContext2D
  private images: (HTMLImageElement | null)[] = layers.map(() => null)
  private buffer: HTMLCanvasElement | null = null
  private bctx: CanvasRenderingContext2D | null = null
  private cssW = 1
  private cssH = 1
  private disposed = false
  private idleId = 0
  private canvas: HTMLCanvasElement
  private tilt: boolean
  private onStatus: (s: MediaStatus) => void
  private onChange: () => void

  constructor(
    canvas: HTMLCanvasElement,
    opts: { tilt: boolean; onStatus: (s: MediaStatus) => void; onChange: () => void },
  ) {
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('2D canvas unavailable')
    this.canvas = canvas
    this.ctx = ctx
    this.tilt = opts.tilt
    this.onStatus = opts.onStatus
    this.onChange = opts.onChange
    this.load()
    // Allocate and warm the transition buffer while idle, so the first glitch frame doesn't stall.
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200))
    this.idleId = idle(() => this.ensureBuffer())
  }

  private load() {
    const width = pickWidth()
    let failures = 0
    const load = (i: number) =>
      loadImage(`${layers[i].src}-${width}.webp`)
        // If the large file is missing or corrupt, try the small one before giving up.
        .catch(() => (width === 2048 ? loadImage(`${layers[i].src}-1280.webp`) : Promise.reject()))
        .then(
          (img) => {
            if (this.disposed) return
            this.images[i] = img
            this.onStatus('ready')
            this.onChange()
          },
          () => {
            failures++
            if (failures === layers.length) this.onStatus('failed')
          },
        )
    load(0).finally(() => {
      if (!this.disposed) for (let i = 1; i < layers.length; i++) load(i)
    })
  }

  private ensureBuffer() {
    if (this.buffer || this.disposed) return
    this.buffer = document.createElement('canvas')
    this.buffer.width = this.canvas.width
    this.buffer.height = this.canvas.height
    this.bctx = this.buffer.getContext('2d', { alpha: false })
    this.bctx?.fillRect(0, 0, 1, 1)
    this.ctx.drawImage(this.buffer, 0, 0, 1, 1, -2, -2, 1, 1)
  }

  resize(cssW: number, cssH: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.max(1, Math.round(cssW * dpr))
    const h = Math.max(1, Math.round(cssH * dpr))
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
      if (this.buffer) {
        this.buffer.width = w
        this.buffer.height = h
      }
    }
    this.cssW = cssW
    this.cssH = cssH
  }

  /** Camera for a layer at the current progress, including pointer tilt. */
  private camFor(i: number, portrait: boolean, s: FrameState): Cam {
    const layer = layers[i]
    const c = camAt((portrait && layer.portraitKeys) || layer.keys, s.p)
    if (!this.tilt) return c
    return { zoom: c.zoom + TILT.extraZoom, fx: c.fx + s.tiltX * TILT.shiftX, fy: c.fy + s.tiltY * TILT.shiftY }
  }

  private paintLayers(g: CanvasRenderingContext2D, w: number, h: number, s: FrameState) {
    const portrait = w < h
    g.globalCompositeOperation = 'source-over'
    g.globalAlpha = 1
    g.fillStyle = '#050505'
    g.fillRect(0, 0, w, h)
    let base = true
    for (let i = 0; i < layers.length; i++) {
      const op = opacityAt(layers[i].window, s.p)
      if (op <= 0.002) continue
      // If this still isn't decoded yet, hold the nearest earlier one that is
      // (camAt clamps, so it stays on its last frame instead of going blank).
      let src = i
      while (src >= 0 && !this.images[src]) src--
      if (src < 0) continue
      const img = this.images[src]!
      const r = frameRect(img.naturalWidth, img.naturalHeight, w, h, this.camFor(src, portrait, s))
      // The first painted layer is opaque so crossfades never dip to black.
      g.globalAlpha = base ? 1 : op
      g.drawImage(img, r.x, r.y, r.dw, r.dh)
      base = false
    }
    g.globalAlpha = 1
  }

  frame(s: FrameState) {
    const { width: w, height: h } = this.canvas
    const fx = transitionAt(s.p)
    if (fx.amount > 0.01) this.ensureBuffer()
    const buf = this.buffer
    if (fx.amount > 0.01 && buf && this.bctx) {
      this.paintLayers(this.bctx, w, h, s)
      drawTransition(this.ctx, buf, w, h, fx.amount, fx.index)
      this.ctx.globalCompositeOperation = 'source-over'
      this.ctx.globalAlpha = 1
    } else {
      this.paintLayers(this.ctx, w, h, s)
    }
    return false
  }

  /** Map an image point (0–1) of a layer to stage CSS pixels. */
  private toStage(layer: number, u: number, v: number, s: FrameState): [number, number] {
    const r = frameRect(IW, IH, this.cssW, this.cssH, this.camFor(layer, this.cssW < this.cssH, s))
    return [r.x + u * r.dw, r.y + v * r.dh]
  }

  anchor(name: AnchorName, s: FrameState): [number, number] | null {
    if (name === 'mark0' || name === 'mark1') {
      const m = outline.marks[name === 'mark0' ? 0 : 1]
      return m ? this.toStage(outline.layer, m.at[0], m.at[1], s) : null
    }
    const a = callouts.anchors[Number(name.slice(-1))]
    return a ? this.toStage(callouts.layer, a[0], a[1], s) : null
  }

  outline(s: FrameState): OutlineShape {
    const pts = (list: number[][]) =>
      list.map(([u, v]) => this.toStage(outline.layer, u, v, s).map((n) => n.toFixed(1)).join(',')).join(' ')
    const pl = outline.plate
    const [cx, cy] = this.toStage(outline.layer, pl.cx, pl.cy, s)
    const [ex] = this.toStage(outline.layer, pl.cx + pl.rx, pl.cy, s)
    const [, ey] = this.toStage(outline.layer, pl.cx, pl.cy + pl.ry, s)
    return {
      paths: outline.paths.map(pts),
      plate: { cx, cy, rx: Math.max(0, ex - cx), ry: Math.max(0, ey - cy) },
    }
  }

  dispose() {
    this.disposed = true
    ;(window.cancelIdleCallback ?? window.clearTimeout)(this.idleId)
    this.images.fill(null)
    this.buffer = null
    this.bctx = null
  }
}

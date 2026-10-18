import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { beats, callouts, layers, outline, SCROLL_LENGTH_VH, TILT, type Cam } from '../scene/config'
import { camAt, clamp, driftAt, frameRect, opacityAt } from '../scene/timeline'
import { drawTransition, transitionAt } from '../scene/effects'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { hero } from '../content/site'
import { HeroCopy } from './HeroCopy'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
  // Mobile URL-bar show/hide changes the viewport height on every scroll;
  // don't recalculate trigger positions for that.
  ScrollTrigger.config({ ignoreMobileResize: true })
}

const BEAT_LABELS = ['Studio', 'Services', 'Begin']
/** Aspect of the source stills; only the ratio matters for framing maths. */
const IW = 1600
const IH = 900
/** Copy drifts this many px as a beat enters or leaves. */
const DRIFT_PX = 28
/** Callouts need the desktop two-column layout. */
const CALLOUT_MIN_WIDTH = 860

const easeOut = (t: number) => 1 - (1 - t) ** 3
const ramp = (p: number, a: number, b: number) => clamp((p - a) / (b - a), 0, 1)

/** Hero entry point: cinematic scroll sequence, or a static stack when motion is reduced. */
export function ScrollScene() {
  const reduced = usePrefersReducedMotion()
  return reduced ? <StaticScene /> : <MotionScene />
}

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

function MotionScene() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const beatRefs = useRef<(HTMLDivElement | null)[]>([])
  const barRef = useRef<HTMLSpanElement>(null)
  const counterRef = useRef<HTMLSpanElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const section = sectionRef.current!
    const stage = stageRef.current!
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) {
      stage.dataset.media = 'failed'
      return
    }

    const svg = svgRef.current!
    const images: (HTMLImageElement | null)[] = layers.map(() => null)
    let progress = 0
    let dirty = true
    let disposed = false
    let activeBeat = -1
    const drift: number[] = beats.map(() => 0)

    // Offscreen frame, only used while a transition is running.
    let buffer: HTMLCanvasElement | null = null
    let bctx: CanvasRenderingContext2D | null = null

    // Overlay elements (queried once).
    const outlineGroup = svg.querySelector<SVGGElement>('.lines-outline')!
    const outlinePaths = [...svg.querySelectorAll<SVGPolylineElement>('.lines-outline polyline')]
    const plate = svg.querySelector<SVGEllipseElement>('.lines-outline ellipse')!
    const marks = [...svg.querySelectorAll<SVGGElement>('.lines-mark')]
    const calloutGroup = svg.querySelector<SVGGElement>('.lines-callouts')!
    const calloutEls = [...svg.querySelectorAll<SVGGElement>('.lines-callout')]
    const t0 = performance.now()
    const settleEnd = outline.drawMs + outline.holdMs + 600

    // Pointer tilt: desktop with a precise pointer only.
    const fine = window.matchMedia('(pointer: fine)').matches && TILT.shiftX + TILT.shiftY > 0
    let tiltX = 0
    let tiltY = 0
    let aimX = 0
    let aimY = 0

    // --- sizing -----------------------------------------------------------
    let cssW = 1
    let cssH = 1
    let items: { x: number; y: number }[] = []
    const measureItems = () => {
      // Positions of the beat-2 service links, relative to the stage, without the current drift.
      const sr = stage.getBoundingClientRect()
      const links = beatRefs.current[1]?.querySelectorAll('.hero-list a') ?? []
      items = [...links].map((a) => {
        const r = a.getBoundingClientRect()
        return { x: r.left - sr.left, y: r.top - sr.top + r.height / 2 - drift[1] }
      })
    }
    const resize = () => {
      const rect = stage.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.round(rect.width * dpr))
      const h = Math.max(1, Math.round(rect.height * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        if (buffer) {
          buffer.width = w
          buffer.height = h
        }
      }
      cssW = rect.width
      cssH = rect.height
      svg.setAttribute('viewBox', `0 0 ${cssW.toFixed(1)} ${cssH.toFixed(1)}`)
      measureItems()
      dirty = true
    }
    const ro = new ResizeObserver(resize)
    ro.observe(stage)
    resize()

    // --- loading: first beat first, then the rest -------------------------
    const width = pickWidth()
    const urls = layers.map((l) => `${l.src}-${width}.webp`)
    let failures = 0
    const load = (i: number) =>
      loadImage(urls[i])
        // If the large file is missing or corrupt, try the small one before giving up.
        .catch(() => (width === 2048 ? loadImage(`${layers[i].src}-1280.webp`) : Promise.reject()))
        .then(
        (img) => {
          if (disposed) return
          images[i] = img
          stage.dataset.media = 'ready'
          dirty = true
        },
        () => {
          failures++
          if (failures === layers.length) stage.dataset.media = 'failed'
        },
      )
    load(0).finally(() => {
      if (!disposed) for (let i = 1; i < layers.length; i++) load(i)
    })

    // Allocate and warm the transition buffer while idle, so the first glitch frame doesn't stall.
    const ensureBuffer = () => {
      if (buffer || disposed) return
      buffer = document.createElement('canvas')
      buffer.width = canvas.width
      buffer.height = canvas.height
      bctx = buffer.getContext('2d', { alpha: false })
      bctx?.fillRect(0, 0, 1, 1)
      ctx.drawImage(buffer, 0, 0, 1, 1, -2, -2, 1, 1)
    }
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200))
    const idleId = idle(ensureBuffer)

    // --- drawing ------------------------------------------------------------
    /** Camera for a layer at the current progress, including pointer tilt. */
    const camFor = (i: number, portrait: boolean): Cam => {
      const layer = layers[i]
      const c = camAt((portrait && layer.portraitKeys) || layer.keys, progress)
      if (!fine) return c
      return { zoom: c.zoom + TILT.extraZoom, fx: c.fx + tiltX * TILT.shiftX, fy: c.fy + tiltY * TILT.shiftY }
    }

    const paintLayers = (g: CanvasRenderingContext2D, w: number, h: number) => {
      const portrait = w < h
      g.globalCompositeOperation = 'source-over'
      g.globalAlpha = 1
      g.fillStyle = '#050505'
      g.fillRect(0, 0, w, h)
      let base = true
      for (let i = 0; i < layers.length; i++) {
        const op = opacityAt(layers[i].window, progress)
        if (op <= 0.002) continue
        // If this still isn't decoded yet, hold the nearest earlier one that is
        // (camAt clamps, so it stays on its last frame instead of going blank).
        let src = i
        while (src >= 0 && !images[src]) src--
        if (src < 0) continue
        const img = images[src]!
        const r = frameRect(img.naturalWidth, img.naturalHeight, w, h, camFor(src, portrait))
        // The first painted layer is opaque so crossfades never dip to black.
        g.globalAlpha = base ? 1 : op
        g.drawImage(img, r.x, r.y, r.dw, r.dh)
        base = false
      }
      g.globalAlpha = 1
    }

    /** Map an image point (0–1) of a layer to stage CSS pixels. */
    const toStage = (layer: number, u: number, v: number) => {
      const r = frameRect(IW, IH, cssW, cssH, camFor(layer, cssW < cssH))
      return [r.x + u * r.dw, r.y + v * r.dh] as const
    }
    const pts = (layer: number, list: number[][]) =>
      list.map(([u, v]) => toStage(layer, u, v).map((n) => n.toFixed(1)).join(',')).join(' ')

    /** Returns true while a time-based animation still needs frames. */
    const drawLines = (now: number) => {
      // Outline build-in over beat 1.
      const t = now - t0
      const build = easeOut(clamp(t / outline.drawMs, 0, 1))
      const settle = 1 - 0.55 * ramp(t, outline.drawMs + outline.holdMs, settleEnd)
      const scrollFade = 1 - ramp(progress, outline.fadeOut[0], outline.fadeOut[1])
      const oo = settle * scrollFade
      outlineGroup.style.opacity = oo.toFixed(3)
      if (oo > 0.001) {
        outline.paths.forEach((path, i) => {
          outlinePaths[i].setAttribute('points', pts(outline.layer, path))
          outlinePaths[i].style.strokeDashoffset = (1 - build).toFixed(3)
        })
        const [cx, cy] = toStage(outline.layer, outline.plate.cx, outline.plate.cy)
        const [ex] = toStage(outline.layer, outline.plate.cx + outline.plate.rx, outline.plate.cy)
        const [, ey] = toStage(outline.layer, outline.plate.cx, outline.plate.cy + outline.plate.ry)
        plate.setAttribute('cx', cx.toFixed(1))
        plate.setAttribute('cy', cy.toFixed(1))
        plate.setAttribute('rx', Math.max(0, ex - cx).toFixed(1))
        plate.setAttribute('ry', Math.max(0, ey - cy).toFixed(1))
        plate.style.strokeDashoffset = (1 - build).toFixed(3)
        outline.marks.forEach((m, i) => {
          const [x, y] = toStage(outline.layer, m.at[0], m.at[1])
          marks[i].setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`)
          marks[i].style.opacity = ramp(build, 0.6, 1).toFixed(3)
        })
      }

      // Callouts: service links in beat 2 tied to points on the monolith edge.
      const co = cssW >= CALLOUT_MIN_WIDTH ? opacityAt(beats[1].window, progress) : 0
      calloutGroup.style.opacity = co.toFixed(3)
      if (co > 0.001) {
        callouts.anchors.forEach(([u, v], i) => {
          const el = calloutEls[i]
          const item = items[i]
          if (!el || !item) return
          const [ax, ay] = toStage(callouts.layer, u, v)
          const iy = item.y + drift[1]
          const ix = item.x - 10 - tiltX * TILT.copyPx
          el.querySelector('polyline')!.setAttribute(
            'points',
            `${ax.toFixed(1)},${ay.toFixed(1)} ${(ix - 34).toFixed(1)},${iy.toFixed(1)} ${ix.toFixed(1)},${iy.toFixed(1)}`,
          )
          el.querySelector('polyline')!.style.strokeDashoffset = (1 - co).toFixed(3)
          el.querySelectorAll('circle').forEach((c) => {
            c.setAttribute('cx', ax.toFixed(1))
            c.setAttribute('cy', ay.toFixed(1))
          })
        })
      }
      return t < settleEnd
    }

    const draw = (now: number) => {
      const w = canvas.width
      const h = canvas.height
      const fx = transitionAt(progress)
      if (fx.amount > 0.01) ensureBuffer()
      const buf = buffer as HTMLCanvasElement | null
      if (fx.amount > 0.01 && buf && bctx) {
        paintLayers(bctx, w, h)
        drawTransition(ctx, buf, w, h, fx.amount, fx.index)
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 1
      } else {
        paintLayers(ctx, w, h)
      }

      // Copy blocks follow the same progress value.
      // The counter switches halfway between one beat leaving and the next arriving.
      let top = 0
      for (let i = 1; i < beats.length; i++) {
        if (progress >= (beats[i - 1].window[3] + beats[i].window[0]) / 2) top = i
      }
      beats.forEach((b, i) => {
        const el = beatRefs.current[i]
        const op = opacityAt(b.window, progress)
        drift[i] = driftAt(b.window, progress) * -DRIFT_PX
        if (!el) return
        el.style.opacity = op.toFixed(3)
        el.style.transform = `translate3d(${(-tiltX * TILT.copyPx).toFixed(1)}px, ${drift[i].toFixed(1)}px, 0)`
        el.toggleAttribute('data-live', op > 0.6)
      })
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress.toFixed(4)})`
      if (top !== activeBeat && counterRef.current) {
        activeBeat = top
        counterRef.current.textContent = `0${top + 1} / 0${beats.length}  ${BEAT_LABELS[top]}`
      }
      return drawLines(now)
    }

    let animating = true
    const tick = () => {
      if (fine) {
        // Ease toward the pointer, then snap so the frame settles exactly.
        let nx = tiltX + (aimX - tiltX) * TILT.ease
        let ny = tiltY + (aimY - tiltY) * TILT.ease
        if (Math.abs(aimX - nx) < 0.002) nx = aimX
        if (Math.abs(aimY - ny) < 0.002) ny = aimY
        if (nx !== tiltX || ny !== tiltY) dirty = true
        tiltX = nx
        tiltY = ny
      }
      if (!dirty && !animating) return
      dirty = false
      animating = draw(performance.now())
    }
    gsap.ticker.add(tick)

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      aimX = (e.clientX / window.innerWidth) * 2 - 1
      aimY = (e.clientY / window.innerHeight) * 2 - 1
    }
    const onLeave = () => {
      aimX = 0
      aimY = 0
    }
    if (fine) {
      window.addEventListener('pointermove', onPointer, { passive: true })
      document.documentElement.addEventListener('pointerleave', onLeave)
    }

    // --- scroll → progress (single source of truth) ------------------------
    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        progress = self.progress
        dirty = true
      },
      onRefresh: (self) => {
        progress = self.progress
        dirty = true
      },
    })
    progress = st.progress
    document.fonts?.ready.then(() => {
      if (disposed) return
      ScrollTrigger.refresh()
      measureItems()
      dirty = true
    })

    // A viewport resize changes the section's pixel height. Keep the visitor on
    // the same moment of the sequence instead of the same pixel offset.
    let keep = -1
    const onRefreshInit = () => {
      keep = progress > 0 && progress < 1 ? progress : -1
    }
    const onRefreshed = () => {
      if (keep < 0) return
      const y = st.start + (st.end - st.start) * keep
      keep = -1
      if (Math.abs(window.scrollY - y) > 1) window.scrollTo({ top: y, behavior: 'instant' })
    }
    ScrollTrigger.addEventListener('refreshInit', onRefreshInit)
    ScrollTrigger.addEventListener('refresh', onRefreshed)

    // Keyboard users: tabbing into a hidden beat scrolls the scene to it.
    const onFocusIn = (e: FocusEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-beat]')
      if (!el) return
      const idx = Number(el.dataset.beat)
      if (opacityAt(beats[idx].window, progress) > 0.6) return
      const y = st.start + (st.end - st.start) * beats[idx].focusAt
      window.scrollTo({ top: y, behavior: 'instant' })
    }
    section.addEventListener('focusin', onFocusIn)

    return () => {
      disposed = true
      gsap.ticker.remove(tick)
      ScrollTrigger.removeEventListener('refreshInit', onRefreshInit)
      ScrollTrigger.removeEventListener('refresh', onRefreshed)
      st.kill()
      ro.disconnect()
      section.removeEventListener('focusin', onFocusIn)
      window.removeEventListener('pointermove', onPointer)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      ;(window.cancelIdleCallback ?? window.clearTimeout)(idleId)
      images.fill(null)
      buffer = null
      bctx = null
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className="scene"
      style={{ height: `${SCROLL_LENGTH_VH}svh` }}
      aria-label="Introduction"
    >
      <div ref={stageRef} className="scene-stage" data-media="loading">
        {/* Poster paints immediately; the canvas fades in over it once the first still is decoded. */}
        <img
          className="scene-poster"
          src="/media/beat1-establish-1280.webp"
          alt=""
          fetchPriority="high"
          decoding="async"
          onError={(e) => {
            e.currentTarget.hidden = true
          }}
        />
        <canvas ref={canvasRef} className="scene-canvas" role="img" aria-label={layers[0].alt} />
        <div className="scene-scrim" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />

        {/* Decorative line work: outline build-in (beat 1) and service callouts (beat 2). */}
        <svg ref={svgRef} className="scene-lines" aria-hidden="true" focusable="false">
          <g className="lines-outline" style={{ opacity: 0 }}>
            {outline.paths.map((_, i) => (
              <polyline key={i} pathLength={1} />
            ))}
            <ellipse pathLength={1} />
            {outline.marks.map((m) => (
              <g key={m.text} className="lines-mark" style={{ opacity: 0 }}>
                <circle r={2.5} />
                <line x1={0} y1={0} x2={m.side === 'left' ? -26 : 26} y2={-18} />
                <text x={m.side === 'left' ? -30 : 30} y={-22} textAnchor={m.side === 'left' ? 'end' : 'start'}>
                  {m.text}
                </text>
              </g>
            ))}
          </g>
          <g className="lines-callouts" style={{ opacity: 0 }}>
            {callouts.anchors.map((_, i) => (
              <g key={i} className="lines-callout">
                <circle className="lines-ring" r={9} />
                <circle r={2.5} />
                <polyline pathLength={1} />
              </g>
            ))}
          </g>
        </svg>

        <p className="scene-corner scene-corner--left" aria-hidden="true">
          {hero.corners.left}
        </p>
        <p className="scene-corner scene-corner--right" aria-hidden="true">
          {hero.corners.right}
        </p>

        {beats.map((b, i) => (
          <div
            key={b.id}
            ref={(el) => {
              beatRefs.current[i] = el
            }}
            className={`scene-beat scene-beat--${b.id}`}
            data-beat={i}
            style={i === 0 ? undefined : { opacity: 0 }}
          >
            <HeroCopy beat={b.id} />
          </div>
        ))}

        <div className="scene-hud" aria-hidden="true">
          <span ref={counterRef} className="scene-counter">
            01 / 03  {BEAT_LABELS[0]}
          </span>
          <span className="scene-track">
            <span ref={barRef} className="scene-bar" />
          </span>
          <span className="scene-hint">Scroll</span>
        </div>
      </div>
    </section>
  )
}

/** Reduced-motion hero: the same three frames and copy in normal document flow. */
function StaticScene() {
  return (
    <div className="static-scene">
      {beats.map((b, i) => (
        <section key={b.id} className={`static-beat static-beat--${b.id}`} aria-label={i === 0 ? 'Introduction' : undefined}>
          <img
            className="static-img"
            src={`${layers[i].src}-1280.webp`}
            srcSet={`${layers[i].src}-1280.webp 1280w, ${layers[i].src}-2048.webp 2048w`}
            sizes="100vw"
            alt={layers[i].alt}
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
          <div className="static-copy">
            <HeroCopy beat={b.id} />
          </div>
        </section>
      ))}
    </div>
  )
}

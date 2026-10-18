import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { beats, layers, SCROLL_LENGTH_VH } from '../scene/config'
import { camAt, driftAt, frameRect, opacityAt } from '../scene/timeline'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { HeroCopy } from './HeroCopy'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
  // Mobile URL-bar show/hide changes the viewport height on every scroll;
  // don't recalculate trigger positions for that.
  ScrollTrigger.config({ ignoreMobileResize: true })
}

const BEAT_LABELS = ['Studio', 'Services', 'Begin']

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

  useEffect(() => {
    const section = sectionRef.current!
    const stage = stageRef.current!
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) {
      stage.dataset.media = 'failed'
      return
    }

    const images: (HTMLImageElement | null)[] = layers.map(() => null)
    let progress = 0
    let dirty = true
    let disposed = false
    let activeBeat = -1

    // --- sizing -----------------------------------------------------------
    const resize = () => {
      const rect = stage.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.round(rect.width * dpr))
      const h = Math.max(1, Math.round(rect.height * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
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

    // --- drawing ------------------------------------------------------------
    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      const portrait = w < h
      ctx.globalAlpha = 1
      ctx.fillStyle = '#050505'
      ctx.fillRect(0, 0, w, h)

      let base = true
      for (let i = 0; i < layers.length; i++) {
        const op = opacityAt(layers[i].window, progress)
        if (op <= 0.002) continue
        // If this still isn't decoded yet, hold the nearest earlier one that is
        // (camAt clamps, so it stays on its last frame instead of going blank).
        let src = i
        while (src >= 0 && !images[src]) src--
        if (src < 0) continue
        const layer = layers[src]
        const img = images[src]!
        const keys = (portrait && layer.portraitKeys) || layer.keys
        const r = frameRect(img.naturalWidth, img.naturalHeight, w, h, camAt(keys, progress))
        // The first painted layer is opaque so crossfades never dip to black.
        ctx.globalAlpha = base ? 1 : op
        ctx.drawImage(img, r.x, r.y, r.dw, r.dh)
        base = false
      }
      ctx.globalAlpha = 1

      // Copy blocks follow the same progress value.
      let top = 0
      let topOp = -1
      beats.forEach((b, i) => {
        const el = beatRefs.current[i]
        const op = opacityAt(b.window, progress)
        if (op > topOp) {
          topOp = op
          top = i
        }
        if (!el) return
        el.style.opacity = op.toFixed(3)
        el.style.transform = `translate3d(0, ${(driftAt(b.window, progress) * -28).toFixed(1)}px, 0)`
        el.toggleAttribute('data-live', op > 0.6)
      })
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress.toFixed(4)})`
      if (top !== activeBeat && counterRef.current) {
        activeBeat = top
        counterRef.current.textContent = `0${top + 1} / 0${beats.length}  ${BEAT_LABELS[top]}`
      }
    }

    const tick = () => {
      if (!dirty) return
      dirty = false
      draw()
    }
    gsap.ticker.add(tick)

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
    document.fonts?.ready.then(() => !disposed && ScrollTrigger.refresh())

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
      images.fill(null)
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

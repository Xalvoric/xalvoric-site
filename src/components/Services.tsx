import { useEffect, useRef, type CSSProperties } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { chapter, services } from '../content/site'
import { chapterState, type ChapterMetrics, type ChapterState } from '../scene/chapter'
import { Follower } from '../scene/follow'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { ServiceFigureInline, ServiceShapes } from './ServiceFigure'

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger)

/** Ring geometry, in the 1000 x 1000 figure box. */
const R_ARC = 410
const R_TICKS = 452
const ARC_SPAN = 112 // each fragment, degrees; the rest is the gaps between them

const pt = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180
  return `${(500 + r * Math.cos(a)).toFixed(1)} ${(500 + r * Math.sin(a)).toFixed(1)}`
}
const arcPath = (i: number) => {
  const a0 = -90 + 120 * i + (120 - ARC_SPAN) / 2
  return `M${pt(R_ARC, a0)}A${R_ARC} ${R_ARC} 0 0 1 ${pt(R_ARC, a0 + ARC_SPAN)}`
}
/** Where the "01 WEB" tag sits, just outside the middle of fragment i. */
const tagAt = (i: number): [string, string] => {
  const a = ((-90 + 120 * i + 60) * Math.PI) / 180
  return [(500 + (R_ARC + 40) * Math.cos(a)).toFixed(1), (500 + (R_ARC + 40) * Math.sin(a)).toFixed(1)]
}

/** Where each fragment starts before it flies into the ring: [rotate deg, dx, dy] in figure units. */
const ARC_FROM = [
  [-70, -90, -120],
  [55, 140, 60],
  [90, -60, 150],
] as const

const words = chapter.title.split(' ')
const wordStyle = (i: number) => ({ '--i': i }) as CSSProperties

/**
 * "Three ways we help a business grow."
 *
 * A pinned stage (a ring built from three fragments, one per service) stays on
 * screen while the real text scrolls past it in normal document flow. The
 * stage is decoration: it reads scroll position and nothing else, so the text,
 * the anchors (#web, #ai, #ads), find-in-page and keyboard order all behave
 * like a normal page. Without JS, or with reduced motion, the same content
 * shows as a plain list with a small drawing per service.
 */
export function Services() {
  const reduced = usePrefersReducedMotion()
  const rootRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reduced) return
    const root = rootRef.current!
    const stage = stageRef.current!
    const figureBox = stage.querySelector<HTMLElement>('.chapter-figure')!
    const ticks = stage.querySelector<SVGElement>('.ring-ticks')!
    const arcs = [...stage.querySelectorAll<SVGPathElement>('.ring-arc')]
    const arcTags = [...stage.querySelectorAll<SVGGElement>('.ring-tag')]
    const figs = [...stage.querySelectorAll<SVGGElement>('.fig')]
    const heading = root.querySelector<HTMLElement>('.chapter-intro')!
    const articles = [...root.querySelectorAll<HTMLElement>('.service')]
    const railLinks = [...root.querySelectorAll<HTMLAnchorElement>('.chapter-rail a')]

    const coarse = window.matchMedia('(pointer: coarse)').matches
    let metrics: ChapterMetrics | null = null
    let visible = true
    let dirty = true
    let active = -2
    let lastNow = performance.now()
    let follower: Follower | null = null

    const measure = () => {
      const vh = stage.clientHeight
      if (!vh || getComputedStyle(stage).display === 'none') {
        metrics = null
        return
      }
      const y = window.scrollY
      metrics = {
        top: root.getBoundingClientRect().top + y,
        vh,
        ref: window.innerWidth < 860 ? 0.3 : 0.5,
        items: articles.map((a) => {
          const r = a.getBoundingClientRect()
          return { top: r.top + y, h: r.height }
        }),
      }
      // Same scroll position, same picture: after a resize or refresh, sit exactly on it.
      follower = new Follower(coarse ? 0 : 90, y, 0.3, vh * 0.6)
      dirty = true
    }

    const apply = (s: ChapterState) => {
      heading.style.setProperty('--intro', s.intro.toFixed(3))
      figureBox.style.setProperty('--shift', s.shift.toFixed(3))
      ticks.style.transform = `rotate(${s.rot.toFixed(2)}deg)`
      const away = 1 - s.intro
      arcs.forEach((arc, i) => {
        const [rot, dx, dy] = ARC_FROM[i]
        arc.setAttribute(
          'transform',
          `translate(${(dx * away).toFixed(1)} ${(dy * away).toFixed(1)}) rotate(${(rot * away).toFixed(2)} 500 500)`,
        )
        const f = s.figures[i]
        arc.style.setProperty('--on', (f ? f.vis : 0).toFixed(3))
        arc.style.setProperty('--in', s.intro.toFixed(3))
        arcTags[i]?.style.setProperty('--on', (f ? f.vis : 0).toFixed(3))
        arcTags[i]?.style.setProperty('--in', s.intro.toFixed(3))
      })
      figs.forEach((fig, i) => {
        const f = s.figures[i]
        fig.style.setProperty('--vis', f.vis.toFixed(3))
        fig.style.setProperty('--build', f.build.toFixed(3))
      })
      articles.forEach((a, i) => a.style.setProperty('--vis', s.figures[i].vis.toFixed(3)))
      if (s.active !== active) {
        active = s.active
        railLinks.forEach((l, i) => {
          if (i === active) l.setAttribute('aria-current', 'location')
          else l.removeAttribute('aria-current')
        })
      }
    }

    // Same loop as the hero: GSAP's ticker, one frame at a time, native scroll as the only input.
    const tick = () => {
      const now = performance.now()
      const dt = now - lastNow
      lastNow = now
      if (!metrics || !follower || !visible) return
      const y = window.scrollY
      if (y !== follower.target) {
        follower.target = y
        dirty = true
      }
      const moving = follower.step(dt)
      if (!dirty && !moving) return
      dirty = moving
      apply(chapterState(follower.value, metrics))
    }
    gsap.ticker.add(tick)

    // Only work while the chapter is near the screen; re-sync on the way back in.
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting
        if (visible) {
          follower?.snap(window.scrollY)
          dirty = true
        }
      },
      { rootMargin: '100% 0px 100% 0px' },
    )
    io.observe(root)

    const ro = new ResizeObserver(measure)
    ro.observe(root)
    ro.observe(document.body)
    ScrollTrigger.addEventListener('refresh', measure)
    document.fonts?.ready.then(measure)
    measure()

    // Switching motion off (or back on) from the viewer's settings re-runs this effect.
    return () => {
      gsap.ticker.remove(tick)
      io.disconnect()
      ro.disconnect()
      ScrollTrigger.removeEventListener('refresh', measure)
      // Remove only what this effect wrote (React owns the other inline styles, e.g. each stroke's --k).
      heading.style.removeProperty('--intro')
      figureBox.style.removeProperty('--shift')
      ticks.style.removeProperty('transform')
      arcs.forEach((el) => {
        el.removeAttribute('transform')
        el.style.removeProperty('--on')
        el.style.removeProperty('--in')
      })
      arcTags.forEach((el) => {
        el.style.removeProperty('--on')
        el.style.removeProperty('--in')
      })
      figs.forEach((el) => {
        el.style.removeProperty('--vis')
        el.style.removeProperty('--build')
      })
      articles.forEach((el) => el.style.removeProperty('--vis'))
    }
  }, [reduced])

  return (
    <section
      ref={rootRef}
      id="services"
      className="section services chapter"
      data-motion={reduced ? 'off' : 'on'}
      aria-labelledby="services-title"
    >
      {/* Decoration only: the ring and the line drawings. Hidden from assistive tech. */}
      <div ref={stageRef} className="chapter-stage" aria-hidden="true">
        <div className="chapter-fog" />
        <div className="chapter-figure">
          <svg viewBox="0 0 1000 1000" focusable="false">
            <circle className="ring-ticks" cx={500} cy={500} r={R_TICKS} />
            {services.map((s, i) => (
              <g key={s.id}>
                <path className="ring-arc" d={arcPath(i)} />
                <g className="ring-tag">
                  <text x={tagAt(i)[0]} y={tagAt(i)[1]} textAnchor="middle" dominantBaseline="middle">
                    {s.index} {s.short}
                  </text>
                </g>
              </g>
            ))}
            {services.map((s) => (
              <g key={s.id} className={`fig fig--${s.id}`}>
                <ServiceShapes id={s.id} tags={s.tags} />
              </g>
            ))}
          </svg>
        </div>
      </div>

      <div className="chapter-flow container">
        <header className="section-head chapter-intro">
          <p className="eyebrow">{chapter.eyebrow}</p>
          <h2 id="services-title" className="section-title chapter-title">
            {words.map((w, i) => (
              <span key={i}>
                <span className="w">
                  <span style={wordStyle(i)}>{w}</span>
                </span>
                {i < words.length - 1 ? ' ' : ''}
              </span>
            ))}
          </h2>
          <p className="section-lede">{chapter.lede}</p>
        </header>

        <div className="chapter-body">
          <nav className="chapter-rail" aria-label={chapter.railLabel}>
            <ul>
              {services.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>
                    <span aria-hidden="true">{s.index}</span> {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <ol className="service-list">
            {services.map((s) => (
              <li key={s.id} id={s.id} className="service">
                <div className="service-card">
                  <span className="service-index" aria-hidden="true">
                    {s.index}
                  </span>
                  <div className="service-main">
                    <h3 className="service-name">{s.name}</h3>
                    <p className="service-lede">{s.lede}</p>
                    <div className="service-figure">
                      <ServiceFigureInline id={s.id} tags={s.tags} />
                    </div>
                  </div>
                  <div className="service-detail">
                    <h4 className="mini-label">What’s included</h4>
                    <ul className="tick-list">
                      {s.includes.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <h4 className="mini-label">A good fit if</h4>
                    <p className="service-fit">{s.fit}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

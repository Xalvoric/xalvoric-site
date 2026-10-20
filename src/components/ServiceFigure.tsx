// Procedural line drawings for the three services. Code only, no image files.
// Every shape is one stroke with pathLength=1, so the scroll code can "draw" it
// by changing a single CSS variable (--build, 0..1) on the wrapping element.
// Coordinates are in a 1000 x 1000 box with the centre at (500, 500).
import type { CSSProperties } from 'react'

type Label = {
  /** Point on the drawing the leader line starts from. */
  from: [number, number]
  /** Corner of the leader line, then where the text sits. */
  to: [number, number]
  anchor: 'start' | 'end'
}

type Fig = {
  paths: string[]
  circles: [number, number, number][]
  labels: [Label, Label, Label]
}

const polar = (r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180
  return [Math.round(500 + r * Math.cos(a)), Math.round(500 + r * Math.sin(a))]
}

const hex = Array.from({ length: 6 }, (_, k) => polar(190, -90 + 60 * k))

const FIGURES: Record<string, Fig> = {
  // A page and a phone: structure, layout, build.
  web: {
    paths: [
      'M300 360H700V640H300Z',
      'M300 400H700',
      'M330 440H520',
      'M330 464H468',
      'M330 494H420V524H330Z',
      'M560 440H670V530H560Z',
      'M560 440L670 530',
      'M670 440L560 530',
      'M330 566H430V612H330Z',
      'M450 566H550V612H450Z',
      'M570 566H670V612H570Z',
      'M740 480H810V640H740Z',
      'M740 508H810',
      'M762 622H788',
    ],
    circles: [
      [322, 380, 6],
      [342, 380, 6],
      [362, 380, 6],
    ],
    labels: [
      { from: [300, 360], to: [236, 300], anchor: 'end' },
      { from: [670, 440], to: [736, 372], anchor: 'start' },
      { from: [300, 640], to: [236, 700], anchor: 'end' },
    ],
  },
  // A small network with a review frame around it: map, agents, review.
  ai: {
    paths: [
      `M${hex.map(([x, y]) => `${x} ${y}`).join('L')}Z`,
      ...hex.map(([x, y]) => `M500 500L${x} ${y}`),
      'M255 300V255H300',
      'M700 255H745V300',
      'M745 700V745H700',
      'M300 745H255V700',
    ],
    circles: [[500, 500, 30], [500, 500, 50], ...hex.map(([x, y]): [number, number, number] => [x, y, 12])],
    labels: [
      { from: hex[1], to: [764, 330], anchor: 'start' },
      { from: hex[3], to: [560, 790], anchor: 'start' },
      { from: hex[4], to: [236, 690], anchor: 'end' },
    ],
  },
  // Nested frames in three aspect ratios: concepts, scenes, variants.
  ads: {
    paths: [
      'M330 404.5H670V595.5H330Z',
      'M385 385H615V615H385Z',
      'M435 384.5H565V615.5H435Z',
      'M475 468L535 500L475 532Z',
      'M270 360V330H300',
      'M700 330H730V360',
      'M730 640V670H700',
      'M300 670H270V640',
    ],
    circles: [],
    labels: [
      { from: [670, 404], to: [764, 350], anchor: 'start' },
      { from: [565, 384], to: [612, 300], anchor: 'start' },
      { from: [330, 596], to: [236, 700], anchor: 'end' },
    ],
  },
}

const k = (i: number, n: number) => ({ '--k': (i / Math.max(1, n - 1)).toFixed(3) }) as CSSProperties

/** The drawing itself, as SVG children. Wrap in an <svg viewBox="0 0 1000 1000"> or use <ServiceFigureInline>. */
export function ServiceShapes({ id, tags }: { id: string; tags: readonly string[] }) {
  const f = FIGURES[id]
  if (!f) return null
  const n = f.paths.length + f.circles.length
  return (
    <>
      {f.paths.map((d, i) => (
        <path key={d} className="fp" d={d} pathLength={1} style={k(i, n)} />
      ))}
      {f.circles.map(([cx, cy, r], i) => (
        <circle key={`${cx}-${cy}-${r}`} className="fp" cx={cx} cy={cy} r={r} pathLength={1} style={k(f.paths.length + i, n)} />
      ))}
      {f.labels.map((l, i) => (
        <g key={i} className="fl">
          <path
            className="fp fp--leader"
            d={`M${l.from[0]} ${l.from[1]}L${l.to[0]} ${l.to[1]}H${l.to[0] + (l.anchor === 'end' ? -34 : 34)}`}
            pathLength={1}
          />
          <text x={l.to[0] + (l.anchor === 'end' ? -42 : 42)} y={l.to[1] + 6} textAnchor={l.anchor}>
            {`0${i + 1} ${tags[i]}`.toUpperCase()}
          </text>
        </g>
      ))}
    </>
  )
}

/** Small, fully drawn copy (no callout text) shown inside each service in the static layout. */
export function ServiceFigureInline({ id, tags }: { id: string; tags: readonly string[] }) {
  return (
    <svg className="service-figure-svg" viewBox="230 240 620 520" aria-hidden="true" focusable="false">
      <ServiceShapes id={id} tags={tags} />
    </svg>
  )
}

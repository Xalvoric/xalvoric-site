// Camera keyframes for the WebGL monolith, in hero scroll progress (0–1).
// Each segment eases in and out, so the camera settles while a beat's copy
// is on screen and moves (under the fog/glitch transition) between beats.
//
// ox / oy shift the subject on screen without moving the camera (a view
// offset, as a fraction of the viewport): positive ox pushes the monolith
// left, positive oy pushes it up. Use them to keep the copy area clear.

export type CamKey3 = {
  p: number
  pos: [number, number, number]
  look: [number, number, number]
  fov: number
  ox: number
  oy: number
}

export const desktopPath: CamKey3[] = [
  { p: 0, pos: [5.2, 1.7, 14.6], look: [0, 3.1, 0], fov: 30, ox: 0.1, oy: 0 },
  { p: 0.26, pos: [3.6, 2.8, 9], look: [0, 3.4, 0], fov: 30, ox: 0.1, oy: 0 },
  { p: 0.44, pos: [4.4, 4.3, 2.4], look: [0.3, 3.8, 0.3], fov: 34, ox: 0.14, oy: 0 },
  { p: 0.6, pos: [4.1, 3.7, 2.5], look: [0.32, 3.6, 0.32], fov: 34, ox: 0.14, oy: 0 },
  { p: 0.78, pos: [-4, 6.2, 15.5], look: [0, 3, 0], fov: 30, ox: -0.13, oy: 0 },
  { p: 1, pos: [-3.4, 4.4, 19], look: [0, 3, 0], fov: 28, ox: -0.13, oy: 0 },
]

/** Phones: pull back a little and lift the subject above the bottom-anchored copy. */
export const portraitPath: CamKey3[] = [
  { p: 0, pos: [7, 2.2, 19.8], look: [0, 3.1, 0], fov: 34, ox: 0, oy: 0.1 },
  { p: 0.26, pos: [5, 3.0, 13.2], look: [0, 3.4, 0], fov: 34, ox: 0, oy: 0.12 },
  { p: 0.44, pos: [5.2, 4.5, 3.0], look: [0.3, 3.8, 0.3], fov: 38, ox: 0, oy: 0.2 },
  { p: 0.6, pos: [4.9, 3.9, 3.0], look: [0.32, 3.6, 0.32], fov: 38, ox: 0, oy: 0.2 },
  { p: 0.78, pos: [-4, 6.6, 21], look: [0, 3, 0], fov: 34, ox: 0, oy: 0.16 },
  { p: 1, pos: [-3.4, 4.8, 25], look: [0, 3, 0], fov: 32, ox: 0, oy: 0.16 },
]

// One continuous curve through the keys (a cardinal spline per channel) instead
// of an ease-in/ease-out between every pair. Easing per pair brings the camera
// to a full stop at every key, which reads as "slide, stop, slide". With the
// spline the camera keeps moving through a beat: it only slows where the
// keyframes themselves ask for it. The two ends of the path still start and
// finish at rest. Spline tangents are scaled by TENSION (1 = Catmull-Rom,
// lower = tighter, less overshoot).
const TENSION = 0.85

type Channels = number[][]

const channelsOf = (k: CamKey3) => [...k.pos, ...k.look, k.fov, k.ox, k.oy]

const tangentCache = new WeakMap<CamKey3[], { ch: Channels; m: Channels }>()

function prepare(path: CamKey3[]) {
  let hit = tangentCache.get(path)
  if (hit) return hit
  const ch: Channels = path.map(channelsOf)
  const n = path.length
  const m: Channels = ch.map((row, i) =>
    row.map((_, c) => {
      // Ends are at rest.
      if (i === 0 || i === n - 1) return 0
      return (TENSION * (ch[i + 1][c] - ch[i - 1][c])) / (path[i + 1].p - path[i - 1].p)
    }),
  )
  hit = { ch, m }
  tangentCache.set(path, hit)
  return hit
}

/** Cubic Hermite between two keys; `m` are slopes per unit of p. */
function hermite(y0: number, y1: number, m0: number, m1: number, h: number, t: number) {
  const t2 = t * t
  const t3 = t2 * t
  return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * m1
}

export function cameraAt(path: CamKey3[], p: number): Omit<CamKey3, 'p'> {
  if (p <= path[0].p) return path[0]
  const last = path[path.length - 1]
  if (p >= last.p) return last
  let i = 0
  while (i < path.length - 2 && p > path[i + 1].p) i++
  const { ch, m } = prepare(path)
  const h = path[i + 1].p - path[i].p
  const t = (p - path[i].p) / h
  const v = ch[i].map((_, c) => hermite(ch[i][c], ch[i + 1][c], m[i][c], m[i + 1][c], h, t))
  return {
    pos: [v[0], v[1], v[2]],
    look: [v[3], v[4], v[5]],
    fov: v[6],
    ox: v[7],
    oy: v[8],
  }
}

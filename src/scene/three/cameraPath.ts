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

const easeInOut = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2
const mix = (a: number, b: number, t: number) => a + (b - a) * t

export function cameraAt(path: CamKey3[], p: number): Omit<CamKey3, 'p'> {
  if (p <= path[0].p) return path[0]
  const last = path[path.length - 1]
  if (p >= last.p) return last
  let i = 0
  while (i < path.length - 2 && p > path[i + 1].p) i++
  const a = path[i]
  const b = path[i + 1]
  const t = easeInOut((p - a.p) / (b.p - a.p))
  return {
    pos: [mix(a.pos[0], b.pos[0], t), mix(a.pos[1], b.pos[1], t), mix(a.pos[2], b.pos[2], t)],
    look: [mix(a.look[0], b.look[0], t), mix(a.look[1], b.look[1], t), mix(a.look[2], b.look[2], t)],
    fov: mix(a.fov, b.fov, t),
    ox: mix(a.ox, b.ox, t),
    oy: mix(a.oy, b.oy, t),
  }
}

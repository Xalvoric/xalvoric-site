// Procedural monolith: a tapered square shaft with a pyramid cap, its edge
// lines (for the build-in), and a circuit texture for the facets.
import { BufferGeometry, CanvasTexture, Float32BufferAttribute, SRGBColorSpace } from 'three'

/** Dimensions in world units. */
export const M = {
  shoulder: 5.2,
  apex: 6.1,
  baseHalf: 0.58,
  topHalf: 0.38,
  plateRadius: 1.5,
}

/** Half-width of the shaft at height y. */
export const halfAt = (y: number) => M.baseHalf + (M.topHalf - M.baseHalf) * Math.min(1, Math.max(0, y / M.shoulder))

/** Corners of a square cross-section, counter-clockwise seen from above. */
const corners = (h: number, y: number) => [
  [h, y, h],
  [-h, y, h],
  [-h, y, -h],
  [h, y, -h],
]

export function monolithGeometry() {
  const pos: number[] = []
  const uv: number[] = []
  const b = corners(M.baseHalf, 0)
  const t = corners(M.topHalf, M.shoulder)
  const apex = [0, M.apex, 0]
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4
    // Side quad as two triangles, wound so normals face outward.
    pos.push(...b[j], ...b[i], ...t[i], ...b[j], ...t[i], ...t[j])
    uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1)
    // Pyramid face.
    pos.push(...t[j], ...t[i], ...apex)
    uv.push(0, 0.9, 1, 0.9, 0.5, 1)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.computeVertexNormals()
  return g
}

/**
 * Edge lines with an `aDraw` attribute (0 at the apex → 1 at the base), so a
 * shader can draw them on from the top down.
 */
export function edgeGeometry() {
  const pos: number[] = []
  const draw: number[] = []
  const d = (y: number) => 0.85 * (1 - y / M.apex)
  const seg = (a: number[], b: number[]) => {
    pos.push(...a, ...b)
    draw.push(d(a[1]), d(b[1]))
  }
  const b = corners(M.baseHalf, 0)
  const t = corners(M.topHalf, M.shoulder)
  const apex = [0, M.apex, 0]
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4
    seg(apex, t[i])
    seg(t[i], b[i])
    seg(t[i], t[j])
    seg(b[i], b[j])
  }
  // Plate ring, drawn last.
  const n = 96
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2
    const a1 = ((i + 1) / n) * Math.PI * 2
    const r = M.plateRadius
    pos.push(Math.cos(a0) * r, 0.045, Math.sin(a0) * r, Math.cos(a1) * r, 0.045, Math.sin(a1) * r)
    draw.push(0.85 + (i / n) * 0.15, 0.85 + ((i + 1) / n) * 0.15)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('aDraw', new Float32BufferAttribute(draw, 1))
  return g
}

/** Deterministic PRNG so the circuit pattern is identical on every load. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Hairline circuit traces on black, used as the facets' emissive map. */
export function circuitTexture(size = 512) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size * 2
  const g = c.getContext('2d')!
  g.fillStyle = '#000'
  g.fillRect(0, 0, c.width, c.height)
  g.strokeStyle = '#fff'
  g.fillStyle = '#fff'
  g.lineWidth = Math.max(1, size / 560)
  g.lineCap = 'square'
  const rand = rng(1729)
  const step = size / 24
  for (let k = 0; k < 14; k++) {
    let x = Math.round((0.12 + rand() * 0.76) * 24) * step
    let y = c.height - rand() * step * 6
    g.beginPath()
    g.moveTo(x, y)
    const len = 10 + Math.floor(rand() * 26)
    for (let s = 0; s < len; s++) {
      const r = rand()
      const dx = r < 0.2 ? -step : r < 0.4 ? step : 0
      x = Math.min(c.width - step, Math.max(step, x + dx))
      y -= step
      g.lineTo(x, y)
      if (y < step) break
    }
    g.stroke()
    g.beginPath()
    g.arc(x, y, g.lineWidth * 1.8, 0, Math.PI * 2)
    g.fill()
  }
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

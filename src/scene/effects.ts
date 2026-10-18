// Fog + glitch treatment for scene transitions. Pure in its inputs: the same
// progress always produces the same slices, so scrolling back replays exactly.
import { transitions } from './config'
import { clamp } from './timeline'

/** 0 outside a transition, rising to 1 at its centre. */
export function transitionAt(p: number): { amount: number; index: number } {
  for (let i = 0; i < transitions.length; i++) {
    const { at, span } = transitions[i]
    const d = Math.abs(p - at)
    if (d < span) return { amount: Math.sin((1 - d / span) * (Math.PI / 2)) ** 2, index: i }
  }
  return { amount: 0, index: -1 }
}

/** Small deterministic PRNG (mulberry32). */
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

/**
 * Composite `src` (the clean frame) onto `ctx` with a glitch + fog pass.
 * amount: 0..1. Slices change in steps so the glitch reads as digital, not smeared.
 */
export function drawTransition(
  ctx: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  w: number,
  h: number,
  amount: number,
  index: number,
) {
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.drawImage(src, 0, 0)

  // Luma ghosts: two offset copies, screened, like a lens doubling the frame.
  const ghost = amount * w * 0.01
  ctx.globalCompositeOperation = 'screen'
  ctx.globalAlpha = 0.22 * amount
  ctx.drawImage(src, ghost, 0)
  ctx.drawImage(src, -ghost, 0)

  // Horizontal slice displacement, re-seeded every ~1/7 of the transition.
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  const step = Math.floor(amount * 7)
  const rand = rng(index * 977 + step * 131 + 7)
  const slices = 2 + Math.floor(amount * 4)
  for (let i = 0; i < slices; i++) {
    if (rand() > amount) continue
    const sh = Math.max(2, Math.round(h * (0.006 + rand() * 0.03)))
    const sy = Math.round(rand() * (h - sh))
    const dx = Math.round((rand() - 0.5) * w * 0.05 * amount)
    ctx.drawImage(src, 0, sy, w, sh, dx, sy, w, sh)
  }

  // Fog dive: a cool grey veil that peaks with the transition.
  const fog = ctx.createLinearGradient(0, 0, 0, h)
  const a = clamp(amount, 0, 1)
  fog.addColorStop(0, `rgba(196, 200, 206, ${(0.12 * a).toFixed(3)})`)
  fog.addColorStop(0.55, `rgba(214, 217, 221, ${(0.42 * a).toFixed(3)})`)
  fog.addColorStop(1, `rgba(150, 154, 160, ${(0.22 * a).toFixed(3)})`)
  ctx.fillStyle = fog
  ctx.fillRect(0, 0, w, h)
}

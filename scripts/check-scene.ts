// Quick checks on the pure scroll maths. No test framework needed:
//   npm run check:scene      (Node 22.6+, uses --experimental-strip-types)
import assert from 'node:assert/strict'
import { cameraAt, desktopPath, portraitPath } from '../src/scene/three/cameraPath.ts'
import { chapterState } from '../src/scene/chapter.ts'
import { Follower } from '../src/scene/follow.ts'

// 1. The hero camera never stalls between its two ends and never enters the monolith's footprint.
for (const [name, path] of [['desktop', desktopPath], ['portrait', portraitPath]] as const) {
  const N = 1000
  const speeds: number[] = []
  let prev = cameraAt(path, 0).pos
  for (let i = 1; i <= N; i++) {
    const c = cameraAt(path, i / N)
    assert.ok(Math.hypot(c.pos[0], c.pos[2]) > 4, `${name}: camera too close to the monolith at p=${i / N}`)
    assert.ok(c.pos[1] > 1, `${name}: camera under the floor at p=${i / N}`)
    speeds.push(Math.hypot(c.pos[0] - prev[0], c.pos[1] - prev[1], c.pos[2] - prev[2]) * N)
    prev = c.pos
  }
  const mid = speeds.slice(40, N - 40)
  const mean = mid.reduce((a, b) => a + b) / mid.length
  assert.ok(Math.min(...mid) > 0.08 * mean, `${name}: camera nearly stops mid-path`)
  assert.deepEqual(cameraAt(path, 0.5), cameraAt(path, 0.5), `${name}: not deterministic`)
}

// 2. Chapter state is a pure function of scroll position, always in range, and never leaves the stage empty.
const vh = 800
const m = { top: 3000, vh, ref: 0.5, items: [0, 1, 2].map((i) => ({ top: 3000 + vh + i * vh, h: vh })) }
for (let y = 2000; y < 6500; y += 7) {
  const s = chapterState(y, m)
  assert.deepEqual(s, chapterState(y, m))
  for (const v of [s.intro, s.shift, ...s.figures.flatMap((f) => [f.vis, f.build])]) assert.ok(v >= 0 && v <= 1)
  if (y > m.items[0].top && y < m.items[2].top + vh / 2) {
    assert.ok(Math.max(...s.figures.map((f) => f.vis)) > 0.4, `stage empty at y=${y}`)
  }
}

// 3. The follower always lands exactly on the target and takes big jumps at once.
const f = new Follower(90, 0, 0.0004, 0.2)
f.target = 0.1
let frames = 0
while (f.step(16.7)) assert.ok(++frames < 200, 'follower never settled')
assert.equal(f.value, 0.1)
f.target = 0.9
f.step(16.7)
assert.equal(f.value, 0.9)

console.log('scene checks passed')

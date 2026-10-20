// One tiny, frame-rate-independent follower used to take the "steps" out of
// mouse-wheel scrolling. It is NOT a scroll library: native scroll stays in
// charge, and the follower always converges exactly on the real scroll
// position (so the same scroll position always settles on the same picture).
//
// Set `tauMs` to 0 to switch it off (touch screens already scroll with
// momentum, and reduced-motion users never get this code at all).

export class Follower {
  value: number
  target: number
  private tauMs: number
  /** Distance at which the follower stops and sits exactly on the target. */
  private epsilon: number
  /** A jump bigger than this (anchor links, fast jumps, reload) is taken at once, not eased. */
  private jump: number

  constructor(tauMs: number, initial: number, epsilon: number, jump: number) {
    this.tauMs = tauMs
    this.value = initial
    this.target = initial
    this.epsilon = epsilon
    this.jump = jump
  }

  /** Move both ends to `v` immediately (resize, refresh, re-entering the viewport). */
  snap(v: number) {
    this.value = v
    this.target = v
  }

  /** Advance by `dtMs`. Returns true while it is still travelling. */
  step(dtMs: number) {
    const gap = this.target - this.value
    if (this.tauMs <= 0 || Math.abs(gap) > this.jump || Math.abs(gap) < this.epsilon) {
      this.value = this.target
      return false
    }
    // Clamp dt so a background-tab pause doesn't produce a huge first step.
    this.value += gap * (1 - Math.exp(-Math.min(dtMs, 100) / this.tauMs))
    return true
  }
}

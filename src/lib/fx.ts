/**
 * Shared "juice" state for the shonen effects. Written by the DOM ticker in App
 * (which knows scroll speed and story beats), read by the 3D scene every frame.
 * All values are 0..1 and decay on their own.
 */
export const fx = {
  /** smoothed scroll speed (p per second), raw */
  vel: 0,
  /** 0..1 speed factor used by speed lines, smears and dust */
  speed: 0,
  /** aura power level 0..1 */
  power: 0,
  /** camera trauma; shake amount = trauma^2 */
  trauma: 0,
  /** white impact flash */
  flash: 0,
  /** chromatic aberration kick */
  ca: 0,
  /** per-stop burst progress (1 = just hit, decays to 0) */
  burst: [0, 0, 0, 0, 0, 0] as number[],
  /** set once at load from the media query */
  reduced: false,
}

/** An impact: flash + shake + CA. Ignored with reduced motion. */
export function impact(strength: number) {
  if (fx.reduced) return
  fx.trauma = Math.min(1, fx.trauma + strength)
  fx.flash = Math.max(fx.flash, strength)
  fx.ca = Math.max(fx.ca, strength)
}

/** Frame-rate independent decay helper. */
export function decay(v: number, perSecond: number, dt: number) {
  return v * Math.pow(perSecond, dt)
}

/** "On twos": quantise a time value to n fps (anime limited-animation timing). */
export const onTwos = (t: number, fps = 12) => Math.floor(t * fps) / fps

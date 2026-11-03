import { CatmullRomCurve3, MathUtils, Vector3 } from 'three'
import { COMPANIES } from './data'

/** Shared scroll state. `p` is written by the GSAP ScrollTrigger timeline (0..1). */
export const scrollState = { p: 0, smooth: 0, reduced: false }

// ---- Beat boundaries (in master progress p) ----
export const BEAT = {
  fogEnd: 0.12, // Beat 1: fog clears 0 → fogEnd
  sitEnd: 0.125, // child sits until here
  mountEnd: 0.175, // turns round, bike appears, camera cranes behind
  rideStart: 0.175, // Beat 2/3: riding
  rideEnd: 0.72, // Beat 3 ends; skills sections scroll in after this
  outroEnd: 0.95,
}

/** Rider path through the world (y = 0 ground). Travels toward -Z. */
export const riderPath = new CatmullRomCurve3(
  [
    new Vector3(0, 0, 0),
    new Vector3(0, 0, -8),
    new Vector3(3, 0, -22),
    new Vector3(-2.5, 0, -38),
    new Vector3(2.5, 0, -54),
    new Vector3(-3, 0, -70),
    new Vector3(1.5, 0, -86),
    new Vector3(-1, 0, -102),
    new Vector3(0, 0, -116),
  ],
  false,
  'catmullrom',
  0.5,
)
export const PATH_LENGTH = riderPath.getLength()

/** Camera rail: the rider path lifted up, back and to the side. */
const CAM_OFFSET = new Vector3(1.7, 1.55, 4.6)
export const cameraRail = new CatmullRomCurve3(
  riderPath.points.map((v) => v.clone().add(CAM_OFFSET)),
  false,
  'catmullrom',
  0.5,
)

/** Intro camera: close, facing the seated child, then craning up and round behind him. */
export const introCam = new CatmullRomCurve3([
  new Vector3(0, 1.0, 2.7),
  new Vector3(0.3, 1.05, 2.45),
  new Vector3(2.4, 1.5, 2.6),
  new Vector3(2.6, 1.6, 4.4),
  cameraRail.getPointAt(0),
])

/** Outro crane: lifts out of the rail into a high overview of the whole route. */
export const outroCam = new CatmullRomCurve3([
  cameraRail.getPointAt(1),
  new Vector3(6, 7, -100),
  new Vector3(14, 22, -78),
  new Vector3(18, 34, -50),
])

/** Where along the rider path (0..1) each company stop sits. */
export const STOP_T = COMPANIES.map((_, i) => 0.12 + i * 0.15)

export const riderT = (p: number) =>
  MathUtils.clamp((p - BEAT.rideStart) / (BEAT.rideEnd - BEAT.rideStart), 0, 1)

/** Master progress at which the rider passes stop i. */
export const stopP = (i: number) => BEAT.rideStart + STOP_T[i] * (BEAT.rideEnd - BEAT.rideStart)

export const smooth01 = (e0: number, e1: number, x: number) => {
  const t = MathUtils.clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

/** Visibility 0..1 of a window centred on c with half-width w and fade f. */
export const windowAt = (x: number, c: number, w: number, f: number) =>
  smooth01(c - w - f, c - w, x) * (1 - smooth01(c + w, c + w + f, x))

const tmp = new Vector3()
/** Landmark world position for stop i: beside the path, alternating sides. */
export function landmarkPosition(i: number, out = new Vector3()) {
  const t = STOP_T[i]
  const p = riderPath.getPointAt(t)
  const tan = riderPath.getTangentAt(t, tmp)
  const side = i % 2 === 0 ? -1 : 1
  // perpendicular on the ground plane
  out.set(-tan.z, 0, tan.x).normalize().multiplyScalar(6.6 * side).add(p)
  out.addScaledVector(tan, 1.5)
  return out
}

/** Activation (0..1) of company stop i at the current scroll. */
export const stopActivation = (i: number, p: number) => windowAt(p, stopP(i), 0.022, 0.03)

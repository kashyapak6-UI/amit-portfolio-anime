import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { DirectionalLight, Object3D, PerspectiveCamera, PointLight, Vector3 } from 'three'
import { fx } from '../lib/fx'
import { COMPANIES } from '../lib/data'
import { SUN_DIR } from './World'
import {
  BEAT, cameraRail, introCam, landmarkPosition, outroCam, riderPath, riderT, scrollState, smooth01, stopActivation,
} from '../lib/timeline'

const camPos = new Vector3()
const look = new Vector3()
const riderLook = new Vector3()
const tan = new Vector3()
const OVERVIEW = new Vector3(0, 0, -62)
const HEAD = new Vector3(0, 0.95, 0)

/**
 * Scroll progress → camera. Three CatmullRom rails stitched end to end:
 * intro (face to face with the child, then craning behind him), the ride rail,
 * and an outro crane into a high overview.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const key = useRef<DirectionalLight>(null!)
  const keyTarget = useMemo(() => new Object3D(), [])
  const stops = useMemo(() => COMPANIES.map((_, i) => landmarkPosition(i).add(new Vector3(0, 1.8, 0))), [])
  const smoothLook = useRef(new Vector3(0, 0.9, 0))
  const auraLight = useRef<PointLight>(null!)
  const roll = useRef(0)

  useFrame((state, dt) => {
    const s = scrollState.p
    const reduced = scrollState.reduced
    const t = riderT(s)
    const rider = riderPath.getPointAt(t)
    riderPath.getTangentAt(Math.max(t, 0.001), tan)
    riderLook.copy(rider).addScaledVector(tan, 3.5).add(new Vector3(0, 0.8, 0))

    if (s < BEAT.rideStart) {
      // Beat 1 + mount: introCam, slow push-in while the fog clears, then the crane
      const a = s < BEAT.sitEnd ? (s / BEAT.sitEnd) * 0.14 : 0.14 + 0.86 * smooth01(BEAT.sitEnd, BEAT.rideStart, s)
      introCam.getPointAt(a, camPos)
      const m = smooth01(BEAT.sitEnd, BEAT.rideStart, s)
      look.copy(HEAD).lerp(riderLook, m)
    } else if (s <= BEAT.rideEnd) {
      cameraRail.getPointAt(t, camPos)
      // portrait: tuck the camera in behind the rider so he stays in a narrow frame
      if (size.width / size.height < 0.8) camPos.x -= 1.25 * smooth01(BEAT.rideStart, BEAT.rideStart + 0.03, s)
      look.copy(riderLook)
      // glance toward whichever company stop is active
      for (let i = 0; i < stops.length; i++) {
        const w = stopActivation(i, s) * (size.width / size.height < 0.8 ? 0.14 : 0.32)
        if (w > 0) look.lerp(stops[i], w)
      }
    } else {
      const o = smooth01(BEAT.rideEnd, BEAT.outroEnd, s)
      outroCam.getPointAt(o, camPos)
      look.copy(riderLook).lerp(OVERVIEW, o)
    }

    if (!reduced) {
      const tt = state.clock.elapsedTime
      camPos.x += Math.sin(tt * 0.7) * 0.025
      camPos.y += Math.sin(tt * 0.9 + 1.3) * 0.02
    }
    // camera shake: trauma^2, on twos-ish noise so it reads as hand-drawn shake
    const shake = reduced ? 0 : fx.trauma * fx.trauma
    if (shake > 0.0005) {
      const tq = Math.floor(state.clock.elapsedTime * 30)
      const n = (k: number) => Math.sin(tq * 12.9898 + k * 78.233) * 43758.5453 % 1
      camPos.x += n(1) * 0.12 * shake
      camPos.y += n(2) * 0.09 * shake
    }
    camera.position.copy(camPos)
    const k = reduced ? 1 : 1 - Math.pow(0.0005, dt)
    smoothLook.current.lerp(look, k)
    camera.lookAt(smoothLook.current)

    // dutch angle + punch-in at each company stop (shonen staging), plus the power-up rumble
    let dutch = 0
    let punch = 0
    const portrait = size.width / size.height < 0.8
    for (let i = 0; i < stops.length; i++) {
      const a = stopActivation(i, s)
      dutch += a * (i % 2 ? 1 : -1) * (portrait ? 0.035 : 0.07)
      punch += a * 3 + fx.burst[i] * fx.burst[i] * 5
    }
    if (reduced) punch = 0
    roll.current += (dutch - roll.current) * (reduced ? 1 : 1 - Math.pow(0.02, dt))
    camera.rotateZ(roll.current + (reduced ? 0 : (shake > 0.0005 ? Math.sin(state.clock.elapsedTime * 47) * 0.02 * shake : 0)))

    // Portrait screens get a wider lens so the stops stay in frame
    const fov = (portrait ? 64 : 42) - punch - (reduced ? 0 : fx.power * 2 * (1 - smooth01(BEAT.rideStart, BEAT.rideStart + 0.02, s)))
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }

    // Sun key follows the rider so its shadow map stays tight (direction = SUN_DIR)
    key.current.position.set(rider.x + SUN_DIR.x * 20, SUN_DIR.y * 20, rider.z + SUN_DIR.z * 20)
    keyTarget.position.copy(rider)
    keyTarget.updateMatrixWorld()

    // the aura lights its surroundings
    auraLight.current.position.set(rider.x, 1.1, rider.z)
    auraLight.current.intensity = fx.power * 2.2 + fx.flash * 6
  })

  return (
    <>
      <primitive object={keyTarget} />
      <directionalLight
        ref={key}
        target={keyTarget}
        color="#ffe6b8"
        intensity={2.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-radius={4}
        shadow-normalBias={0.02}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0008}
      />
      {/* warm rim from behind the child in the opening shot */}
      <pointLight position={[-1.6, 1.8, -1.8]} color="#ffd2a0" intensity={2.5} distance={7} decay={1.6} />
      <pointLight ref={auraLight} color="#ffc23a" intensity={0} distance={6} decay={1.4} />
    </>
  )
}

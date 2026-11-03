import { Ink } from './Ink'
import { Aura } from './Aura'
import { fx } from '../lib/fx'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, MathUtils, MeshBasicMaterial, MeshToonMaterial, Vector3 } from 'three'
import { AURA_RIM, toon, withRim } from './toon'
import { BEAT, PATH_LENGTH, riderPath, riderT, scrollState, smooth01 } from '../lib/timeline'
import { Rod } from './parts'

const WHEEL_R = 0.3

/** Clumped anime hair: cones pointing out from the crown, a fringe over the brow, tufts at the back. */
const HAIR_SPIKES: { p: [number, number, number]; r: [number, number, number]; w: number; l: number }[] = [
  // fringe (front is -Z), pointing down/forward over the forehead
  { p: [-0.13, 0.4, -0.2], r: [-2.3, 0, 0.35], w: 0.07, l: 0.2 },
  { p: [-0.04, 0.42, -0.22], r: [-2.45, 0, 0.1], w: 0.075, l: 0.22 },
  { p: [0.06, 0.42, -0.22], r: [-2.45, 0, -0.15], w: 0.075, l: 0.21 },
  { p: [0.15, 0.39, -0.19], r: [-2.3, 0, -0.4], w: 0.065, l: 0.19 },
  // crown spikes
  { p: [0, 0.54, -0.04], r: [-0.5, 0, 0], w: 0.09, l: 0.22 },
  { p: [-0.13, 0.5, 0.02], r: [-0.2, 0, 0.7], w: 0.085, l: 0.22 },
  { p: [0.13, 0.5, 0.02], r: [-0.2, 0, -0.7], w: 0.085, l: 0.22 },
  { p: [0, 0.5, 0.13], r: [0.7, 0, 0], w: 0.09, l: 0.22 },
  // sides + back tufts
  { p: [-0.24, 0.33, 0.06], r: [0.3, 0, 1.9], w: 0.07, l: 0.18 },
  { p: [0.24, 0.33, 0.06], r: [0.3, 0, -1.9], w: 0.07, l: 0.18 },
  { p: [-0.1, 0.3, 0.24], r: [2.1, 0, 0.4], w: 0.08, l: 0.2 },
  { p: [0.1, 0.3, 0.24], r: [2.1, 0, -0.4], w: 0.08, l: 0.2 },
  { p: [0, 0.4, 0.24], r: [1.6, 0, 0], w: 0.09, l: 0.22 },
]
const tan = new Vector3()

/**
 * Stylised child + bicycle built from primitives (placeholder for a GLB later).
 * Model forward is -Z. While seated the whole rig is yawed by PI to face the camera.
 */
export function Rider({ mobile = false }: { mobile?: boolean }) {
  const aura = useRef<Group>(null!)
  const root = useRef<Group>(null!)
  const body = useRef<Group>(null!)
  const torso = useRef<Group>(null!)
  const head = useRef<Group>(null!)
  const armL = useRef<Group>(null!)
  const armR = useRef<Group>(null!)
  const hipL = useRef<Group>(null!)
  const hipR = useRef<Group>(null!)
  const kneeL = useRef<Group>(null!)
  const kneeR = useRef<Group>(null!)
  const bike = useRef<Group>(null!)
  const wheelF = useRef<Group>(null!)
  const wheelB = useRef<Group>(null!)
  const crank = useRef<Group>(null!)
  const rock = useRef<Group>(null!)

  const m = useMemo(
    () => ({
      skin: withRim(toon('#ffd3b0', { emissive: '#f2a47e', emissiveIntensity: 0.28 })),
      hoodie: withRim(toon('#f2412c')),
      pants: withRim(toon('#2c49b0')),
      shoe: withRim(toon('#ffffff')),
      hair: withRim(toon('#1d1838'), '#8fb8ff', 0.6, 0.5),
      eyeWhite: new MeshBasicMaterial({ color: '#ffffff' }),
      iris: new MeshBasicMaterial({ color: '#3a2a6e' }),
      pupil: new MeshBasicMaterial({ color: '#120f1f' }),
      shine: new MeshBasicMaterial({ color: '#ffffff' }),
      blush: new MeshBasicMaterial({ color: '#ff8f9a', transparent: true, opacity: 0.55 }),
      mouth: new MeshBasicMaterial({ color: '#7a2a35' }),
      frame: withRim(toon('#2bb5a6')),
      tyre: toon('#2b2738'),
      spoke: toon('#d9dbe6'),
      lamp: new MeshBasicMaterial({ color: '#fff6d8', toneMapped: false }),
      rock: toon('#b9b2c9', { steps: 4 }),
    }),
    [],
  )

  useFrame((state) => {
    const s = scrollState.p
    const time = scrollState.reduced ? 0 : state.clock.elapsedTime
    const t = riderT(s)
    const mount = smooth01(BEAT.sitEnd, BEAT.mountEnd, s)
    const dist = t * PATH_LENGTH

    // Position + heading along the path
    const pos = riderPath.getPointAt(t)
    riderPath.getTangentAt(Math.max(t, 0.001), tan)
    const yawPath = Math.atan2(-tan.x, -tan.z)
    root.current.position.copy(pos)
    root.current.rotation.y = MathUtils.lerp(Math.PI, yawPath, mount)

    // Bike grows in under him during the mount
    const b = Math.max(0.0001, mount < 1 ? Math.sin((mount * Math.PI) / 2) * (1 + 0.08 * Math.sin(mount * Math.PI)) : 1)
    bike.current.scale.setScalar(b)
    bike.current.visible = mount > 0.01
    rock.current.scale.setScalar(Math.max(0.0001, 1 - mount))
    rock.current.visible = mount < 0.99

    // Wheels + cranks are driven by distance travelled (plus a slow idle roll)
    wheelF.current.rotation.x = -dist / WHEEL_R
    wheelB.current.rotation.x = -dist / WHEEL_R
    const crankA = -dist / WHEEL_R / 1.8
    crank.current.rotation.x = crankA

    // Body: seated on rock (hip 0.4) → saddle (hip 0.72, behind the crank)
    body.current.position.set(0, MathUtils.lerp(0.4, 0.74, mount), MathUtils.lerp(0, 0.2, mount))
    const breathe = Math.sin(time * 1.6) * 0.015
    torso.current.rotation.x = MathUtils.lerp(0.06 + breathe, -0.38, mount)
    // head: looks at the viewer while seated, then up the road
    head.current.rotation.x = MathUtils.lerp(-0.12 + Math.sin(time * 0.7) * 0.03, 0.3, mount)
    head.current.rotation.y = MathUtils.lerp(Math.sin(time * 0.5) * 0.08, 0, mount)

    // Arms: right hand wipes the fog off the "screen" during beat 1
    const wipe = 1 - smooth01(BEAT.fogEnd * 0.85, BEAT.fogEnd + 0.01, s)
    const wipeSwing = Math.sin(s * 140) * 0.55 * wipe
    armR.current.rotation.set(MathUtils.lerp(MathUtils.lerp(0.55, 1.95, wipe), 1.25, mount), 0, MathUtils.lerp(-0.1 + wipeSwing, 0.12, mount))
    armL.current.rotation.set(MathUtils.lerp(0.6, 1.25, mount), 0, MathUtils.lerp(0.12, -0.12, mount))

    // Legs: thighs forward while seated; pedal cycle while riding
    const pedal = (phase: number) => {
      const c = crankA + phase
      return { hip: 1.05 + 0.42 * Math.sin(c), knee: -(0.85 + 0.55 * (0.5 + 0.5 * Math.cos(c))) }
    }
    const pl = pedal(0)
    const pr = pedal(Math.PI)
    hipL.current.rotation.x = MathUtils.lerp(1.5, pl.hip, mount)
    hipR.current.rotation.x = MathUtils.lerp(1.45, pr.hip, mount)
    kneeL.current.rotation.x = MathUtils.lerp(-1.45, pl.knee, mount)
    kneeR.current.rotation.x = MathUtils.lerp(-1.5, pr.knee, mount)
    hipL.current.rotation.z = MathUtils.lerp(0.08, 0.02, mount)
    hipR.current.rotation.z = MathUtils.lerp(-0.08, -0.02, mount)

    // tiny bob while riding
    if (!scrollState.reduced) root.current.position.y += Math.abs(Math.sin(crankA)) * 0.012 * mount

    // smear: stretch along travel and squash a touch when scrolling fast (anime smear frame)
    const sm = scrollState.reduced ? 0 : Math.round(fx.speed * mount * 6) / 6
    root.current.scale.set(1 - sm * 0.05, 1 - sm * 0.04, 1 + sm * 0.18)

    // aura follows the body: around the rock while seated, around the saddle while riding
    aura.current.position.set(0, mount * 0.28, mount * 0.12)
    aura.current.scale.set(1, 1, 1 + mount * 0.45)
    AURA_RIM.value = fx.power
  })

  const ink = (t = 4) => <Ink thickness={t} />
  const limb = (len: number, r: number, mat: MeshToonMaterial) => (
    <mesh position={[0, -len / 2, 0]} material={mat} castShadow>
      <capsuleGeometry args={[r, len, 4, 10]} />
      {ink()}
    </mesh>
  )

  const spokes = useMemo(() => Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI), [])
  const Wheel = ({ z, r }: { z: number; r: React.RefObject<Group> }) => (
    <group position={[0, WHEEL_R, z]}>
      <group ref={r}>
        <mesh rotation={[0, Math.PI / 2, 0]} material={m.tyre} castShadow>
          <torusGeometry args={[WHEEL_R, 0.032, 8, 32]} />
          {ink(3)}
        </mesh>
        {spokes.map((a) => (
          <mesh key={a} rotation={[a, 0, 0]} material={m.spoke}>
            <boxGeometry args={[0.008, WHEEL_R * 2, 0.008]} />
          </mesh>
        ))}
        <mesh rotation={[0, 0, Math.PI / 2]} material={m.frame}>
          <cylinderGeometry args={[0.035, 0.035, 0.06, 10]} />
        </mesh>
      </group>
    </group>
  )

  return (
    <>
      {/* the rock he sits on, left behind at the start */}
      <group ref={rock}>
        <mesh position={[0, 0.17, 0.02]} scale={[1.05, 0.62, 0.9]} material={m.rock} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.36, 1]} />
          {ink(4.2)}
        </mesh>
      </group>

      <group ref={root}>
        <group ref={aura}><Aura mobile={mobile} /></group>
        {/* ---------- bicycle ---------- */}
        <group ref={bike}>
          <Wheel z={0.52} r={wheelB} />
          <Wheel z={-0.52} r={wheelF} />
          <Rod a={[0, WHEEL_R, 0.52]} b={[0, 0.3, 0]} r={0.022}><primitive object={m.frame} attach="material" /></Rod>
          <Rod a={[0, 0.3, 0]} b={[0, 0.66, 0.2]} r={0.026}><primitive object={m.frame} attach="material" /></Rod>
          <Rod a={[0, 0.3, 0]} b={[0, 0.66, -0.36]} r={0.028}><primitive object={m.frame} attach="material" /></Rod>
          <Rod a={[0, 0.62, 0.17]} b={[0, 0.64, -0.36]} r={0.024}><primitive object={m.frame} attach="material" /></Rod>
          <Rod a={[0, WHEEL_R, 0.52]} b={[0, 0.62, 0.17]} r={0.018}><primitive object={m.frame} attach="material" /></Rod>
          <Rod a={[0, WHEEL_R, -0.52]} b={[0, 0.84, -0.4]} r={0.024}><primitive object={m.frame} attach="material" /></Rod>
          {/* handlebar */}
          <Rod a={[-0.24, 0.86, -0.38]} b={[0.24, 0.86, -0.38]} r={0.02}><primitive object={m.tyre} attach="material" /></Rod>
          {/* saddle */}
          <mesh position={[0, 0.69, 0.22]} material={m.tyre} castShadow>
            <boxGeometry args={[0.13, 0.05, 0.24]} />
          </mesh>
          {/* lamp */}
          <mesh position={[0, 0.8, -0.47]} material={m.lamp}>
            <sphereGeometry args={[0.04, 12, 8]} />
          </mesh>
          {/* crank + pedals */}
          <group ref={crank} position={[0, 0.3, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} material={m.frame}>
              <cylinderGeometry args={[0.06, 0.06, 0.04, 14]} />
            </mesh>
            <mesh position={[0.07, 0.07, 0]} material={m.spoke}><boxGeometry args={[0.02, 0.15, 0.02]} /></mesh>
            <mesh position={[-0.07, -0.07, 0]} material={m.spoke}><boxGeometry args={[0.02, 0.15, 0.02]} /></mesh>
          </group>
        </group>

        {/* ---------- child ---------- */}
        <group ref={body}>
          {/* hips */}
          <mesh position={[0, 0, 0]} material={m.pants} castShadow>
            <boxGeometry args={[0.28, 0.12, 0.18]} />
          </mesh>
          {/* legs */}
          {([[-0.08, hipL, kneeL], [0.08, hipR, kneeR]] as const).map(([x, hip, knee]) => (
            <group key={x} ref={hip} position={[x, 0, 0]}>
              {limb(0.2, 0.06, m.pants)}
              <group ref={knee} position={[0, -0.27, 0]}>
                {limb(0.18, 0.052, m.pants)}
                <mesh position={[0, -0.26, -0.04]} material={m.shoe} castShadow>
                  <boxGeometry args={[0.1, 0.07, 0.17]} />
                  {ink(3)}
                </mesh>
              </group>
            </group>
          ))}
          {/* torso pivots at the hips */}
          <group ref={torso}>
            <mesh position={[0, 0.19, 0]} material={m.hoodie} castShadow>
              <capsuleGeometry args={[0.14, 0.18, 4, 12]} />
              {ink()}
            </mesh>
            {/* hood */}
            <mesh position={[0, 0.36, 0.09]} scale={[1, 0.5, 0.8]} material={m.hoodie}>
              <sphereGeometry args={[0.15, 10, 8]} />
            </mesh>
            {([[-0.2, armL], [0.2, armR]] as const).map(([x, arm]) => (
              <group key={x} ref={arm} position={[x, 0.35, 0]}>
                {limb(0.2, 0.05, m.hoodie)}
                <mesh position={[0, -0.32, 0]} material={m.skin} castShadow>
                  <sphereGeometry args={[0.052, 10, 8]} />
                </mesh>
              </group>
            ))}
            <group ref={head} position={[0, 0.44, 0]}>
              {/* big round anime head */}
              <mesh position={[0, 0.25, 0]} scale={[1, 0.96, 0.96]} material={m.skin} castShadow>
                <sphereGeometry args={[0.27, 28, 22]} />
                {ink(5)}
              </mesh>
              {/* eyes (front is -Z): tall whites, big violet irises, pupils, two highlights each */}
              {[-1, 1].map((sx) => (
                <group key={sx} position={[sx * 0.095, 0.22, -0.235]} rotation={[0, sx * 0.32, 0]}>
                  <mesh scale={[1, 1.35, 0.35]} material={m.eyeWhite}><sphereGeometry args={[0.058, 16, 12]} /></mesh>
                  <mesh position={[0, -0.006, -0.012]} scale={[1, 1.3, 0.35]} material={m.iris}><sphereGeometry args={[0.045, 16, 12]} /></mesh>
                  <mesh position={[0, -0.01, -0.02]} scale={[1, 1.3, 0.3]} material={m.pupil}><sphereGeometry args={[0.024, 12, 10]} /></mesh>
                  <mesh position={[sx * -0.016, 0.028, -0.028]} material={m.shine}><sphereGeometry args={[0.014, 8, 6]} /></mesh>
                  <mesh position={[sx * 0.014, -0.03, -0.026]} material={m.shine}><sphereGeometry args={[0.007, 8, 6]} /></mesh>
                  {/* upper lash line */}
                  <mesh position={[0, 0.07, -0.006]} rotation={[0, 0, sx * -0.12]} material={m.pupil}><boxGeometry args={[0.12, 0.014, 0.02]} /></mesh>
                </group>
              ))}
              {/* blush + small mouth */}
              {[-1, 1].map((sx) => (
                <mesh key={sx} position={[sx * 0.15, 0.12, -0.22]} rotation={[0, sx * 0.55, 0]} scale={[1.4, 0.6, 0.2]} material={m.blush}><sphereGeometry args={[0.03, 10, 8]} /></mesh>
              ))}
              <mesh position={[0, 0.08, -0.258]} rotation={[0, 0, Math.PI / 2]} material={m.mouth}><capsuleGeometry args={[0.008, 0.035, 2, 6]} /></mesh>
              {/* hair: skull cap + spiky clumps (cones) */}
              <mesh position={[0, 0.3, 0.03]} rotation={[0.25, 0, 0]} material={m.hair} castShadow>
                <sphereGeometry args={[0.285, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                {ink(3)}
              </mesh>
              {HAIR_SPIKES.map((h, i) => (
                <mesh key={i} position={h.p} rotation={h.r} material={m.hair} castShadow>
                  <coneGeometry args={[h.w, h.l, 5]} />
                  {ink(2.6)}
                </mesh>
              ))}
              {/* ears */}
              <mesh position={[-0.265, 0.21, 0.02]} scale={[0.5, 1, 0.8]} material={m.skin}><sphereGeometry args={[0.05, 10, 8]} /></mesh>
              <mesh position={[0.265, 0.21, 0.02]} scale={[0.5, 1, 0.8]} material={m.skin}><sphereGeometry args={[0.05, 10, 8]} /></mesh>
            </group>
          </group>
        </group>

        {/* bike lamp throws a warm cone up the road */}
        <BikeLamp />
      </group>
    </>
  )
}

function BikeLamp() {
  const light = useRef<import('three').SpotLight>(null!)
  useFrame(() => {
    light.current.intensity = 4 * smooth01(BEAT.sitEnd + 0.02, BEAT.mountEnd, scrollState.p)
  })
  const target = useMemo(() => {
    const o = new Group()
    o.position.set(0, 0, -6)
    return o
  }, [])
  return (
    <>
      <primitive object={target} />
      <spotLight ref={light} position={[0, 0.82, -0.5]} target={target} angle={0.5} penumbra={0.7} intensity={18} distance={14} decay={1.6} color="#ffd9a0" />
    </>
  )
}

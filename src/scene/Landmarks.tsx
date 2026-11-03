import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { Ink } from './Ink'
import { AdditiveBlending, Color, DoubleSide, Group, MeshToonMaterial, PointLight, ShaderMaterial, Vector3 } from 'three'
import { fx } from '../lib/fx'
import { toon } from './toon'
import { COMPANIES } from '../lib/data'
import type { Company } from '../lib/data'
import { landmarkPosition, riderPath, scrollState, STOP_T, stopActivation } from '../lib/timeline'


type Mats = { stone: MeshToonMaterial; dark: MeshToonMaterial; accent: MeshToonMaterial; glass: MeshToonMaterial }

function Plinth({ m }: { m: Mats }) {
  return (
    <group>
      <mesh position={[0, 0.12, 0]} material={m.stone} receiveShadow castShadow>
        <cylinderGeometry args={[1.7, 1.85, 0.24, 6]} />
      <Ink thickness={3.2} /></mesh>
      <mesh position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.accent}>
        <torusGeometry args={[1.45, 0.025, 6, 6]} />
      </mesh>
    </group>
  )
}

function Broadcast({ m, spin }: { m: Mats; spin: React.RefObject<Group> }) {
  return (
    <group>
      <mesh position={[0, 2.2, 0]} material={m.dark} castShadow><cylinderGeometry args={[0.12, 0.3, 4, 8]} /><Ink thickness={3.2} /></mesh>
      <group ref={spin} position={[0, 4.35, 0]}>
        <mesh material={m.accent}><icosahedronGeometry args={[0.32, 0]} /><Ink thickness={3.2} /></mesh>
        {[0.7, 1.1, 1.5].map((r, i) => (
          <mesh key={r} rotation={[Math.PI / 2 + i * 0.25, i * 0.6, 0]} material={m.accent}>
            <torusGeometry args={[r, 0.022, 6, 48]} />
          </mesh>
        ))}
      </group>
      {[1.0, 2.0, 3.0].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={m.stone}><boxGeometry args={[0.9 - y * 0.15, 0.06, 0.06]} /><Ink thickness={3.2} /></mesh>
      ))}
    </group>
  )
}

function Robot({ m, spin }: { m: Mats; spin: React.RefObject<Group> }) {
  const teeth = useMemo(() => Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2), [])
  return (
    <group>
      <RoundedBox args={[1.5, 1.6, 1.1]} radius={0.12} position={[0, 1.1, 0]} material={m.dark} castShadow><Ink thickness={3.2} /></RoundedBox>
      <RoundedBox args={[1.1, 0.85, 0.9]} radius={0.15} position={[0, 2.35, 0]} material={m.stone} castShadow><Ink thickness={3.2} /></RoundedBox>
      <mesh position={[-0.25, 2.4, 0.46]} material={m.accent}><boxGeometry args={[0.22, 0.12, 0.02]} /></mesh>
      <mesh position={[0.25, 2.4, 0.46]} material={m.accent}><boxGeometry args={[0.22, 0.12, 0.02]} /></mesh>
      <mesh position={[0, 3.0, 0]} material={m.dark}><cylinderGeometry args={[0.03, 0.03, 0.5, 6]} /><Ink thickness={3.2} /></mesh>
      <mesh position={[0, 3.28, 0]} material={m.accent}><sphereGeometry args={[0.08, 10, 8]} /><Ink thickness={3.2} /></mesh>
      <group ref={spin} position={[1.15, 1.6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh material={m.accent}><torusGeometry args={[0.42, 0.08, 6, 20]} /></mesh>
        {teeth.map((a) => (
          <mesh key={a} position={[Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0]} rotation={[0, 0, a]} material={m.accent}>
            <boxGeometry args={[0.16, 0.12, 0.14]} />
          <Ink thickness={3.2} /></mesh>
        ))}
      </group>
    </group>
  )
}

function Servers({ m, spin }: { m: Mats; spin: React.RefObject<Group> }) {
  return (
    <group ref={spin}>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} position={[0, 0.55 + i * 0.68, 0]} rotation={[0, i * 0.18, 0]}>
          <RoundedBox args={[1.6, 0.56, 1.1]} radius={0.05} material={m.dark} castShadow><Ink thickness={3.2} /></RoundedBox>
          <mesh position={[0, 0.06, 0.56]} material={m.accent}><boxGeometry args={[1.2, 0.04, 0.01]} /><Ink thickness={3.2} /></mesh>
          <mesh position={[-0.55, -0.1, 0.56]} material={m.accent}><boxGeometry args={[0.08, 0.08, 0.01]} /></mesh>
        </group>
      ))}
    </group>
  )
}

function Screens({ m, spin, color }: { m: Mats; spin: React.RefObject<Group>; color: string }) {
  // 13 frames: a nod to 12–13 creatives a day
  const frames = useMemo(() => {
    const base = new Color(color)
    return Array.from({ length: 13 }, (_, i) => {
      const a = (i / 13) * Math.PI * 2
      const c = base.clone().offsetHSL((i % 4) * 0.04 - 0.06, 0, (i % 3) * 0.05 - 0.05)
      return { a, y: 1.4 + Math.sin(i * 1.7) * 0.9, c: `#${c.getHexString()}` }
    })
  }, [color])
  return (
    <group>
      <mesh position={[0, 1.4, 0]} material={m.dark} castShadow><cylinderGeometry args={[0.18, 0.18, 2.8, 8]} /><Ink thickness={3.2} /></mesh>
      <group ref={spin}>
        {frames.map((f, i) => (
          <group key={i} position={[Math.cos(f.a) * 1.35, f.y, Math.sin(f.a) * 1.35]} rotation={[0, -f.a + Math.PI / 2, 0]}>
            <mesh material={m.dark}><boxGeometry args={[0.62, 0.62, 0.03]} /></mesh>
            <mesh position={[0, 0, 0.02]}>
              <planeGeometry args={[0.54, 0.54]} />
              <meshToonMaterial color={f.c} emissive={f.c} emissiveIntensity={0.3} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

function Star({ m, spin }: { m: Mats; spin: React.RefObject<Group> }) {
  return (
    <group>
      <mesh position={[0, 1.3, 0]} material={m.stone} castShadow><cylinderGeometry args={[0.35, 0.55, 2.6, 6]} /><Ink thickness={3.2} /></mesh>
      <group ref={spin} position={[0, 3.3, 0]}>
        <mesh material={m.accent} castShadow><octahedronGeometry args={[0.7, 0]} /><Ink thickness={3.2} /></mesh>
        <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]} material={m.accent}><octahedronGeometry args={[0.55, 0]} /><Ink thickness={3.2} /></mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[Math.cos((i / 5) * Math.PI * 2) * 1.2, Math.sin(i * 2) * 0.3, Math.sin((i / 5) * Math.PI * 2) * 1.2]} material={m.accent}>
            <tetrahedronGeometry args={[0.12, 0]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Remote({ m, spin }: { m: Mats; spin: React.RefObject<Group> }) {
  return (
    <group>
      {/* phone */}
      <group position={[-0.55, 1.75, 0]} rotation={[0, 0.25, 0.04]}>
        <RoundedBox args={[1.05, 2.1, 0.12]} radius={0.12} material={m.dark} castShadow><Ink thickness={3.2} /></RoundedBox>
        <mesh position={[0, 0, 0.065]} material={m.glass}><planeGeometry args={[0.9, 1.88]} /></mesh>
        {[0.55, 0.2, -0.15, -0.5].map((y, i) => (
          <mesh key={y} position={[i % 2 ? 0.12 : -0.05, y, 0.07]} material={m.accent}><planeGeometry args={[i % 2 ? 0.55 : 0.7, 0.2]} /><Ink thickness={3.2} /></mesh>
        ))}
      </group>
      {/* laptop */}
      <group position={[0.8, 0.62, 0.25]} rotation={[0, -0.4, 0]}>
        <mesh position={[0, 0.25, 0]} material={m.stone} castShadow><boxGeometry args={[1.3, 0.05, 0.85]} /><Ink thickness={3.2} /></mesh>
        <group position={[0, 0.27, -0.42]} rotation={[-0.25, 0, 0]}>
          <mesh position={[0, 0.42, 0]} material={m.stone} castShadow><boxGeometry args={[1.3, 0.85, 0.04]} /><Ink thickness={3.2} /></mesh>
          <mesh position={[0, 0.42, 0.025]} material={m.glass}><planeGeometry args={[1.18, 0.74]} /></mesh>
        </group>
      </group>
      {/* signal arcs: remote work */}
      <group ref={spin} position={[0, 3.3, 0]}>
        {[0.35, 0.65, 0.95].map((r) => (
          <mesh key={r} rotation={[0, 0, Math.PI / 4]} material={m.accent}>
            <torusGeometry args={[r, 0.035, 6, 24, Math.PI / 2]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Landmark({ c, i }: { c: Company; i: number }) {
  const group = useRef<Group>(null!)
  const spin = useRef<Group>(null!)
  const m = useMemo<Mats>(
    () => ({
      stone: toon('#fbf1dd', { steps: 4 }),
      dark: toon('#435887', { steps: 4 }),
      accent: toon(c.color, { emissive: c.color, emissiveIntensity: 0.15 }),
      glass: toon('#26305a', { emissive: c.color, emissiveIntensity: 0.2 }),
    }),
    [c.color],
  )
  const { pos, yaw } = useMemo(() => {
    const pos = landmarkPosition(i)
    const onPath = riderPath.getPointAt(STOP_T[i])
    const d = onPath.clone().sub(pos)
    return { pos, yaw: Math.atan2(d.x, d.z) }
  }, [i])

  useFrame((state, dt) => {
    const a = stopActivation(i, scrollState.p)
    m.accent.emissiveIntensity = 0.12 + a * 1.1
    m.glass.emissiveIntensity = 0.25 + a * 0.6
    if (!scrollState.reduced && spin.current) spin.current.rotation.y += dt * (0.15 + a * 0.6)
    group.current.position.y = scrollState.reduced ? 0 : Math.sin(state.clock.elapsedTime * 0.6 + i) * 0.04
    // energy-burst reveal: pop scale with overshoot while the burst is fresh, stepped on twos
    const b = fx.burst[i]
    const pop = b > 0 ? Math.round(Math.sin(b * Math.PI) * 0.18 * 12) / 12 : 0
    group.current.scale.setScalar(1 + pop)
    burstMat.uniforms.uT.value = 1 - b
    pillarMat.uniforms.uA.value = b
    burst.current.visible = b > 0.001
  })

  const burst = useRef<Group>(null!)
  const burstMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
        fragmentShader: `uniform float uT; uniform vec3 uCol; varying vec2 vUv;
          void main(){
            float r = length(vUv - .5) * 2.;
            float e = pow(clamp(uT, 0., 1.), .45);
            float band = smoothstep(e - .16, e - .03, r) * (1. - smoothstep(e - .03, e, r));
            float a = atan(vUv.y - .5, vUv.x - .5 + 1e-4);
            float spokes = step(.88, fract(a * 3.8197)) * band;
            gl_FragColor = vec4(mix(uCol, vec3(1.), .45) * (band * .8 + spokes) * (1. - uT) * 1.6, 1.);
          }`,
        uniforms: { uT: { value: 1 }, uCol: { value: new Color(c.color) } },
        transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, fog: false,
      }),
    [c.color],
  )
  const pillarMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: `varying vec2 vUv; varying float vF;
          void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.);
            vF = abs(dot(normalize(normalMatrix * normal + 1e-5), normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform float uA; uniform vec3 uCol; varying vec2 vUv; varying float vF;
          void main(){
            float a = step(.45, vF) * .45 + step(.85, vF) * .55;
            gl_FragColor = vec4(mix(uCol, vec3(1.), step(.85, vF)) * a * (1. - vUv.y) * uA * 2.2, 1.);
          }`,
        uniforms: { uA: { value: 0 }, uCol: { value: new Color(c.color) } },
        transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, fog: false,
      }),
    [c.color],
  )

  const Art = { broadcast: Broadcast, robot: Robot, servers: Servers, screens: Screens, star: Star, remote: Remote }[c.kind]
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <Plinth m={m} />
      <group ref={group} position={[0, 0.24, 0]}>
        <Art m={m} spin={spin} color={c.color} />
      </group>
      <group ref={burst} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]} scale={7} material={burstMat} renderOrder={4}>
          <planeGeometry args={[1, 1]} />
        </mesh>
        <mesh position={[0, 6, 0]} material={pillarMat} renderOrder={4}>
          <cylinderGeometry args={[0.9, 1.3, 12, 20, 1, true]} />
        </mesh>
      </group>
    </group>
  )
}

/** One travelling point light that glows at whichever stop is active (cheaper than six). */
function StopLight() {
  const light = useRef<PointLight>(null!)
  const positions = useMemo(() => COMPANIES.map((_, i) => landmarkPosition(i).add(new Vector3(0, 3, 1.5))), [])
  const colors = useMemo(() => COMPANIES.map((c) => new Color(c.color)), [])
  useFrame(() => {
    let best = 0
    let bestA = 0
    for (let i = 0; i < COMPANIES.length; i++) {
      const a = stopActivation(i, scrollState.p)
      if (a > bestA) { bestA = a; best = i }
    }
    light.current.position.copy(positions[best])
    light.current.color.copy(colors[best])
    light.current.intensity = bestA * 10
  })
  return <pointLight ref={light} distance={16} decay={1.5} />
}

export function Landmarks() {
  return (
    <group>
      {COMPANIES.map((c, i) => (
        <Landmark key={c.name} c={c} i={i} />
      ))}
      <StopLight />
    </group>
  )
}

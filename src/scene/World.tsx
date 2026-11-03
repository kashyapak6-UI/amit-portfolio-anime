import { useLayoutEffect, useMemo, useRef } from 'react'
import { Sparkles } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { BackSide, Color, Group, InstancedMesh, Mesh, Object3D, ShaderMaterial, TubeGeometry, Vector3 } from 'three'
import type { MeshToonMaterial } from 'three'
import { riderPath, scrollState } from '../lib/timeline'
import { QUALITY, toon } from './toon'

/** Direction toward the sun: high, to the right and a little ahead, so it shows in frame. */
export const SUN_DIR = new Vector3(0.62, 0.52, -0.58).normalize()
/** Airy blue haze; also the sky's horizon colour, so the ground melts into it. */
export const HAZE = '#cfe7f6'

function mulberry(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Saturated anime sky: deep blue zenith, bright horizon, big soft sun with a bloom-like halo. */
function SkyDome() {
  const mesh = useRef<Mesh>(null!)
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new Color('#0f4fd6') },
          uMid: { value: new Color('#3f9bff') },
          uHorizon: { value: new Color(HAZE) },
          uSun: { value: SUN_DIR },
        },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
        fragmentShader: `
          varying vec3 vDir; uniform vec3 uTop, uMid, uHorizon, uSun;
          void main(){
            float h = vDir.y;
            vec3 c = mix(uHorizon, uMid, smoothstep(-0.01, 0.16, h));
            c = mix(c, uTop, smoothstep(0.16, 0.7, h));
            float d = max(dot(vDir, uSun), 0.);
            // crisp disc, stepped halo rings (cel look), wide soft bloom
            c = mix(c, vec3(1., .99, .94), smoothstep(.9986, .9990, d));
            c += vec3(1., .95, .8) * (step(.996, d) * .35 + step(.985, d) * .15);
            c += vec3(1., .92, .75) * (pow(max(d, 0.), 30.) * .45 + pow(max(d, 0.), 5.) * .12);
            gl_FragColor = vec4(c, 1.);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    [],
  )
  useFrame(({ camera }) => mesh.current.position.copy(camera.position))
  return (
    <mesh ref={mesh} material={mat} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[600, 32, 16]} />
    </mesh>
  )
}

/** Big fluffy cel-shaded cumulus: clusters of puffs in one instanced mesh, unaffected by fog. */
function CloudBank({ count }: { count: number }) {
  const ref = useRef<InstancedMesh>(null!)
  const group = useRef<Group>(null!)
  const puffs = useMemo(() => {
    const rnd = mulberry(21)
    const out: { p: Vector3; s: Vector3 }[] = []
    for (let c = 0; c < count; c++) {
      // mostly ahead of the route (-Z) where the camera looks, spread wide
      const ang = -Math.PI / 2 + (rnd() - 0.5) * Math.PI * 1.5
      const dist = 210 + rnd() * 140
      const centre = new Vector3(Math.cos(ang) * dist, 38 + rnd() * 55, -55 + Math.sin(ang) * dist)
      const size = 14 + rnd() * 16
      const n = 6 + Math.floor(rnd() * 5)
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1) - 0.5
        const r = size * (0.55 + (1 - Math.abs(u) * 1.6) * 0.45 + rnd() * 0.15)
        out.push({
          p: centre.clone().add(new Vector3(u * size * 2.6, r * 0.25 + rnd() * size * 0.2, (rnd() - 0.5) * size * 0.8)),
          s: new Vector3(r, r * 0.82, r * 0.9),
        })
      }
      // flat-ish base
      out.push({ p: centre.clone().add(new Vector3(0, -size * 0.15, 0)), s: new Vector3(size * 1.9, size * 0.35, size * 0.8) })
    }
    return out
  }, [count])
  const mat = useMemo(() => {
    const m = toon('#ffffff', { steps: 3, emissive: '#c9dcff', emissiveIntensity: 0.35 })
    m.fog = false
    return m
  }, [])
  useLayoutEffect(() => {
    const o = new Object3D()
    puffs.forEach((pf, i) => {
      o.position.copy(pf.p)
      o.scale.copy(pf.s)
      o.updateMatrix()
      ref.current.setMatrixAt(i, o.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [puffs])
  useFrame((_, dt) => {
    if (!scrollState.reduced) group.current.rotation.y += dt * 0.004
  })
  return (
    <group ref={group} position={[0, 0, -55]}>
      <group position={[0, 0, 55]}>
        <instancedMesh ref={ref} args={[undefined, mat, puffs.length]} frustumCulled={false}>
          <sphereGeometry args={[1, 18, 12]} />
        </instancedMesh>
      </group>
    </group>
  )
}

/** Ghibli-style round trees, a few pines, and lavender boulders, instanced. */
function Scatter({ count }: { count: number }) {
  const canopy = useRef<InstancedMesh>(null!)
  const trunks = useRef<InstancedMesh>(null!)
  const pines = useRef<InstancedMesh>(null!)
  const rocks = useRef<InstancedMesh>(null!)
  const samples = useMemo(() => riderPath.getSpacedPoints(160), [])
  const mats = useMemo(
    () => ({ canopy: toon('#ffffff'), trunk: toon('#8a5a3c'), pine: toon('#ffffff'), rock: toon('#b9b2cf', { steps: 4 }) }),
    [],
  )
  useLayoutEffect(() => {
    const rnd = mulberry(7)
    const o = new Object3D()
    const c = new Color()
    let ci = 0, ti = 0, pi = 0, ri = 0, guard = 0
    const rocksMax = Math.ceil(count / 3)
    while ((ti < count || ri < rocksMax) && guard++ < count * 30) {
      const v = new Vector3((rnd() - 0.5) * 100, 0, 16 - rnd() * 160)
      let dmin = Infinity
      for (const s of samples) dmin = Math.min(dmin, s.distanceToSquared(v))
      if (dmin < 64) continue // keep the road and stops clear (8 units)
      if (ti < count) {
        if (rnd() < 0.68) {
          // round tree: trunk + 2-3 canopy blobs
          const h = 1.6 + rnd() * 1.6
          const w = 1.3 + rnd() * 1.1
          o.rotation.set(0, 0, 0)
          o.position.set(v.x, h / 2, v.z)
          o.scale.set(0.18, h, 0.18)
          o.updateMatrix()
          trunks.current.setMatrixAt(ti, o.matrix)
          const hue = 0.24 + rnd() * 0.08
          const blobs = 2 + Math.floor(rnd() * 2)
          for (let b = 0; b < blobs; b++) {
            const bs = w * (b === 0 ? 1 : 0.62 + rnd() * 0.2)
            o.position.set(v.x + (b ? (rnd() - 0.5) * w * 1.3 : 0), h + w * 0.55 + (b ? rnd() * w * 0.5 : 0), v.z + (b ? (rnd() - 0.5) * w : 0))
            o.scale.set(bs, bs * 0.9, bs)
            o.rotation.set(0, rnd() * 3, 0)
            o.updateMatrix()
            canopy.current.setMatrixAt(ci, o.matrix)
            canopy.current.setColorAt(ci, c.setHSL(hue, 0.62, 0.42 + rnd() * 0.1))
            ci++
          }
        } else {
          const h = 3 + rnd() * 4
          o.position.set(v.x, h / 2, v.z)
          o.scale.set(0.9 + rnd() * 0.5, h, 0.9 + rnd() * 0.5)
          o.rotation.set(0, rnd() * Math.PI, 0)
          o.updateMatrix()
          pines.current.setMatrixAt(pi, o.matrix)
          pines.current.setColorAt(pi, c.setHSL(0.36 + rnd() * 0.06, 0.55, 0.3 + rnd() * 0.08))
          pi++
        }
        ti++
      } else if (ri < rocksMax) {
        const s = 0.3 + rnd() * 0.9
        o.position.set(v.x, s * 0.3, v.z)
        o.scale.set(s, s * 0.6, s)
        o.rotation.set(rnd(), rnd() * 3, rnd())
        o.updateMatrix()
        rocks.current.setMatrixAt(ri, o.matrix)
        ri++
      }
    }
    // trunks: one per round tree; fill the unused slots with zero scale
    const zero = new Object3D()
    zero.scale.setScalar(0)
    zero.updateMatrix()
    for (let i = 0; i < count; i++) {
      const m = new Object3D().matrix
      trunks.current.getMatrixAt(i, m)
      if (m.elements.every((e, k) => e === (k % 5 === 0 ? 1 : 0))) trunks.current.setMatrixAt(i, zero.matrix)
    }
    canopy.current.count = ci
    pines.current.count = pi
    rocks.current.count = ri
    for (const r of [canopy, trunks, pines, rocks]) r.current.instanceMatrix.needsUpdate = true
    if (canopy.current.instanceColor) canopy.current.instanceColor.needsUpdate = true
    if (pines.current.instanceColor) pines.current.instanceColor.needsUpdate = true
  }, [count, samples])
  return (
    <>
      <instancedMesh ref={canopy} args={[undefined, mats.canopy, count * 3]} castShadow>
        <sphereGeometry args={[1, 14, 10]} />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[undefined, mats.trunk, count]} castShadow>
        <cylinderGeometry args={[0.7, 1, 1, 6]} />
      </instancedMesh>
      <instancedMesh ref={pines} args={[undefined, mats.pine, count]} castShadow>
        <coneGeometry args={[1, 1, 7]} />
      </instancedMesh>
      <instancedMesh ref={rocks} args={[undefined, mats.rock, Math.ceil(count / 3)]} receiveShadow>
        <dodecahedronGeometry args={[1, 1]} />
      </instancedMesh>
    </>
  )
}

/** Swaying grass tufts and little flowers along the road (desktop extras). */
function Meadow({ grass, flowers }: { grass: number; flowers: number }) {
  const grassRef = useRef<InstancedMesh>(null!)
  const flowerRef = useRef<InstancedMesh>(null!)
  const time = useRef({ value: 0 })
  const grassMat = useMemo(() => {
    const m = toon('#ffffff')
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = time.current
      shader.vertexShader = shader.vertexShader
        .replace('void main() {', 'uniform float uTime;\nvoid main() {')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           #ifdef USE_INSTANCING
             vec4 iw = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
             float hgt = clamp(position.y + 0.5, 0.0, 1.0);
             transformed.x += sin(uTime * 1.8 + iw.x * 0.7 + iw.z * 0.45) * 0.28 * hgt * hgt;
             transformed.z += cos(uTime * 1.3 + iw.z * 0.6) * 0.14 * hgt * hgt;
           #endif`,
        )
    }
    m.customProgramCacheKey = () => 'grass'
    return m
  }, [])
  const flowerMat = useMemo(() => toon('#ffffff'), [])
  useLayoutEffect(() => {
    const rnd = mulberry(99)
    const o = new Object3D()
    const c = new Color()
    const tan = new Vector3()
    const place = (side: number) => {
      const t = rnd()
      const p = riderPath.getPointAt(t)
      riderPath.getTangentAt(t, tan)
      const off = (1.25 + Math.pow(rnd(), 1.6) * 12) * side
      return new Vector3(p.x - tan.z * off, 0, p.z + tan.x * off)
    }
    for (let i = 0; i < grass && grassRef.current; i++) {
      const v = place(rnd() < 0.5 ? -1 : 1)
      const s = 0.35 + rnd() * 0.45
      o.position.set(v.x, 0.2 * s, v.z)
      o.rotation.set((rnd() - 0.5) * 0.4, rnd() * 3, (rnd() - 0.5) * 0.4)
      o.scale.set(s, s, s)
      o.updateMatrix()
      grassRef.current.setMatrixAt(i, o.matrix)
      grassRef.current.setColorAt(i, c.setHSL(0.25 + rnd() * 0.06, 0.62, 0.5 + rnd() * 0.12))
    }
    const petals = ['#ffffff', '#ffd84a', '#ff9ec4', '#a9c8ff']
    for (let i = 0; i < flowers; i++) {
      const v = place(rnd() < 0.5 ? -1 : 1)
      const s = 0.035 + rnd() * 0.03
      o.position.set(v.x, 0.22 + rnd() * 0.12, v.z)
      o.rotation.set(0, 0, 0)
      o.scale.set(s, s * 0.6, s)
      o.updateMatrix()
      flowerRef.current.setMatrixAt(i, o.matrix)
      flowerRef.current.setColorAt(i, c.set(petals[Math.floor(rnd() * petals.length)]))
    }
    for (const r of [grassRef, flowerRef]) {
      if (!r.current) continue
      r.current.instanceMatrix.needsUpdate = true
      if (r.current.instanceColor) r.current.instanceColor.needsUpdate = true
    }
  }, [grass, flowers])
  useFrame((state) => {
    time.current.value = scrollState.reduced ? 0 : state.clock.elapsedTime
  })
  return (
    <>
      {grass > 0 && (
        <instancedMesh ref={grassRef} args={[undefined, grassMat, grass]} receiveShadow>
          <coneGeometry args={[0.045, 0.5, 4]} />
        </instancedMesh>
      )}
      <instancedMesh ref={flowerRef} args={[undefined, flowerMat, Math.max(1, flowers)]}>
        <icosahedronGeometry args={[1, 0]} />
      </instancedMesh>
    </>
  )
}

function Road() {
  const { line, slabs } = useMemo(() => {
    const line = new TubeGeometry(riderPath, 400, 0.02, 5, false)
    const pts = riderPath.getSpacedPoints(110)
    const slabs = pts.map((p, i) => {
      const t = riderPath.getTangentAt(i / 110)
      return { p, yaw: Math.atan2(t.x, t.z) }
    })
    return { line, slabs }
  }, [])
  const slabsRef = useRef<InstancedMesh>(null!)
  const mats = useMemo(
    () => ({ slab: toon('#f8e9c8', { steps: 4 }), line: toon('#f0a83a', { emissive: '#f0a83a', emissiveIntensity: 0.3 }) as MeshToonMaterial }),
    [],
  )
  useLayoutEffect(() => {
    const o = new Object3D()
    slabs.forEach((s, i) => {
      o.position.set(s.p.x, 0.01, s.p.z)
      o.rotation.set(0, s.yaw, 0)
      o.updateMatrix()
      slabsRef.current.setMatrixAt(i, o.matrix)
    })
    slabsRef.current.instanceMatrix.needsUpdate = true
  }, [slabs])
  return (
    <group>
      <mesh geometry={line} position={[0, 0.03, 0]} material={mats.line} />
      <instancedMesh ref={slabsRef} args={[undefined, mats.slab, slabs.length]} receiveShadow>
        <boxGeometry args={[1.7, 0.04, 0.9]} />
      </instancedMesh>
    </group>
  )
}

export function World({ mobile }: { mobile: boolean }) {
  const groundMat = useMemo(() => toon('#4fbb3c', { steps: 3 }), [])
  return (
    <>
      <color attach="background" args={[HAZE]} />
      <fogExp2 attach="fog" args={[HAZE, 0.013]} />
      <SkyDome />
      <CloudBank count={mobile ? 7 : 12} />
      {/* cool blue sky fill so shadow sides read blue, not grey */}
      <hemisphereLight args={['#9cc8ff', '#5f8f4a', 1.25]} />
      <ambientLight intensity={0.35} color="#a9c6ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -55]} receiveShadow material={groundMat}>
        <planeGeometry args={[700, 700]} />
      </mesh>
      <Road />
      <Scatter count={mobile ? 90 : 200} />
      <Meadow grass={QUALITY.extras ? 2600 : 0} flowers={mobile ? 120 : 420} />
      {QUALITY.extras && (
        <>
          {/* drifting sakura petals and a few leaves */}
          <Sparkles count={90} scale={[26, 7, 140]} position={[0, 3, -55]} size={5} speed={0.35} opacity={0.9} color="#ffb3cd" noise={1.5} />
          <Sparkles count={40} scale={[26, 7, 140]} position={[0, 3, -55]} size={4} speed={0.3} opacity={0.85} color="#b9ef7a" noise={1.5} />
        </>
      )}
    </>
  )
}

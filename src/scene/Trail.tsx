import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, InstancedMesh, MeshBasicMaterial, Object3D, Vector3 } from 'three'
import { fx } from '../lib/fx'
import { BEAT, riderPath, riderT, scrollState, smooth01 } from '../lib/timeline'
import { toon } from './toon'

const o = new Object3D()
const pos = new Vector3()
const tan = new Vector3()
const side = new Vector3()

/**
 * Speed juice around the rider: cel-shaded dust puffs kicked up by the rear wheel and
 * white wind streaks whipping past, both scaled by scroll speed. World space, pooled.
 */
export function Trail({ mobile }: { mobile: boolean }) {
  const DUST = mobile ? 24 : 56
  const STREAKS = mobile ? 0 : 28
  const dust = useRef<InstancedMesh>(null!)
  const streaks = useRef<InstancedMesh>(null!)
  const dustMat = useMemo(() => toon('#f3e6c9', { steps: 3, emissive: '#c9b48a', emissiveIntensity: 0.25 }), [])
  const streakMat = useMemo(
    () => new MeshBasicMaterial({ color: new Color(1.6, 1.6, 1.7), transparent: true, opacity: 0.0, blending: AdditiveBlending, depthWrite: false, fog: false }),
    [],
  )
  const pool = useMemo(
    () => Array.from({ length: DUST }, () => ({ p: new Vector3(), v: new Vector3(), life: 0, s: 0 })),
    [DUST],
  )
  const streakPool = useMemo(
    () => Array.from({ length: STREAKS }, () => ({ x: (Math.random() - 0.5) * 2, y: Math.random(), z: Math.random(), len: 0.6 + Math.random() * 1.4 })),
    [STREAKS],
  )
  const next = useRef(0)
  const acc = useRef(0)

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05)
    const p = scrollState.p
    const riding = smooth01(BEAT.mountEnd, BEAT.mountEnd + 0.01, p) * (1 - smooth01(BEAT.rideEnd - 0.01, BEAT.rideEnd + 0.01, p))
    const speed = scrollState.reduced ? 0 : fx.speed * riding
    const t = riderT(p)
    riderPath.getPointAt(t, pos)
    riderPath.getTangentAt(Math.max(t, 0.001), tan)
    side.set(-tan.z, 0, tan.x)

    // spawn dust behind the rear wheel
    acc.current += dt * (speed > 0.2 ? 14 + speed * 30 : 0)
    while (acc.current >= 1) {
      acc.current -= 1
      const d = pool[next.current]
      next.current = (next.current + 1) % pool.length
      d.p.copy(pos).addScaledVector(tan, -0.6).addScaledVector(side, (Math.random() - 0.5) * 0.25)
      d.p.y = 0.08
      d.v.copy(tan).multiplyScalar(-(0.4 + Math.random() * 0.8)).addScaledVector(side, (Math.random() - 0.5) * 1.2)
      d.v.y = 0.4 + Math.random() * 0.6
      d.life = 1
      d.s = 0.035 + Math.random() * 0.05
    }
    pool.forEach((d, i) => {
      if (d.life > 0) {
        d.life -= dt * 1.4
        d.p.addScaledVector(d.v, dt)
        d.v.multiplyScalar(Math.pow(0.15, dt))
      }
      const k = Math.max(0, d.life)
      // puff grows then pops away (stepped scale = 2s timing)
      const sc = k > 0 ? d.s * (1.6 - k) * Math.min(1, k * 4) : 0
      o.position.copy(d.p)
      o.scale.setScalar(Math.round(sc * 40) / 40)
      o.rotation.set(0, 0, 0)
      o.updateMatrix()
      dust.current.setMatrixAt(i, o.matrix)
    })
    dust.current.instanceMatrix.needsUpdate = true

    if (STREAKS && streaks.current) {
      streakMat.opacity = Math.min(0.85, speed * 1.2)
      streaks.current.visible = speed > 0.05
      const yaw = Math.atan2(tan.x, tan.z)
      streakPool.forEach((s, i) => {
        s.z = (s.z + dt * (1.5 + speed * 6) / s.len) % 1
        const back = 2.5 - s.z * 6
        o.position.copy(pos).addScaledVector(tan, back).addScaledVector(side, s.x * 1.6 + Math.sign(s.x) * 0.5)
        o.position.y = 0.3 + s.y * 1.6
        o.rotation.set(0, yaw, 0)
        o.scale.set(1, 1, s.len * (0.4 + speed))
        o.updateMatrix()
        streaks.current.setMatrixAt(i, o.matrix)
      })
      streaks.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      <instancedMesh ref={dust} args={[undefined, dustMat, DUST]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
      </instancedMesh>
      {STREAKS > 0 && (
        <instancedMesh ref={streaks} args={[undefined, streakMat, STREAKS]} frustumCulled={false} renderOrder={8}>
          <boxGeometry args={[0.012, 0.012, 1]} />
        </instancedMesh>
      )}
    </>
  )
}

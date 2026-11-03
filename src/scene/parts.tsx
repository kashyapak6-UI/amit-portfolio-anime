import { useMemo } from 'react'
import { Quaternion, Vector3 } from 'three'
import type { ReactNode } from 'react'

const UP = new Vector3(0, 1, 0)

/** A cylinder rod spanning two points (local space). */
export function Rod({ a, b, r = 0.025, children }: { a: [number, number, number]; b: [number, number, number]; r?: number; children: ReactNode }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new Vector3(...a)
    const vb = new Vector3(...b)
    const dir = vb.clone().sub(va)
    const len = dir.length()
    const quat = new Quaternion().setFromUnitVectors(UP, dir.normalize())
    return { pos: va.add(vb).multiplyScalar(0.5), quat, len }
  }, [a, b])
  return (
    <mesh position={pos} quaternion={quat} castShadow>
      <cylinderGeometry args={[r, r, len, 8]} />
      {children}
    </mesh>
  )
}

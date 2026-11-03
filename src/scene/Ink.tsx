import { useEffect, useState } from 'react'
import { Outlines } from '@react-three/drei'
import { INK, QUALITY } from './toon'

/**
 * Ink outline (inverted hull) for the parent mesh. Re-renders once after mount so drei's
 * <Outlines> picks up the sibling geometry element rather than the mesh's empty default.
 */
/** thickness is in drawing-buffer pixels (drei's non-screenspace mode is clip-space offset). */
export function Ink({ thickness = 3, color = INK }: { thickness?: number; color?: string }) {
  const [, bump] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => bump(1))
    return () => cancelAnimationFrame(id)
  }, [])
  return QUALITY.outlines ? <Outlines thickness={thickness} color={color} /> : null
}

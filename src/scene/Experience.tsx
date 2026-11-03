import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr } from '@react-three/drei'
import { NeutralToneMapping, SRGBColorSpace } from 'three'
import { CameraRig } from './CameraRig'
import { FrostOverlay } from './FrostOverlay'
import { Landmarks } from './Landmarks'
import { Rider } from './Rider'
import { World } from './World'
import { QUALITY } from './toon'
import { Trail } from './Trail'
import { Post, canUsePost } from './Post'

export default function Experience({ mobile }: { mobile: boolean }) {
  const post = canUsePost(mobile)
  QUALITY.outlines = !mobile
  QUALITY.extras = !mobile && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return (
    <Canvas
      shadows={!mobile}
      dpr={[1, mobile ? 1.25 : 1.75]}
      gl={{ antialias: !mobile, powerPreference: 'high-performance', toneMapping: NeutralToneMapping, outputColorSpace: SRGBColorSpace }}
      camera={{ fov: 42, near: 0.1, far: 900, position: [0, 1, 2.7] }}
      aria-hidden="true"
    >
      <AdaptiveDpr pixelated={false} />
      <World mobile={mobile} />
      <Landmarks />
      <Rider mobile={mobile} />
      <Trail mobile={mobile} />
      <CameraRig />
      <FrostOverlay />
      {post && <Post />}
    </Canvas>
  )
}

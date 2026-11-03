import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { HalfFloatType, Vector2, WebGLRenderTarget } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { fx } from '../lib/fx'

/** Guards the bloom chain: any NaN/Inf pixel would be blurred across the whole frame. */
const SanitizeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      bool bad = any(isnan(c)) || any(isinf(c));
      gl_FragColor = bad ? vec4(0., 0., 0., 1.) : clamp(c, 0., 32.);
    }`,
}

/** Radial chromatic aberration "kick" on impacts and at speed. */
const CAShader = {
  uniforms: { tDiffuse: { value: null }, uAmount: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uAmount; varying vec2 vUv;
    void main(){
      vec2 d = (vUv - .5) * uAmount * length(vUv - .5) * 2.;
      vec4 c = texture2D(tDiffuse, vUv);
      if (uAmount > 0.0001) {
        c.r = texture2D(tDiffuse, vUv + d).r;
        c.b = texture2D(tDiffuse, vUv - d).b;
      }
      gl_FragColor = c;
    }`,
}

/** Desktop-only post: high-threshold bloom (only the aura + bursts glow) and a CA kick. */
export function Post() {
  const { gl, scene, camera, size } = useThree()
  const dpr = useThree((s) => s.viewport.dpr)
  const { composer, ca, bloom } = useMemo(() => {
    // MSAA render target so the ink outlines stay crisp through the post chain
    const rt = new WebGLRenderTarget(size.width, size.height, { type: HalfFloatType, samples: 4 })
    const composer = new EffectComposer(gl, rt)
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new ShaderPass(SanitizeShader))
    const bloom = new UnrealBloomPass(new Vector2(size.width / 2, size.height / 2), 0.45, 0.3, 1.25)
    composer.addPass(bloom)
    const ca = new ShaderPass(CAShader)
    composer.addPass(ca)
    composer.addPass(new OutputPass())
    return { composer, ca, bloom }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera])

  useEffect(() => {
    composer.setPixelRatio(dpr)
    composer.setSize(size.width, size.height)
    bloom.resolution.set(size.width / 2, size.height / 2)
  }, [composer, bloom, size, dpr])
  useEffect(() => () => composer.dispose(), [composer])

  useFrame(() => {
    ca.uniforms.uAmount.value = fx.reduced ? 0 : fx.ca * 0.012 + fx.speed * 0.002
    bloom.strength = 0.4 + fx.flash * 0.5 + fx.power * 0.1
    composer.render()
  }, 1)
  return null
}

/** Only on capable desktops: post costs fill-rate, so phones and low-end machines skip it. */
export function canUsePost(mobile: boolean) {
  if (mobile || typeof navigator === 'undefined') return false
  const cores = navigator.hardwareConcurrency ?? 4
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
  return cores >= 4 && mem >= 4
}

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, Group, LatheGeometry, Mesh,
  ShaderMaterial, Vector2,
} from 'three'
import { fx, onTwos } from '../lib/fx'
import { scrollState } from '../lib/timeline'

/**
 * Original ki aura: two additive flame shells (gold outer, blue-white inner) built on a
 * teardrop lathe, posterised scrolling noise for cartoon flame tongues, plus rising sparks
 * and a ground shock ring. Everything ticks "on twos" (12 fps) like TV anime effects.
 */

const NOISE = /* glsl */ `
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.07; a*=.5; } return v; }
`

const shellVert = /* glsl */ `
uniform float uTime;
uniform float uPower;
varying vec3 vN;
varying vec3 vV;
varying vec2 vUv;
${NOISE}
void main(){
  vUv = uv;
  vec3 p = position;
  float ang = uv.x * 6.2832;
  // flame tongues licking upward, stronger toward the top
  float tongue = sin(ang * 5. + uTime * 9.) * .5 + sin(ang * 3. - uTime * 6.) * .5;
  float h = uv.y;
  p.xz *= 1. + (.10 * tongue * h + .06 * sin(uTime * 14. + h * 9.)) * uPower;
  p.y += h * h * (.22 + .18 * tongue) * uPower;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  vN = normalize(normalMatrix * normal + vec3(0., 1e-5, 0.));
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`

const shellFrag = /* glsl */ `
uniform float uTime;
uniform float uPower;
uniform vec3 uColA;
uniform vec3 uColB;
uniform float uBias;
varying vec3 vN;
varying vec3 vV;
varying vec2 vUv;
${NOISE}
void main(){
  float fres = 1. - abs(dot(normalize(vN + 1e-5), normalize(vV + 1e-5)));
  vec2 q = vec2(vUv.x * 7., vUv.y * 2.6 - uTime * 2.2);
  float n = fbm(q) + .35 * fbm(q * 2.3 + 4.1);
  float flame = n * .8 + fres * 1.25 + uBias - (1. - uPower) * 1.1 - vUv.y * .35;
  // posterise: two hard bands (cel flames)
  float outer = step(.78, flame);
  float core = step(1.08, flame);
  float fade = smoothstep(0., .1, vUv.y) * smoothstep(1., .7, vUv.y);
  vec3 col = mix(uColA, uColB, core);
  float a = (outer * .4 + core * .4) * fade * smoothstep(0., .15, uPower) * mix(.12, 1., smoothstep(.35, .75, fres));
  gl_FragColor = vec4(col * a * (.8 + uPower * .7), 1.);
}`

const sparkVert = /* glsl */ `
attribute vec3 aSeed;
uniform float uTime;
uniform float uPower;
uniform float uPx;
varying float vA;
void main(){
  float life = fract(aSeed.x + uTime * (.35 + aSeed.y * .5));
  float ang = aSeed.z * 6.2832;
  float r = (.25 + aSeed.y * .45) * (1. - life * .55);
  vec3 p = vec3(cos(ang) * r, life * 2.3, sin(ang) * r);
  vA = (1. - life) * smoothstep(0., .1, life) * uPower;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_PointSize = uPx * (.6 + aSeed.y) * (1.2 + uPower) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`
const sparkFrag = /* glsl */ `
uniform vec3 uCol;
varying float vA;
void main(){
  vec2 c = gl_PointCoord * 2. - 1.;
  // 4-point star sparkle
  float s = max(1. - abs(c.x) * 6. - abs(c.y) * 1.2, 0.) + max(1. - abs(c.y) * 6. - abs(c.x) * 1.2, 0.);
  s += smoothstep(.45, 0., length(c));
  gl_FragColor = vec4(uCol * s * vA * 2.2, 1.);
}`

const ringFrag = /* glsl */ `
uniform float uT;
uniform vec3 uCol;
varying vec2 vUv;
void main(){
  float r = length(vUv - .5) * 2.;
  float edge = uT;
  float band = smoothstep(edge - .14, edge - .02, r) * (1. - smoothstep(edge - .02, edge, r));
  float a = band * (1. - uT);
  gl_FragColor = vec4(uCol * a * 2.5, 1.);
}`
const ringVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`

function teardrop() {
  const pts = [
    [0.18, 0], [0.48, 0.12], [0.62, 0.45], [0.64, 0.85], [0.55, 1.25], [0.38, 1.62], [0.18, 1.92], [0.02, 2.12],
  ].map(([x, y]) => new Vector2(x, y))
  return new LatheGeometry(pts, 40)
}

export function Aura({ mobile }: { mobile: boolean }) {
  const group = useRef<Group>(null!)
  const ring = useRef<Mesh>(null!)
  const geo = useMemo(() => teardrop(), [])
  const mk = (a: string, b: string, bias: number) =>
    new ShaderMaterial({
      vertexShader: shellVert,
      fragmentShader: shellFrag,
      uniforms: { uTime: { value: 0 }, uPower: { value: 0 }, uColA: { value: new Color(a) }, uColB: { value: new Color(b) }, uBias: { value: bias } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      fog: false,
    })
  const outer = useMemo(() => mk('#ffb21a', '#fff1a8', 0), [])
  const inner = useMemo(() => mk('#4fb6ff', '#e9f8ff', -0.12), [])
  const count = mobile ? 36 : 90
  const sparks = useMemo(() => {
    const g = new BufferGeometry()
    const seed = new Float32Array(count * 3)
    for (let i = 0; i < seed.length; i++) seed[i] = Math.random()
    g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aSeed', new BufferAttribute(seed, 3))
    return g
  }, [count])
  const sparkMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: sparkVert,
        fragmentShader: sparkFrag,
        uniforms: { uTime: { value: 0 }, uPower: { value: 0 }, uPx: { value: 90 }, uCol: { value: new Color('#ffe68a') } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        fog: false,
      }),
    [],
  )
  const ringMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: ringVert,
        fragmentShader: ringFrag,
        uniforms: { uT: { value: 1 }, uCol: { value: new Color('#ffd76a') } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        fog: false,
      }),
    [],
  )

  const last = useRef(0)
  const ringT = useRef(1)
  useFrame((state, dt) => {
    const reduced = scrollState.reduced
    const t = reduced ? 1.3 : onTwos(state.clock.elapsedTime)
    const power = fx.power
    group.current.visible = power > 0.02
    for (const m of [outer, inner]) {
      m.uniforms.uTime.value = t
      m.uniforms.uPower.value = power
    }
    inner.uniforms.uPower.value = power * 0.92
    sparkMat.uniforms.uTime.value = reduced ? 0.4 : onTwos(state.clock.elapsedTime)
    sparkMat.uniforms.uPower.value = power
    sparkMat.uniforms.uPx.value = 90 * state.viewport.dpr
    // flicker the whole aura's scale slightly on twos
    const fl = reduced ? 1 : 1 + 0.03 * Math.sin(t * 37.0)
    group.current.scale.set(fl, 1 + 0.04 * Math.sin(t * 23.0) * (reduced ? 0 : 1), fl)
    // ground shock ring fires with each impact flash
    if (fx.flash > 0.6 && fx.flash > last.current + 0.2) ringT.current = 0
    last.current = fx.flash
    ringT.current = Math.min(1, ringT.current + dt * 1.6)
    ringMat.uniforms.uT.value = ringT.current
    ring.current.visible = ringT.current < 1
    ring.current.scale.setScalar(0.5 + ringT.current * 5)
  })

  return (
    <group>
      <group ref={group}>
        <mesh geometry={geo} material={outer} renderOrder={5} />
        <mesh geometry={geo} material={inner} scale={[0.78, 0.86, 0.78]} renderOrder={6} />
        <points geometry={sparks} material={sparkMat} renderOrder={7} frustumCulled={false} />
      </group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} material={ringMat} renderOrder={4}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  )
}

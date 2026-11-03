import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Mesh, ShaderMaterial, Vector2 } from 'three'
import { BEAT, scrollState, smooth01 } from '../lib/timeline'

/**
 * Fullscreen frost on the "lens". It clears in a ragged sweep as you scroll
 * (the child is wiping it from the other side), and the pointer melts a small
 * clear patch wherever it rests.
 */
const vert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`
const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uClear;
uniform float uTime;
uniform float uAspect;
uniform vec2 uPointer;
uniform float uPointerOn;

float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }

void main(){
  vec2 uv = vUv;
  vec2 p = vec2((uv.x-.5)*uAspect, uv.y-.5);
  float n = fbm(p*3.2 + vec2(0., uTime*.02));
  float fine = fbm(p*18.);
  // crystalline streaks
  float streak = smoothstep(.55, .95, fbm(vec2(p.x*2.+p.y*6., p.y*1.5-p.x*3.)*4.));

  // the clearing sweep: a wiped oval that grows from just above centre
  float d = length(p*vec2(.85,1.15) - vec2(0., .02));
  float edge = uClear*1.25 - .08;
  float clearMask = 1. - smoothstep(edge - .12, edge + .06, d + (n-.5)*.35 + (fine-.5)*.08);
  // pointer melt
  vec2 pp = vec2((uPointer.x-.5)*uAspect, uPointer.y-.5);
  float pm = (1. - smoothstep(.04, .2, length(p-pp) + (fine-.5)*.08)) * uPointerOn;
  clearMask = max(clearMask, pm*.85);

  float density = mix(.8, .95, n);
  // soft anime morning mist: pastel sky-blue to peach, painterly cel bands
  float band = floor(n * 4.) / 4.;
  vec3 col = mix(vec3(.80,.89,1.), vec3(1.,.90,.88), smoothstep(-.4,.5, p.y*.6 - p.x*.4 + band*.3));
  col += vec3(.08) * band - vec3(.05,.04,.02)*(1.-fine) + vec3(.05)*streak;
  // warm sun bleeding through from the upper right
  col += vec3(.16,.10,.03) * (1. - smoothstep(0., .8, length(p - vec2(.45, .35))));
  // twinkling 4-point sparkles
  vec2 g = p * 9.;
  vec2 cell = floor(g);
  float h = hash(cell);
  vec2 q = fract(g) - .5 - (vec2(hash(cell+3.1), hash(cell+7.7)) - .5) * .5;
  float tw = .5 + .5 * sin(uTime * 2.2 + h * 40.);
  float star = smoothstep(.05, 0., abs(q.x)) * smoothstep(.28, 0., abs(q.y))
             + smoothstep(.05, 0., abs(q.y)) * smoothstep(.28, 0., abs(q.x));
  star += smoothstep(.09, 0., length(q));
  star *= step(.82, h) * mix(.35, 1., tw);
  col = mix(col, vec3(1.,1.,.96), clamp(star, 0., 1.));
  // bright rim where mist meets the wiped area
  float rim = smoothstep(edge - .2, edge, d + (n-.5)*.35) * (1. - smoothstep(edge, edge + .1, d + (n-.5)*.35));
  col += vec3(.14,.12,.08) * rim * step(.001, uClear);

  float alpha = max(density, clamp(star,0.,1.)) * (1. - clearMask) * (1. - smoothstep(.85, 1., uClear));
  gl_FragColor = vec4(min(col, vec3(1.)), alpha);
}
`

export function FrostOverlay() {
  const mesh = useRef<Mesh>(null!)
  const size = useThree((s) => s.size)
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uClear: { value: 0 },
          uTime: { value: 0 },
          uAspect: { value: 1 },
          uPointer: { value: new Vector2(0.5, 0.5) },
          uPointerOn: { value: 0 },
        },
      }),
    [],
  )
  const target = useRef({ x: 0.5, y: 0.5, on: 0 })

  useEffect(() => {
    const move = (e: PointerEvent) => {
      target.current.x = e.clientX / window.innerWidth
      target.current.y = 1 - e.clientY / window.innerHeight
      target.current.on = e.pointerType === 'mouse' ? 1 : 0.8
    }
    const leave = () => (target.current.on = 0)
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
    }
  }, [])

  useFrame((state, dt) => {
    const clear = smooth01(0.005, BEAT.fogEnd, scrollState.p)
    mesh.current.visible = clear < 0.999
    if (!mesh.current.visible) return
    const u = mat.uniforms
    u.uClear.value = clear
    u.uTime.value = scrollState.reduced ? 0 : state.clock.elapsedTime
    u.uAspect.value = size.width / size.height
    const k = 1 - Math.pow(0.001, dt)
    const pt = u.uPointer.value as Vector2
    pt.x += (target.current.x - pt.x) * k
    pt.y += (target.current.y - pt.y) * k
    u.uPointerOn.value += (target.current.on - u.uPointerOn.value) * k
  })

  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={999} material={mat}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}

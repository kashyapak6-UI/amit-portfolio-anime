import { Color, DataTexture, MeshToonMaterial, NearestFilter, RedFormat } from 'three'
import type { ColorRepresentation, MeshToonMaterialParameters } from 'three'

/** Render-quality switches, set once by <Experience> before the scene mounts. */
export const QUALITY = { outlines: true, extras: true }

/** Ink colour for outlines (deep indigo reads softer than black, Ghibli-like). */
export const INK = '#1e1a2e'

function makeGradient(levels: number[]) {
  const tex = new DataTexture(new Uint8Array(levels), levels.length, 1, RedFormat)
  tex.minFilter = NearestFilter
  tex.magFilter = NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

/** 3-step cel ramp: shadow / mid / lit. */
export const GRADIENT_3 = makeGradient([70, 165, 255])
/** 4-step ramp for large surfaces (clouds, landmarks). */
export const GRADIENT_4 = makeGradient([80, 140, 205, 255])

export function toon(color: ColorRepresentation, params: MeshToonMaterialParameters & { steps?: 3 | 4 } = {}) {
  const { steps = 3, ...rest } = params
  return new MeshToonMaterial({ color: new Color(color), gradientMap: steps === 4 ? GRADIENT_4 : GRADIENT_3, ...rest })
}

/** Shared aura glow on the hero's rim (0..1), driven from fx.power each frame. */
export const AURA_RIM = { value: 0 }
const AURA_COLOR = new Color('#ffcc3d')

/**
 * Adds the hero look to a toon material: a hard-edged anime rim light (fresnel, stepped),
 * a sharp stepped specular "pop" from the key light, and a gold aura rim that grows with power.
 * Injected just before the final colour write so it works with the stock toon shader.
 */
export function withRim(mat: MeshToonMaterial, rim: ColorRepresentation = '#fff4dc', strength = 0.55, spec = 0.35) {
  const rimColor = new Color(rim)
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRim = { value: rimColor }
    shader.uniforms.uRimStrength = { value: strength }
    shader.uniforms.uSpec = { value: spec }
    shader.uniforms.uAura = AURA_RIM
    shader.uniforms.uAuraCol = { value: AURA_COLOR }
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform vec3 uRim;\nuniform float uRimStrength;\nuniform float uSpec;\nuniform float uAura;\nuniform vec3 uAuraCol;\nvoid main() {')
      .replace(
        '#include <opaque_fragment>',
        `vec3 nN = normalize(normal);
         vec3 vD = normalize(vViewPosition);
         float rimF = 1.0 - saturate(dot(nN, vD));
         outgoingLight += uRim * uRimStrength * smoothstep(0.62, 0.68, rimF);
         outgoingLight += uAuraCol * uAura * .55 * smoothstep(0.48, 0.54, rimF);
         #if NUM_DIR_LIGHTS > 0
           vec3 hV = normalize(directionalLights[0].direction + vD);
           outgoingLight += vec3(1.0, 0.98, 0.9) * uSpec * step(0.965, saturate(dot(nN, hV)));
         #endif
         #include <opaque_fragment>`,
      )
  }
  mat.customProgramCacheKey = () => 'rim2'
  return mat
}

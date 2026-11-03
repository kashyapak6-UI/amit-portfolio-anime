# Amit Kashyap: 3D scroll portfolio (step 1)

Vite + React + TypeScript, three, @react-three/fiber, @react-three/drei, GSAP ScrollTrigger, Lenis, Tailwind v4.

```bash
npm install
npm run dev -- --port 5173   # http://localhost:5173
npm run build && npm run preview
node shoot.mjs http://localhost:4173 screenshots   # headless screenshots (needs Chrome; set CHROME=path)
```

## How it works
- `src/App.tsx`: Lenis smooth scroll → GSAP ScrollTrigger master timeline → `scrollState.p` (0..1). DOM overlays (hero, stop cards) read the same `p`.
- `src/lib/timeline.ts`: beat boundaries, the CatmullRom rider path, camera rails (intro, ride, outro), stop positions.
- `src/scene/CameraRig.tsx`: maps `p` onto the camera rails; glances at the active landmark.
- `src/scene/Rider.tsx`: primitive child + bicycle (spinning wheels, pedalling legs, lamp). Replace with GLB later.
- `src/scene/Landmarks.tsx`: six company stops (primitive landmark art), one travelling accent light.
- `src/scene/FrostOverlay.tsx`: fullscreen frost shader that clears with scroll; pointer melts a patch.
- `src/scene/World.tsx`: ground, road, instanced pines/rocks, stars, dust, fog.
- `src/ui/Closing.tsx`: skills, tools, contact sections.
- `src/lib/data.ts`: CV content (companies, skills, tools, contact).

Beats (p): 0–0.12 frost clears · 0.125–0.175 turn + mount · 0.175–0.72 ride past 6 stops · 0.72–0.95 crane up, skills/tools · end contact.
Reduced motion: Lenis off, direct scrub, no idle sway.

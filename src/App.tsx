import { lazy, Suspense, useEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { BEAT, scrollState, smooth01, stopActivation, windowAt } from './lib/timeline'
import { COMPANIES } from './lib/data'
import { Closing } from './ui/Closing'
import { decay, fx, impact } from './lib/fx'

gsap.registerPlugin(ScrollTrigger)
const Experience = lazy(() => import('./scene/Experience'))

declare global {
  interface Window { __lenis?: Lenis; __scroll?: typeof scrollState }
}

export default function App() {
  const mobile = useMemo(() => window.matchMedia('(max-width: 768px), (pointer: coarse)').matches, [])
  const heroRef = useRef<HTMLDivElement>(null)
  const roadRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLElement | null)[]>([])
  const railRef = useRef<HTMLDivElement>(null)
  const speedRef = useRef<HTMLDivElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    scrollState.reduced = reduced
    fx.reduced = reduced
    window.__scroll = scrollState

    let lenis: Lenis | undefined
    const raf = (time: number) => lenis?.raf(time * 1000)
    if (!reduced) {
      lenis = new Lenis({ lerp: mobile ? 0.12 : 0.085, wheelMultiplier: 0.9, touchMultiplier: 1.4 })
      window.__lenis = lenis
      lenis.on('scroll', ScrollTrigger.update)
      gsap.ticker.add(raf)
      gsap.ticker.lagSmoothing(0)
    }

    // Master timeline: scroll → scrollState.p (0..1). Everything 3D reads p.
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: reduced ? true : 0.6 },
    })
    tl.to(scrollState, { p: 1, duration: 1 }, 0)

    // DOM overlays follow the same p every frame
    let lastP = scrollState.p
    let lastT = performance.now()
    let vel = 0
    let powered = false
    const hit = COMPANIES.map(() => false)
    const tick = () => {
      const p = scrollState.p
      const now = performance.now()
      const dt = Math.max(1, now - lastT) / 1000
      vel += (Math.abs(p - lastP) / dt - vel) * Math.min(1, dt * 6)
      lastP = p
      lastT = now
      const fdt = Math.min(dt, 0.1)
      const riding = windowAt(p, (BEAT.rideStart + BEAT.rideEnd) / 2, (BEAT.rideEnd - BEAT.rideStart) / 2 - 0.01, 0.02)
      fx.vel = vel
      fx.speed = Math.min(1, Math.max(0, vel * 22 - 0.15))

      // power level: charges while the fog clears, peaks at the power-up, then sustains with speed
      const charge = smooth01(0.05, 0.112, p)
      const sustain = p < BEAT.rideStart ? 1 : p <= BEAT.rideEnd ? 0.55 + 0.45 * fx.speed : 0.35 + 0.3 * smooth01(0.9, 1, p)
      fx.power += (charge * sustain - fx.power) * Math.min(1, fdt * 8)
      // rumble while charging, then the power-up flash frame
      if (!reduced && charge > 0.05 && charge < 1 && !powered) fx.trauma = Math.max(fx.trauma, charge * 0.35)
      if (p >= 0.112 && !powered) { powered = true; impact(1) }
      if (p < 0.09) powered = false

      // impact frame each time a company card lands
      cardRefs.current.forEach((el, i) => {
        const a = stopActivation(i, p)
        if (a > 0.55 && !hit[i]) {
          hit[i] = true
          fx.burst[i] = 1
          impact(0.55)
          el?.classList.remove('hit'); void el?.offsetWidth; el?.classList.add('hit')
        } else if (a < 0.2 && hit[i]) {
          hit[i] = false
          el?.classList.remove('hit')
        }
        fx.burst[i] = fx.burst[i] < 0.002 ? 0 : decay(fx.burst[i], 0.18, fdt)
      })
      fx.trauma = Math.max(0, fx.trauma - fdt * 1.4)
      fx.flash = fx.flash < 0.002 ? 0 : decay(fx.flash, 0.004, fdt)
      fx.ca = fx.ca < 0.002 ? 0 : decay(fx.ca, 0.02, fdt)
      if (flashRef.current) {
        // two-frame white hold, then a hard fade (anime impact frame)
        flashRef.current.style.opacity = String(fx.flash > 0.85 ? 0.9 : fx.flash * 0.6)
      }

      if (speedRef.current) {
        // anime speed lines while riding fast + focus lines during the power-up charge
        const s = Math.max(fx.speed * riding, reduced ? 0 : windowAt(p, 0.1, 0.018, 0.012) * 0.85)
        speedRef.current.style.opacity = String(s * 0.8)
        // re-randomise the rotation on twos so the lines flicker like hand-drawn cels
        if (s > 0.01) speedRef.current.style.transform = `rotate(${(Math.floor(now / 83) * 37) % 9}deg) scale(${1.05 + s * 0.1})`
      }
      if (heroRef.current) {
        const h = 1 - smooth01(0.035, 0.085, p)
        heroRef.current.style.opacity = String(h)
        heroRef.current.style.transform = `translate3d(0, ${(1 - h) * -40}px, 0)`
        heroRef.current.style.visibility = h < 0.01 ? 'hidden' : 'visible'
      }
      if (roadRef.current) {
        const r = windowAt(p, 0.15, 0.015, 0.02)
        roadRef.current.style.opacity = String(r)
        roadRef.current.style.transform = `translate3d(${(1 - r) * -30}px, 0, 0)`
      }
      cardRefs.current.forEach((el, i) => {
        if (!el) return
        const a = stopActivation(i, p)
        el.style.opacity = String(a)
        const pop = Math.round(Math.sin(fx.burst[i] * Math.PI) * 0.05 * 20) / 20
        el.style.transform = `translate3d(0, ${(1 - a) * 26}px, 0) scale(${1 + pop})`
        el.style.visibility = a < 0.01 ? 'hidden' : 'visible'
      })
      if (railRef.current) {
        const ride = smooth01(BEAT.rideStart, BEAT.rideEnd, p)
        railRef.current.style.transform = `scaleX(${ride})`
        railRef.current.parentElement!.style.opacity = String(windowAt(p, (BEAT.rideStart + BEAT.rideEnd) / 2, (BEAT.rideEnd - BEAT.rideStart) / 2, 0.02))
      }
    }
    gsap.ticker.add(tick)
    tick()

    return () => {
      gsap.ticker.remove(tick)
      gsap.ticker.remove(raf)
      tl.scrollTrigger?.kill()
      tl.kill()
      lenis?.destroy()
    }
  }, [mobile])

  return (
    <>
      {/* fixed 3D stage */}
      <div className="fixed inset-0 z-0">
        <Suspense fallback={<div className="h-full w-full bg-canvas" />}>
          <Experience mobile={mobile} />
        </Suspense>
        <div className="stage-vignette pointer-events-none absolute inset-0" />
        <div className="grain pointer-events-none absolute inset-0" />
        <div ref={speedRef} aria-hidden className="speed-lines pointer-events-none absolute inset-[-10%] motion-reduce:hidden" style={{ opacity: 0 }} />
        <div ref={flashRef} aria-hidden className="impact-flash pointer-events-none absolute inset-0 motion-reduce:hidden" style={{ opacity: 0 }} />
      </div>

      {/* top bar */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-black/5 bg-canvas/80 px-6 py-4 backdrop-blur-md md:px-10">
        <a href="#top" className="pointer-events-auto font-display text-xl tracking-wide text-ink">Amit Kashyap</a>
        <a href="#contact" className="pointer-events-auto rounded-full border border-gold/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gold transition-colors bg-white/40 backdrop-blur-sm hover:bg-gold hover:text-white">Hire me</a>
      </header>

      {/* fixed journey overlays */}
      <div className="pointer-events-none fixed inset-0 z-10">
        <div ref={heroRef} className="absolute bottom-[12vh] left-6 max-w-[40rem] md:left-14 [text-shadow:0_1px_18px_rgba(255,255,255,.7)]">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-gold">Graphic & Web UI Designer · Ludhiana</p>
          <h1 className="font-display text-[clamp(3.4rem,10vw,8.5rem)] font-medium leading-[0.88] text-ink">
            Amit<br />
            <em className="relative inline-block font-normal text-gold">
              Kashyap
              <svg aria-hidden viewBox="0 0 300 24" preserveAspectRatio="none" className="brush absolute -bottom-[0.08em] left-[-2%] h-[0.16em] w-[104%]">
                <path d="M4 15 C 60 6, 120 4, 180 9 S 270 16, 296 7" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
                <path d="M30 20 C 90 14, 160 13, 240 17" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".55" />
              </svg>
            </em>
          </h1>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-ink-soft">
            Four years of social creatives, brand systems and web UI. Clear the glass and come along for the ride.
          </p>
        </div>

        <div ref={roadRef} className="absolute left-6 top-[26vh] max-w-xs rounded-2xl border border-ink/10 bg-white/70 px-5 py-4 shadow-[5px_5px_0_rgba(30,26,46,.12)] backdrop-blur-sm md:left-14" style={{ opacity: 0 }}>
          <p className="font-display text-[clamp(2rem,4vw,3.4rem)] leading-[1] text-ink">Six studios.<br /><em className="text-gold">One road.</em></p>
        </div>

        {COMPANIES.map((c, i) => {
          // landmarks alternate sides; the card sits on the opposite side so the art stays visible
          const left = i % 2 === 1
          return (
            <article
              key={c.name}
              ref={(el) => { cardRefs.current[i] = el }}
              className={`stop-card absolute bottom-[10vh] w-[min(88vw,24rem)] rounded-2xl border border-ink/10 bg-white/80 p-6 shadow-[6px_6px_0_rgba(30,26,46,.13)] backdrop-blur-md md:bottom-auto md:top-[12vh] ${left ? 'left-6 md:left-14' : 'right-6 md:right-14'}`}
              style={{ opacity: 0, visibility: 'hidden' }}
            >
              <div className="mb-5 flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-soft">{c.period}</span>
              </div>
              <h2 className="font-display text-[2.3rem] font-medium leading-[1] text-ink">{c.name}</h2>
              <p className="mt-2 text-sm font-semibold text-gold">{c.role}</p>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">{c.note}</p>
              <p className="mt-5 text-xs uppercase tracking-[0.2em] text-ink-soft/70">{c.place}</p>
            </article>
          )
        })}

        {/* journey progress hairline */}
        <div className="absolute inset-x-6 bottom-6 h-px bg-black/15 md:inset-x-14" style={{ opacity: 0 }}>
          <div ref={railRef} className="h-full origin-left bg-gold" style={{ transform: 'scaleX(0)' }} />
        </div>
      </div>

      {/* scroll track: the journey spacer, then real sections */}
      <main id="top" className="relative z-20">
        <section aria-label="Journey" className="h-[880vh]">
          <h2 className="sr-only">Career journey</h2>
          <ol className="sr-only">
            {COMPANIES.map((c) => (
              <li key={c.name}>{c.name}, {c.role}, {c.period}, {c.place}</li>
            ))}
          </ol>
        </section>
        <Closing />
      </main>
    </>
  )
}

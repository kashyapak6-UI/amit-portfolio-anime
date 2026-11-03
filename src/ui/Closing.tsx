import { useEffect, useRef, useState } from 'react'
import { CONTACT, SKILLS, TOOLS } from '../lib/data'
import { impact } from '../lib/fx'

/** Power-level stats, all taken from the CV data (1000+ creatives, six studios, 12–13 a day at agency pace). */
const STATS = [
  { value: 1000, suffix: '+', label: 'Creatives' },
  { value: 6, suffix: '', label: 'Studios' },
  { value: 13, suffix: '/day', label: 'Peak pace' },
  { value: SKILLS.length, suffix: '', label: 'Disciplines' },
]

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Scouter-style counter: climbs in stepped "on twos" ticks with an overshoot jitter, then locks. */
function PowerCounter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [n, setN] = useState(() => (reducedMotion() ? value : 0))
  useEffect(() => {
    if (reducedMotion() || !ref.current) return
    let timer = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const start = performance.now()
      const dur = 1400
      const step = () => {
        const k = Math.min(1, (performance.now() - start) / dur)
        const eased = 1 - Math.pow(1 - k, 3)
        const jitter = k < 1 ? 1 + (Math.random() - 0.5) * 0.08 * (1 - k) : 1
        setN(Math.min(value, Math.round(value * eased * jitter)))
        if (k < 1) timer = window.setTimeout(step, 83) // 12fps = anime on twos
      }
      step()
    }, { threshold: 0.6 })
    io.observe(ref.current)
    return () => { io.disconnect(); clearTimeout(timer) }
  }, [value])
  return <span ref={ref} className="power-num">{n}{suffix}</span>
}

export function Closing() {
  const contactRef = useRef<HTMLElement>(null)
  const [charged, setCharged] = useState(false)
  useEffect(() => {
    if (!contactRef.current) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setCharged(true); impact(0.7); io.disconnect() }
    }, { threshold: 0.45 })
    io.observe(contactRef.current)
    return () => io.disconnect()
  }, [])
  return (
    <>
      <section id="skills" className="relative flex min-h-[120vh] items-center px-6 py-28 md:px-14">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-canvas/75 to-canvas/90" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-14 md:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-gold">What I make</p>
            <h2 className="font-display text-[clamp(2.6rem,5.5vw,4.6rem)] font-medium leading-[0.95] text-ink">
              Work that stops<br />the <em className="text-gold">thumb.</em>
            </h2>
            <p className="mt-6 max-w-sm text-ink-soft">1000+ social creatives designed for gaming, tech, real estate and marketing brands, with a strong remote track record.</p>
            <dl className="mt-10 grid max-w-sm grid-cols-2 gap-3">
              {STATS.map((st) => (
                <div key={st.label} className="ki-card rounded-xl bg-white/85 px-4 py-3">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.28em] text-ink-soft">{st.label}</dt>
                  <dd className="mt-1 text-3xl font-black italic tracking-tight text-[#ffb21a]"><PowerCounter value={st.value} suffix={st.suffix} /></dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {SKILLS.map((s) => (
              <div key={s.title} className="ki-card rounded-2xl border-[3px] border-ink bg-surface/90 p-6 shadow-[6px_6px_0_#1e1a2e] backdrop-blur-sm transition-transform hover:-translate-y-1">
                <h3 className="font-display text-2xl text-ink">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="tools" className="relative flex min-h-[80vh] items-center bg-canvas/85 px-6 py-24 md:px-14">
        <div className="mx-auto w-full max-w-6xl md:text-right">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.32em] text-gold">Toolkit</p>
          <ul className="flex flex-wrap gap-x-8 gap-y-2 md:justify-end">
            {TOOLS.map((t) => (
              <li key={t} className="font-display text-[clamp(2.4rem,6vw,5.4rem)] leading-[1.05] text-ink/90 transition-colors hover:text-gold">{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <section ref={contactRef} id="contact" className="relative flex min-h-[100vh] items-center bg-canvas px-6 py-24 md:px-14">
        <div className="mx-auto grid w-full max-w-6xl items-end gap-12 md:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-gold">Hire me</p>
            <h2 className="font-display text-[clamp(3rem,7.5vw,6.8rem)] font-medium leading-[0.9] text-ink">
              Let's build the<br />next <em className="text-gold">stop.</em>
            </h2>
            <div className="relative mt-12 inline-block">
              {charged && <span aria-hidden className="charged-burst pointer-events-none absolute inset-0 -z-10 rounded-full bg-[radial-gradient(closest-side,#fff7c2,#ffc22e_45%,transparent_70%)]" />}
              <a href={`mailto:${CONTACT.email}`} className="charge-cta inline-flex items-center gap-3 rounded-full border-[3px] border-ink bg-gold px-7 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-[4px_4px_0_#1e1a2e] transition-transform hover:-translate-y-0.5">
                Start a project
              </a>
            </div>
          </div>
          <dl className="space-y-6 border-l border-black/10 pl-8 text-sm">
            <div><dt className="text-xs uppercase tracking-[0.24em] text-ink-soft">Email</dt><dd className="mt-1"><a className="text-lg text-ink hover:text-gold" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></dd></div>
            <div><dt className="text-xs uppercase tracking-[0.24em] text-ink-soft">Phone</dt><dd className="mt-1"><a className="text-lg text-ink hover:text-gold" href={CONTACT.phoneHref}>{CONTACT.phone}</a></dd></div>
            <div><dt className="text-xs uppercase tracking-[0.24em] text-ink-soft">Based in</dt><dd className="mt-1 text-lg text-ink">{CONTACT.place}</dd></div>
          </dl>
        </div>
      </section>
    </>
  )
}

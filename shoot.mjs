// Headless verification: screenshots at scroll positions + console error capture.
// usage: node shoot.mjs [url] [outDir]
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const url = process.argv[2] || 'http://localhost:4173'
const out = process.argv[3] || 'screenshots'
fs.mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const errors = []
const run = async (name, viewport, positions, reduced = false) => {
  const page = await browser.newPage()
  await page.setViewport(viewport)
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${name}] ${m.type()}: ${m.text()}`) })
  page.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${e.message}`))
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 })
  await new Promise((r) => setTimeout(r, 2500))
  for (const pct of positions) {
    await page.evaluate((pct) => {
      const max = document.documentElement.scrollHeight - innerHeight
      const y = Math.round(max * pct / 100)
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true })
      else window.scrollTo(0, y)
    }, pct)
    await new Promise((r) => setTimeout(r, 2200))
    const p = await page.evaluate(() => window.__scroll?.p)
    const file = `${out}/${name}-${String(pct).padStart(2, '0')}.png`
    await page.screenshot({ path: file })
    console.log(file, 'p=', p?.toFixed(3))
  }
  await page.close()
}
await run('desktop', { width: 1440, height: 900 }, (process.env.POS || '0,20,50,90').split(',').map(Number))
if (process.env.EXTRA) {
  await run('mobile', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, [0, 20, 50, 90])
  await run('reduced', { width: 1440, height: 900 }, [0, 50], true)
}
await browser.close()
console.log(errors.length ? 'CONSOLE:\n' + errors.join('\n') : 'No console errors or warnings')

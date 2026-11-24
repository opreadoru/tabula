// The field behind the Ask start page: a grid of heatmap cells that brighten and fade in slow
// waves, with a ripple now and then, the way a heatmap fills as data arrives. Colours are the
// theme's accent and AI tokens, read from the page, so the field follows light and dark. The page
// masks the middle, where the text sits. With reduced motion it draws one still frame.
//
//   const field = mountField(canvas)   field.start()   field.stop()

const CELL = 12
const GAP = 4
const STEP = CELL + GAP
const FRAME_MS = 1000 / 30

export function mountField(canvas) {
  const ctx = canvas.getContext('2d')
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)')
  let raf = 0
  let running = false
  let last = 0
  let cols = 0
  let rows = 0
  let colours = null
  let pulses = []
  let nextPulse = 0
  const t0 = performance.now()

  const readColours = () => {
    const css = getComputedStyle(document.documentElement)
    // A dark canvas swallows faint cells, so the dark theme draws them stronger.
    colours = { base: css.getPropertyValue('--tb-accent').trim(), pulse: css.getPropertyValue('--tb-ai').trim(), boost: document.documentElement.classList.contains('tb-dark') ? 1.9 : 1 }
  }
  new MutationObserver(readColours).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  function size() {
    const dpr = window.devicePixelRatio || 1
    const { width, height } = canvas.getBoundingClientRect()
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    cols = Math.ceil(width / STEP)
    rows = Math.ceil(height / STEP)
  }

  function draw(now) {
    const t = (now - t0) / 1000
    if (!colours) readColours()
    if (!calm.matches && t > nextPulse) {
      // A ripple starts away from the middle, where the text is.
      const side = Math.random() < 0.5 ? Math.random() * 0.3 : 0.7 + Math.random() * 0.3
      pulses.push({ x: side * cols, y: Math.random() * rows, t })
      pulses = pulses.filter(p => t - p.t < 6)
      nextPulse = t + 1.6 + Math.random() * 1.6
    }
    ctx.clearRect(0, 0, cols * STEP, rows * STEP)
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const wave = 0.5 + 0.5 * Math.sin(x * 0.16 + t * 0.5) * Math.cos(y * 0.21 - t * 0.35) * Math.sin((x + y) * 0.05 + t * 0.2)
        let ring = 0
        for (const p of pulses) {
          const age = t - p.t
          const d = Math.hypot(x - p.x, y - p.y)
          ring = Math.max(ring, Math.exp(-((d - age * 7) ** 2) / 6) * Math.max(0, 1 - age / 6))
        }
        ctx.globalAlpha = (0.03 + 0.2 * wave ** 3) * colours.boost
        ctx.fillStyle = colours.base
        ctx.fillRect(x * STEP, y * STEP, CELL, CELL)
        if (ring > 0.02) {
          ctx.globalAlpha = Math.min(1, ring * 0.45 * colours.boost)
          ctx.fillStyle = colours.pulse
          ctx.fillRect(x * STEP, y * STEP, CELL, CELL)
        }
      }
    }
    ctx.globalAlpha = 1
  }

  function loop(now) {
    if (!running) return
    if (now - last >= FRAME_MS) {
      last = now
      draw(now)
    }
    raf = requestAnimationFrame(loop)
  }

  new ResizeObserver(() => { if (running) { size(); draw(performance.now()) } }).observe(canvas)

  return {
    start() {
      if (running) return
      running = true
      size()
      draw(performance.now())
      if (!calm.matches) raf = requestAnimationFrame(loop)
    },
    stop() {
      running = false
      cancelAnimationFrame(raf)
    },
  }
}

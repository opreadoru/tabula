// The documentation site. One page, a sidebar of topics, each topic a section rendered from
// its module. Sections are plain HTML strings so any agent can write one without a framework.
import { tb } from '../src/tabula.js'
import { sections as gettingStarted } from './sections/getting-started.js'
import { sections as foundations } from './sections/foundations.js'
import { sections as controls } from './sections/controls.js'
import { sections as surfaces } from './sections/surfaces.js'
import { sections as patterns, dataSections } from './sections/patterns.js'
import { chartsSection } from './sections/charts.js'

const groups = [
  { title: 'Getting started', sections: gettingStarted },
  { title: 'Foundations', sections: foundations },
  { title: 'Controls', sections: controls },
  { title: 'Surfaces', sections: surfaces },
  { title: 'Patterns', sections: patterns },
  { title: 'Data', sections: [dataSections[0], chartsSection, ...dataSections.slice(1)] },
]

const app = document.getElementById('app')

// #only-<id> renders a single section, used for screenshots and for sharing one topic.
const only = location.hash.startsWith('#only-') ? location.hash.slice(6) : null
const visible = g => only ? g.sections.filter(s => s.id === only) : g.sections

// The opening of the site: the mark large, who made it, where to start, and what is inside.
// Counts come from the groups, so they stay right as sections are added.
const count = title => groups.find(g => g.title === title).sections.length
function heroHtml() {
  const cards = [
    { href: '#overview', title: 'Getting started', text: 'Install, use in HTML or React, theme and conventions.', n: count('Getting started'), unit: 'guides' },
    { href: '#principles', title: 'Foundations', text: 'Colour, type, spacing, shape, motion, formatting, states and icons.', n: count('Foundations'), unit: 'topics' },
    { href: '#button', title: 'Components', text: 'Controls and surfaces for dense business screens.', n: count('Controls') + count('Surfaces'), unit: 'components' },
    { href: '#avatar', title: 'Patterns', text: 'Stats, lists, filters, the app shell, edit mode, charts and tree views.', n: count('Patterns') + count('Data'), unit: 'patterns' },
  ]
  return `
      <header class="doc-hero">
        <div class="doc-hero-band">
          <div class="doc-hero-marks" aria-hidden="true">
            <span class="tb-brand-mark doc-hero-mark"></span>
          </div>
          <div class="doc-hero-text">
            <span class="doc-kicker">An open design system for data-dense products</span>
            <h1>Tabula</h1>
            <p class="doc-hero-lead">Dense, sharp and quiet, built for people who read numbers all day. Everything is a token or a class, so it drops into any front end, with thin React wrappers when you want them.</p>
            <p class="doc-hero-by">Designed and built by <a href="https://opreadoru.com" target="_blank" rel="noopener">Alex Oprea</a>. Version 0.1, September 2026. Free and open source under the MIT licence.</p>
            <div class="doc-hero-actions">
              <a class="tb-button tb-button--primary" href="#overview">Get started</a>
            </div>
          </div>
        </div>
        <nav class="doc-hero-cards" aria-label="Sections">
          ${cards.map(c => `
            <a class="tb-card tb-card--interactive doc-hero-card" href="${c.href}">
              <span class="doc-hero-card-n">${c.n}</span>
              <span class="doc-hero-card-unit">${c.unit}</span>
              <strong>${c.title}</strong>
              <span class="doc-hero-card-text">${c.text}</span>
            </a>`).join('')}
        </nav>
      </header>`
}

function render() {
  app.innerHTML = `
    <aside class="tb-card doc-nav">
      <div class="tb-card-header doc-brand">
        <span class="tb-brand-mark" aria-hidden="true"></span>
        <span>Tabula</span>
        <span class="doc-version">0.1</span>
      </div>
      <nav class="doc-nav-scroll" aria-label="Documentation">
        ${groups.map(g => `
          <div class="doc-nav-group">
            <div class="doc-nav-title">${g.title}</div>
            ${g.sections.map(s => `<a class="doc-nav-link" href="#${s.id}">${s.title}</a>`).join('')}
          </div>
        `).join('')}
      </nav>
      <div class="tb-card-footer doc-nav-foot">
        <button class="tb-button tb-button--minimal" data-tb-theme-toggle type="button">Dark theme</button>
      </div>
    </aside>
    <main class="doc-main">
      ${only ? '' : heroHtml()}
      ${groups.map(g => visible(g).map(s => `
        <section class="doc-section" id="${s.id}">
          <div class="doc-section-head">
            <span class="doc-kicker">${g.title}</span>
            <h2>${s.title}</h2>
            ${s.lead ? `<p class="doc-lead">${s.lead}</p>` : ''}
          </div>
          ${s.body}
        </section>
      `).join('')).join('')}
    </main>
    <button class="tb-button tb-button--icon tb-button--lg doc-top" type="button" aria-label="Back to top" data-tb-tooltip="Back to top" data-doc-top>
      <svg class="tb-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg>
    </button>
  `
  tb.init(app)
  // A section with live components (charts, the tree views) mounts them once its markup is in.
  groups.forEach(g => visible(g).forEach(s => { if (s.mount) s.mount(document.getElementById(s.id)) }))
  wireNav()
  wireTheme()
  wireTop()
}

// Back to top: floats bottom right once the page has scrolled about a screen, and takes the
// reader back to the hero.
function wireTop() {
  const btn = app.querySelector('[data-doc-top]')
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)')
  const update = () => btn.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.8)
  window.addEventListener('scroll', update, { passive: true })
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: calm.matches ? 'auto' : 'smooth' }))
  update()
}

// The menu follows the reading: the current section is marked, and the list scrolls itself to
// keep that link in the middle of the card. It has its own thin scrollbar; the edges fade when more of
// the list is hidden above or below.
function wireNav() {
  const links = [...app.querySelectorAll('.doc-nav-link')]
  const sections = [...app.querySelectorAll('.doc-section')]
  const area = app.querySelector('.doc-nav-scroll')
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)')

  const edges = () => {
    area.classList.toggle('can-up', area.scrollTop > 2)
    area.classList.toggle('can-down', area.scrollTop + area.clientHeight < area.scrollHeight - 2)
  }
  const reveal = link => {
    if (area.scrollHeight <= area.clientHeight) return
    const top = link.offsetTop - (area.clientHeight - link.offsetHeight) / 2
    area.scrollTo({ top: Math.max(0, top), behavior: calm.matches ? 'auto' : 'smooth' })
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return
      links.forEach(l => {
        const on = l.getAttribute('href') === `#${e.target.id}`
        l.classList.toggle('is-active', on)
        if (on) { l.setAttribute('aria-current', 'location'); reveal(l) } else l.removeAttribute('aria-current')
      })
    })
  }, { rootMargin: '-20% 0px -70% 0px' })
  sections.forEach(s => io.observe(s))

  area.addEventListener('scroll', edges, { passive: true })
  window.addEventListener('resize', edges)
  edges()
}

function wireTheme() {
  const btn = app.querySelector('[data-tb-theme-toggle]')
  const apply = dark => {
    document.documentElement.classList.toggle('tb-dark', dark)
    btn.textContent = dark ? 'Light theme' : 'Dark theme'
    try { localStorage.setItem('tb-theme', dark ? 'dark' : 'light') } catch { /* ignore */ }
  }
  let dark = true
  try { dark = localStorage.getItem('tb-theme') !== 'light' } catch { /* ignore */ }
  apply(dark)
  btn.addEventListener('click', () => { dark = !dark; apply(dark) })
}

render()

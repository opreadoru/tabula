// App shell: the app bar every product page shares. Brand, the tabs with their submenus, the menu
// dock (top bar or left sidebar, collapsible to a rail of icons) and the account menu with the
// theme switch. The classes come from elements-shell.css; this script renders them and wires the
// behaviour. The product passes its own brand, tabs, submenus and account in, so nothing here
// knows what the product is.
//
// A page calls mountShell once, before it renders anything that measures the layout:
//
//   import { mountShell } from '../src/shell.js'
//   mountShell({ brand, nav, menus, account, active: 'dashboard' })
//
//   brand    { name, href }                      the stack and the name, linking to href
//   nav      [{ id, label, href, icon, badge, context }]
//            badge is the count of what waits for the user there (0 shows nothing), context the
//            inventory shown in the submenu heading
//   menus    { [tabId]: [{ label, href } | { label, todo }, hint?] }  href opens a place, todo shows
//            the not-built toast
//   account  { name, initials, email, org }
//   active   the id of the current tab, or null
//   layout   'free' mounts the layout editor on the page's main (edit.js) when it marks sections
//            with data-tb-section; 'stage' (the default) keeps the page's cards in place and, if
//            the main holds a zone (data-tb-zone), lets the user add widgets there (zone.js)
//   page     names the saved layout when it differs from active
//   widgets  the widget catalogue for the editor and zones; note, a line under it
//
// The page hears about changes through two events on document:
//   'shell:dock'  detail { left }  after the menu moved or collapsed, so a page can refit
//   'shell:theme' detail { dark }  after the theme changed, for anything not drawn with tokens
//
// Choices are kept in localStorage: tb-theme (dark or light, dark when nothing is saved), tb-nav
// (left or top) and tb-nav-collapsed (1 or 0). HEAD_SNIPPET applies them before the first paint.
//
// Screenshot flags on the hash: #nav-left (also joined with +, as #zone+nav-left), #nav-collapsed,
// #account opens the account menu, #submenu the first submenu. edit.js, zone.js, expand.js and
// collapse.js read their own.
import { tb } from './tabula.js'
import { mountEditMode } from './edit.js'
import { mountZone } from './zone.js'
import { fmtCompact, fmtInt, esc } from './format.js'
import './expand.js'
import './focus.js'
import './collapse.js'

// Every page copies this into its <head>, before the stylesheets, so the theme and the menu
// placement are right on the first paint.
export const HEAD_SNIPPET = `<script>try { var s = localStorage, h = document.documentElement.classList; if (s.getItem('tb-theme') !== 'light') h.add('tb-dark'); if (s.getItem('tb-nav') === 'left') h.add('tb-nav-left'); if (s.getItem('tb-nav-collapsed') === '1') h.add('tb-nav-collapsed') } catch (e) {}</script>`

export const notBuilt = name => tb.toast({ message: `${name} is a separate screen, not built in these templates.` })

// Lucide icons (lucide-static, ISC), inlined on their 24 grid.
export const lucide = (body, cls = '') => `<svg class="tb-icon${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`

const I = {
  dockLeft: lucide('<rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" />', 'tb-appbar-when-top'),
  dockTop: lucide('<rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" />', 'tb-appbar-when-left'),
  collapse: lucide('<rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path d="m16 15-3-3 3-3" />', 'tb-appbar-when-expanded'),
  expand: lucide('<rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path d="m14 9 3 3-3 3" />', 'tb-appbar-when-collapsed'),
  chevron: lucide('<path d="m6 9 6 6 6-6" />', 'tb-appbar-account-chevron'),
  subChevron: lucide('<path d="m6 9 6 6 6-6" />'),
  profile: lucide('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />'),
  settings: lucide('<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" /><circle cx="12" cy="12" r="3" />'),
  language: lucide('<circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />'),
  moon: lucide('<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />', 'tb-light-only'),
  sun: lucide('<circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />', 'tb-dark-only'),
  help: lucide('<circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />'),
  logout: lucide('<path d="m16 17 5-5-5-5" /><path d="M21 12H9" /><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />'),
  layout: lucide('<rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />'),
}

const hintHtml = hint => (hint ? `<span class="tb-menu-hint">${esc(hint)}</span>` : '')
const subItemHtml = item => item.href
  ? `<a class="tb-menu-item" role="menuitem" href="${esc(item.href)}"><span class="tb-menu-label">${esc(item.label)}</span>${hintHtml(item.hint)}</a>`
  : `<button class="tb-menu-item" type="button" role="menuitem" data-shell-todo="${esc(item.todo || item.label)}"><span class="tb-menu-label">${esc(item.label)}</span>${hintHtml(item.hint)}</button>`

// A tab: the link, a chevron that opens its submenu, and the submenu. On top the submenu drops
// down; in the left sidebar, open or collapsed, it flies out beside the sidebar.
const tabHtml = (tab, active, menus) => {
  const menu = menus[tab.id] || []
  const current = tab.id === active
  return `<div class="tb-appbar-nav-item${current ? ' is-current' : ''}" data-shell-item="${esc(tab.id)}">
    <a class="tb-tab${current ? ' is-active' : ''}" href="${esc(tab.href)}"${current ? ' aria-current="page"' : ''}>
      ${tab.icon || ''}
      <span class="tb-appbar-nav-label">${esc(tab.label)}</span>${tab.badge ? `<span class="tb-appbar-nav-badge" aria-label="${fmtInt(tab.badge)} waiting">${fmtCompact(tab.badge)}</span>` : ''}
    </a>${menu.length ? `
    <button class="tb-appbar-nav-toggle" type="button" aria-expanded="false" aria-controls="shell-sub-${esc(tab.id)}" aria-label="${esc(tab.label)} menu">${I.subChevron}</button>
    <div class="tb-popover tb-appbar-submenu" id="shell-sub-${esc(tab.id)}">
      <div class="tb-menu" role="menu" aria-label="${esc(tab.label)}">
        <div class="tb-menu-heading">${esc(tab.label)}${tab.context ? `<span class="tb-menu-heading-note">${esc(tab.context)}</span>` : ''}</div>
        ${menu.map(subItemHtml).join('')}
      </div>
    </div>` : ''}
  </div>`
}

const todo = (name, iconHtml, label, hint = '') => `<button class="tb-menu-item" type="button" role="menuitem" data-shell-todo="${esc(name)}">${iconHtml}<span class="tb-menu-label">${esc(label)}</span>${hintHtml(hint)}</button>`

const barHtml = ({ brand, nav, menus, account, active }) => `
  <a class="tb-appbar-brand" href="${esc(brand.href || '#')}" aria-label="${esc(brand.name)}, home"><span class="tb-brand-mark" aria-hidden="true"></span><span class="tb-appbar-brand-name">${esc(brand.name)}</span></a>
  <nav class="tb-tabs tb-appbar-nav" id="shell-nav" aria-label="Main">${nav.map(tab => tabHtml(tab, active, menus)).join('')}</nav>
  <span class="tb-spacer"></span>
  <div class="tb-appbar-tools">
    <button class="tb-button tb-button--minimal tb-button--icon tb-appbar-collapse" type="button" id="shell-collapse" aria-label="Collapse the menu" data-tb-tooltip="Collapse the menu">${I.collapse}${I.expand}</button>
    <button class="tb-button tb-button--minimal tb-button--icon tb-appbar-dock" type="button" id="shell-dock" aria-label="Move the menu to the left" data-tb-tooltip="Move the menu to the left">${I.dockLeft}${I.dockTop}</button>
  </div>
  <div class="tb-dropdown tb-appbar-account">
    <button class="tb-appbar-account-trigger" type="button" data-tb-dropdown aria-label="Account">
      <span class="tb-avatar" aria-hidden="true">${esc(account.initials)}</span>
      <span class="tb-appbar-account-text">
        <span class="tb-appbar-account-name">${esc(account.name)}</span>
        <span class="tb-appbar-account-org">${esc(account.org)}</span>
      </span>
      ${I.chevron}
    </button>
    <div class="tb-popover tb-popover--end">
      <div class="tb-menu" role="menu">
        <div class="tb-menu-heading">${esc(account.email)}</div>
        ${todo('Profile', I.profile, 'Profile')}
        ${todo('Settings', I.settings, 'Settings', 'Ctrl+,')}
        ${todo('Language', I.language, 'Language', 'English')}
        <button class="tb-menu-item" type="button" role="menuitem" id="shell-theme" aria-pressed="false">${I.moon}${I.sun}<span class="tb-menu-label" id="shell-theme-label">Dark theme</span></button>
        ${todo('Help', I.help, 'Get help')}
        <div class="tb-menu-divider" role="separator"></div>
        ${todo('Log out', I.logout, 'Log out')}
      </div>
    </div>
  </div>`

const html = document.documentElement
const flags = () => location.hash.slice(1).split('+')
function recall(key) {
  try { return localStorage.getItem(key) } catch { return null }
}
function remember(key, value) {
  try { localStorage.setItem(key, value) } catch { /* private mode: the choice lasts until reload */ }
}

export function mountShell({ brand = { name: 'Tabula', href: '/' }, nav = [], menus = {}, account, active = null, layout = 'stage', page = null, widgets = [], note = '' } = {}) {
  document.body.classList.add('tb-app-shell')
  let header = document.querySelector('header[data-shell]')
  if (!header) {
    header = document.createElement('header')
    header.setAttribute('data-shell', '')
    document.body.prepend(header)
  }
  header.className = 'tb-appbar'
  header.innerHTML = barHtml({ brand, nav, menus, account, active })

  const dockBtn = header.querySelector('#shell-dock')
  const setDock = (left, save = true) => {
    html.classList.toggle('tb-nav-left', left)
    const label = left ? 'Move the menu to the top' : 'Move the menu to the left'
    dockBtn.setAttribute('aria-label', label)
    dockBtn.setAttribute('data-tb-tooltip', label)
    if (save) remember('tb-nav', left ? 'left' : 'top')
  }
  setDock(recall('tb-nav') === 'left' || html.classList.contains('tb-nav-left') || flags().includes('nav-left') || flags().includes('nav-collapsed'), false)
  // The move plays as a view transition (see tb-docking in elements-shell.css). Browsers without
  // view transitions, and reduced motion, switch at once.
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)')
  dockBtn.addEventListener('click', () => {
    const move = () => {
      setDock(!html.classList.contains('tb-nav-left'))
      document.dispatchEvent(new CustomEvent('shell:dock', { detail: { left: html.classList.contains('tb-nav-left') } }))
    }
    if (!document.startViewTransition || calm.matches) return move()
    html.classList.add('tb-docking')
    document.startViewTransition(move).finished.finally(() => html.classList.remove('tb-docking'))
  })

  // Collapse, for the left sidebar only: icons alone, names move into tooltips. Remembered.
  const collapseBtn = header.querySelector('#shell-collapse')
  const setCollapsed = (collapsed, save = true) => {
    html.classList.toggle('tb-nav-collapsed', collapsed)
    const label = collapsed ? 'Expand the menu' : 'Collapse the menu'
    collapseBtn.setAttribute('aria-label', label)
    collapseBtn.setAttribute('data-tb-tooltip', label)
    header.querySelectorAll('#shell-nav .tb-tab').forEach(tab => {
      const name = tab.querySelector('.tb-appbar-nav-label').textContent
      if (collapsed) tab.setAttribute('data-tb-tooltip', name)
      else tab.removeAttribute('data-tb-tooltip')
    })
    if (save) remember('tb-nav-collapsed', collapsed ? '1' : '0')
  }
  setCollapsed(recall('tb-nav-collapsed') === '1' || html.classList.contains('tb-nav-collapsed') || flags().includes('nav-collapsed'), false)
  // The bar animates its width, so pages hear about it once it has settled.
  collapseBtn.addEventListener('click', () => {
    setCollapsed(!html.classList.contains('tb-nav-collapsed'))
    tb.init(header)
    const settle = parseFloat(getComputedStyle(header).transitionDuration) * 1000 || 0
    setTimeout(() => document.dispatchEvent(new CustomEvent('shell:dock', { detail: { left: html.classList.contains('tb-nav-left') } })), settle)
  })

  // Theme, remembered under the same key as the documentation site.
  const themeBtn = header.querySelector('#shell-theme')
  const themeLabel = header.querySelector('#shell-theme-label')
  const setTheme = (dark, save = true) => {
    html.classList.toggle('tb-dark', dark)
    themeBtn.setAttribute('aria-pressed', String(dark))
    themeLabel.textContent = dark ? 'Light theme' : 'Dark theme'
    if (save) remember('tb-theme', dark ? 'dark' : 'light')
  }
  setTheme(html.classList.contains('tb-dark'), false)
  themeBtn.addEventListener('click', () => {
    setTheme(!html.classList.contains('tb-dark'))
    document.dispatchEvent(new CustomEvent('shell:theme', { detail: { dark: html.classList.contains('tb-dark') } }))
  })

  header.querySelectorAll('[data-shell-todo]').forEach(item => item.addEventListener('click', () => notBuilt(item.dataset.shellTodo)))

  // Submenus. They float everywhere: below the bar on top, beside the sidebar on the left. They
  // open on hover, after a short delay so a pass across the bar does not flash them, and on the
  // chevron. Escape and an outside click close them.
  const items = [...header.querySelectorAll('.tb-appbar-nav-item')]
  const setOpen = (item, open) => {
    item.classList.toggle('is-open', open)
    item.querySelector('.tb-appbar-nav-toggle')?.setAttribute('aria-expanded', String(open))
  }
  const closeFloating = except => items.forEach(i => { if (i !== except) setOpen(i, false) })
  items.forEach(item => {
    const toggle = item.querySelector('.tb-appbar-nav-toggle')
    if (!toggle) return
    let timer = 0
    item.addEventListener('mouseenter', () => {
      clearTimeout(timer)
      timer = setTimeout(() => { closeFloating(item); setOpen(item, true) }, 120)
    })
    item.addEventListener('mouseleave', () => {
      clearTimeout(timer)
      timer = setTimeout(() => setOpen(item, false), 220)
    })
    toggle.addEventListener('click', e => {
      e.stopPropagation()
      const open = !item.classList.contains('is-open')
      closeFloating(item)
      setOpen(item, open)
      if (open) item.querySelector('.tb-appbar-submenu .tb-menu-item')?.focus()
    })
    item.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return
      setOpen(item, false)
      toggle.focus()
    })
  })
  document.addEventListener('click', e => { if (!e.target.closest('.tb-appbar-nav-item')) closeFloating(null) })
  // Moving or collapsing the menu closes any open submenu.
  document.addEventListener('shell:dock', () => closeFloating(null))
  if (location.hash === '#submenu') setTimeout(() => { const i = items.find(x => x.querySelector('.tb-appbar-nav-toggle')); if (i) setOpen(i, true) }, 50)

  // Edit page. On a free page, the layout editor on the page's main; on a stage, its widget zone.
  // It acts on the page, so its button leads the page's own actions in the page toolbar. Pages
  // with nothing to change hide it.
  const editBtn = document.createElement('button')
  editBtn.className = 'tb-button tb-button--minimal tb-button--icon'
  editBtn.type = 'button'
  editBtn.id = 'shell-edit'
  editBtn.setAttribute('aria-label', 'Edit page layout')
  editBtn.setAttribute('aria-pressed', 'false')
  editBtn.setAttribute('data-tb-tooltip', 'Edit page layout')
  editBtn.innerHTML = I.layout
  const actions = document.querySelector('.tb-page-toolbar .tb-page-actions')
  if (actions) { actions.prepend(editBtn); tb.init(editBtn) }
  else editBtn.hidden = true
  const main = document.querySelector('main.tb-page-main') || document.querySelector('main')
  const key = page || active || location.pathname.split('/').pop().replace(/\.html$/, '')
  const zone = main?.querySelector('[data-tb-zone]')
  if (actions && main && layout === 'free' && main.querySelector(':scope > [data-tb-section]')) {
    header.editMode = mountEditMode({ main, page: key, button: editBtn, widgets, note })
  } else if (actions && zone) {
    const label = 'Add widgets'
    editBtn.setAttribute('aria-label', label)
    editBtn.setAttribute('data-tb-tooltip', label)
    header.zone = mountZone({ zone, page: key, button: editBtn, stage: nav.find(tab => tab.id === active)?.label || 'This page', widgets, note })
  } else {
    editBtn.hidden = true
  }

  tb.init(header)
  if (location.hash === '#account') setTimeout(() => header.querySelector('.tb-appbar-account-trigger').click(), 50)
  return header
}

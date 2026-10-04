// The templates' own shell: their brand, tabs, submenus and account, passed to the system shell
// (src/shell.js). Every template page calls mountPage once, before it renders anything that
// measures the layout.
import { mountShell, lucide } from '../../src/shell.js'
import { fmtInt } from '../../src/format.js'
import { USER, counts } from './data.js'

export const NAV = [
  { id: 'dashboard', label: 'Dashboard', href: './dashboard.html', badge: 0, context: 'Last 12 months',
    icon: lucide('<path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" />') },
  { id: 'analytics', label: 'Analytics', href: './analytics.html', badge: 0, context: `${fmtInt(counts.countries)} countries, ${fmtInt(counts.products)} products`,
    icon: lucide('<path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />') },
  { id: 'accounts', label: 'Accounts', href: './table.html', badge: counts.atRisk, context: `${fmtInt(counts.accounts)} accounts`,
    icon: lucide('<path d="M10 12h4" /><path d="M10 8h4" /><path d="M14 21v-3a2 2 0 0 0-4 0v3" /><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" /><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />') },
  { id: 'report', label: 'Report', href: './report.html', badge: 0, context: 'Quarterly review',
    icon: lucide('<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" /><path d="M14 2v5a1 1 0 0 0 1 1h5" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />') },
  { id: 'editor', label: 'Layout editor', href: './editor.html', badge: 0, context: 'Your own page',
    icon: lucide('<rect width="18" height="7" x="3" y="3" rx="1" /><rect width="9" height="7" x="3" y="14" rx="1" /><rect width="5" height="7" x="16" y="14" rx="1" />') },
]

// Submenus list places, never actions. An item with todo shows the not-built toast.
const MENUS = {
  dashboard: [
    { label: 'Last 7 days', href: './dashboard.html#p7' },
    { label: 'Last 30 days', href: './dashboard.html#p30' },
    { label: 'Last 12 months', href: './dashboard.html' },
    { label: 'Scheduled emails', todo: 'Scheduled emails' },
  ],
  analytics: [
    { label: 'Trends', href: './analytics.html#trends' },
    { label: 'Customers', href: './analytics.html#customers' },
    { label: 'Revenue hierarchy', href: './analytics.html#hierarchy' },
    { label: 'Saved views', todo: 'Saved views', hint: '4' },
  ],
  accounts: [
    { label: 'All accounts', href: './table.html', hint: fmtInt(counts.accounts) },
    { label: 'At risk', href: './table.html#at-risk', hint: fmtInt(counts.atRisk) },
    { label: 'Account detail', href: './detail.html' },
    { label: 'Imports', todo: 'Imports' },
  ],
  report: [
    { label: 'Current version', href: './report.html' },
    { label: 'Version history', href: './report.html#versions' },
    { label: 'Report templates', todo: 'Report templates' },
  ],
  editor: [
    { label: 'Your page', href: './editor.html' },
    { label: 'Widget catalogue', href: './editor.html#edit-catalog' },
  ],
}

// Screenshot flags on every template: #light and #dark set the theme for this load only.
export function mountPage(active, options = {}) {
  const flags = location.hash.slice(1).split('+')
  if (flags.includes('light')) document.documentElement.classList.remove('tb-dark')
  if (flags.includes('dark')) document.documentElement.classList.add('tb-dark')
  return mountShell({
    brand: { name: 'Tabula', href: './ask.html' },
    nav: NAV,
    menus: MENUS,
    account: USER,
    active,
    ...options,
  })
}

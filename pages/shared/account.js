// Pieces of markup for one account, shared by the Data table's detail pane and the Detail page:
// the status tag, the owner, and the timeline of events.
import { esc, fmtEur, fmtDateTime } from '../../src/format.js'
import { TEAM_BY_ID } from './data.js'

const lucide = body => `<svg class="tb-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`
export const EVENT_ICONS = {
  order: lucide('<circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />'),
  invoice: lucide('<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 17.5v-11" />'),
  plan: lucide('<path d="m5 12 7-7 7 7" /><path d="M12 19V5" />'),
  ticket: lucide('<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />'),
  note: lucide('<path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />'),
  seats: lucide('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />'),
  joined: lucide('<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />'),
}

// Status: Active and New are quiet, At risk warns, Paused is muted.
const STATUS_TONE = { Active: 'success', New: 'accent', 'At risk': 'danger', Paused: 'minimal' }
export const statusTag = status => `<span class="tb-tag tb-tag--${STATUS_TONE[status] || 'minimal'}">${esc(status)}</span>`

export const ownerHtml = id => {
  const p = TEAM_BY_ID[id]
  return p ? `<span class="tb-row tb-gap-2" style="flex-wrap: nowrap"><span class="tb-avatar tb-avatar--sm tb-avatar--neutral" aria-hidden="true">${esc(p.initials)}</span><span>${esc(p.name)}</span></span>` : ''
}

// events: the list from eventsOf(), newest first.
export function timelineHtml(events, { limit = Infinity, dense = false } = {}) {
  return `<ol class="tb-timeline${dense ? ' tb-timeline--dense' : ''}">${events.slice(0, limit).map(e => {
    const tone = e.tone || (e.kind === 'order' ? 'accent' : null)
    return `<li class="tb-timeline-item${tone ? ` tb-timeline-item--${tone}` : ''}">
      <span class="tb-timeline-marker">${EVENT_ICONS[e.kind] || ''}</span>
      <div class="tb-timeline-body">
        <div class="tb-timeline-head"><span class="tb-timeline-title">${esc(e.title)}</span>${e.amount ? `<span class="tb-timeline-value">${fmtEur(e.amount)}</span>` : ''}</div>
        ${e.detail ? `<p class="tb-timeline-text">${esc(e.detail)}</p>` : ''}
        <span class="tb-timeline-time">${fmtDateTime(e.at)}${e.by ? `, ${esc(e.by)}` : ''}</span>
      </div>
    </li>`
  }).join('')}</ol>`
}

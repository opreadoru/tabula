// Tabula control behaviours: dropdown menus, tooltips, indeterminate checkboxes and
// removable tags. Each element is marked with a data flag when it is bound, so calling
// initControls again on the same markup, or on a page that already ran it, binds nothing twice.

const TOOLTIP_DELAY = 300
const TOOLTIP_GAP = 8
const VIEWPORT_MARGIN = 4
const ENABLED_ITEM = '.tb-menu-item:not(:disabled):not(.is-disabled):not([aria-disabled="true"])'

let uid = 0
const nextId = prefix => `${prefix}-${++uid}`

// Every match under root, plus root itself when it matches.
function all(root, selector) {
  const found = [...root.querySelectorAll(selector)]
  if (root instanceof Element && root.matches(selector)) found.unshift(root)
  return found
}

// True the first time for an element and key, false after that.
function bindOnce(el, key) {
  if (el.dataset[key]) return false
  el.dataset[key] = 'true'
  return true
}

/* Dropdown ---------------------------------------------------------------------------------
   <div class="tb-dropdown">
     <button class="tb-button" data-tb-dropdown>Actions</button>
     <div class="tb-popover">...</div>
   </div>
   One dropdown is open at a time. Outside click, Escape and choosing an item close it. */

let open = null

function openDropdown(trigger, popover) {
  if (open && open.trigger !== trigger) closeDropdown()
  popover.classList.add('is-open')
  trigger.setAttribute('aria-expanded', 'true')
  open = { trigger, popover }
}

function closeDropdown(returnFocus = false) {
  if (!open) return
  const { trigger, popover } = open
  open = null
  popover.classList.remove('is-open')
  trigger.setAttribute('aria-expanded', 'false')
  if (returnFocus) trigger.focus()
}

function focusItem(popover, which) {
  const items = [...popover.querySelectorAll(ENABLED_ITEM)]
  if (!items.length) return
  const i = items.indexOf(document.activeElement)
  const last = items.length - 1
  const index = {
    first: 0,
    last,
    next: i < 0 ? 0 : (i + 1) % items.length,
    prev: i < 0 ? last : (i - 1 + items.length) % items.length,
  }[which]
  items[index].focus()
}

function initDropdowns(root) {
  all(root, '[data-tb-dropdown]').forEach(trigger => {
    const popover = trigger.nextElementSibling
    if (!popover || !popover.classList.contains('tb-popover')) return
    if (!bindOnce(trigger, 'tbDropdownBound')) return

    if (!popover.id) popover.id = nextId('tb-popover')
    trigger.setAttribute('aria-controls', popover.id)
    trigger.setAttribute('aria-expanded', 'false')
    if (popover.querySelector('.tb-menu')) trigger.setAttribute('aria-haspopup', 'menu')

    trigger.addEventListener('click', e => {
      e.preventDefault()
      if (open && open.trigger === trigger) {
        closeDropdown()
        return
      }
      openDropdown(trigger, popover)
      // detail is 0 when the click came from Enter or Space, so move focus into the menu.
      if (e.detail === 0) focusItem(popover, 'first')
    })

    trigger.addEventListener('keydown', e => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      e.preventDefault()
      openDropdown(trigger, popover)
      focusItem(popover, e.key === 'ArrowDown' ? 'first' : 'last')
    })

    popover.addEventListener('keydown', e => {
      const move = { ArrowDown: 'next', ArrowUp: 'prev', Home: 'first', End: 'last' }[e.key]
      if (move) {
        e.preventDefault()
        focusItem(popover, move)
      } else if (e.key === 'Tab') {
        closeDropdown()
      }
    })

    popover.addEventListener('click', e => {
      const item = e.target.closest('.tb-menu-item')
      if (!item || !popover.contains(item) || !item.matches(ENABLED_ITEM)) return
      closeDropdown(true)
    })
  })
}

/* Tooltip ----------------------------------------------------------------------------------
   <button data-tb-tooltip="Add to report">...</button>
   Shows after 300 ms on hover or keyboard focus, above the element, below it when there is
   no room above. Removed on leave, blur, click, scroll and Escape. */

let tip = null
let tipTimer = 0

function placeTooltip(el, node) {
  const r = el.getBoundingClientRect()
  const w = node.offsetWidth
  const h = node.offsetHeight
  let top = r.top - h - TOOLTIP_GAP
  if (top < VIEWPORT_MARGIN) top = r.bottom + TOOLTIP_GAP
  let left = r.left + r.width / 2 - w / 2
  left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - w - VIEWPORT_MARGIN))
  node.style.top = `${Math.round(top)}px`
  node.style.left = `${Math.round(left)}px`
}

function showTooltip(el) {
  const text = el.dataset.tbTooltip
  if (!text || !el.isConnected) return
  hideTooltip()
  const node = document.createElement('div')
  node.className = 'tb-tooltip'
  node.id = nextId('tb-tooltip')
  node.setAttribute('role', 'tooltip')
  node.textContent = text
  document.body.appendChild(node)
  placeTooltip(el, node)
  // An icon button already named by the same text does not need it read twice.
  if (text !== el.getAttribute('aria-label')) {
    const ids = (el.getAttribute('aria-describedby') || '').split(' ').filter(Boolean)
    el.setAttribute('aria-describedby', [...ids, node.id].join(' '))
  }
  tip = { el, node }
}

function hideTooltip() {
  clearTimeout(tipTimer)
  if (!tip) return
  const { el, node } = tip
  tip = null
  node.remove()
  const ids = (el.getAttribute('aria-describedby') || '').split(' ').filter(id => id && id !== node.id)
  if (ids.length) el.setAttribute('aria-describedby', ids.join(' '))
  else el.removeAttribute('aria-describedby')
}

function initTooltips(root) {
  all(root, '[data-tb-tooltip]').forEach(el => {
    if (!bindOnce(el, 'tbTooltipBound')) return
    const schedule = () => {
      clearTimeout(tipTimer)
      tipTimer = setTimeout(() => showTooltip(el), TOOLTIP_DELAY)
    }
    el.addEventListener('mouseenter', schedule)
    el.addEventListener('mouseleave', hideTooltip)
    // Keyboard focus only. A mouse click also focuses, and the tooltip should not come back then.
    el.addEventListener('focus', () => {
      if (el.matches(':focus-visible')) schedule()
    })
    el.addEventListener('blur', hideTooltip)
    el.addEventListener('pointerdown', hideTooltip)
  })
}

/* Checkbox indeterminate -------------------------------------------------------------------
   <input type="checkbox" data-tb-indeterminate>
   Sets the state once at init. data-tb-indeterminate="false" leaves it off. */

function initIndeterminate(root) {
  all(root, 'input[type="checkbox"][data-tb-indeterminate]').forEach(input => {
    if (!bindOnce(input, 'tbIndeterminateBound')) return
    input.indeterminate = input.dataset.tbIndeterminate !== 'false'
  })
}

/* Tag remove -------------------------------------------------------------------------------
   <span class="tb-tag">Amount over 10,000 EUR <button data-tb-tag-remove ...>...</button></span>
   Fires a cancelable tb:tag-remove event on the tag first. Call preventDefault() on it to
   keep the tag. Focus moves to the next removable tag, or the previous one. */

function initTagRemove(root) {
  all(root, '[data-tb-tag-remove]').forEach(button => {
    if (!bindOnce(button, 'tbTagRemoveBound')) return
    button.addEventListener('click', () => {
      const tag = button.closest('.tb-tag')
      if (!tag) return
      const keep = !tag.dispatchEvent(new CustomEvent('tb:tag-remove', { bubbles: true, cancelable: true }))
      if (keep) return
      if (tip && tag.contains(tip.el)) hideTooltip()
      const hadFocus = tag.contains(document.activeElement)
      const neighbour = [tag.nextElementSibling, tag.previousElementSibling]
        .map(sibling => sibling && sibling.querySelector('[data-tb-tag-remove]'))
        .find(Boolean)
      tag.remove()
      if (hadFocus && neighbour) neighbour.focus()
    })
  })
}

/* Document listeners, bound once for the whole page ----------------------------------------- */

let documentBound = false

function bindDocument() {
  if (documentBound) return
  documentBound = true

  document.addEventListener('pointerdown', e => {
    if (!open) return
    if (open.trigger.contains(e.target) || open.popover.contains(e.target)) return
    closeDropdown()
  })

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return
    hideTooltip()
    if (open) closeDropdown(open.popover.contains(document.activeElement) || open.trigger === document.activeElement)
  })

  window.addEventListener('scroll', hideTooltip, true)
}

export function initControls(root = document) {
  if (typeof document === 'undefined' || !root) return
  bindDocument()
  initDropdowns(root)
  initTooltips(root)
  initIndeterminate(root)
  initTagRemove(root)
}

// Tabula pattern behaviours. For now one: the clear button of tb-search.
// Bound once per element, so calling initPatterns again on the same markup binds nothing twice.

function all(root, selector) {
  const found = [...root.querySelectorAll(selector)]
  if (root instanceof Element && root.matches(selector)) found.unshift(root)
  return found
}

/* Search ----------------------------------------------------------------------------------
   <div class="tb-input-group tb-search" data-tb-search>
     <svg class="tb-icon">...</svg>
     <input class="tb-input" type="search" placeholder="Search transfers" aria-label="Search transfers">
     <button class="tb-button tb-button--minimal tb-button--icon tb-search-clear" type="button"
             aria-label="Clear the search" data-tb-search-clear>...</button>
   </div>
   The clear button shows only when the field has text (CSS, through the placeholder). Clicking
   it, or pressing Escape in a field that has text, empties the field, fires an input event so
   the page filters again, and keeps the focus in the field. */

function clear(input) {
  input.value = ''
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.focus()
}

function initSearch(root) {
  all(root, '[data-tb-search]').forEach(group => {
    if (group.dataset.tbSearchBound) return
    group.dataset.tbSearchBound = 'true'
    const input = group.querySelector('input')
    if (!input) return
    // The clear button is hidden through :placeholder-shown, which needs a placeholder.
    if (!input.hasAttribute('placeholder')) input.setAttribute('placeholder', ' ')
    const button = group.querySelector('[data-tb-search-clear]')
    if (button) {
      button.removeAttribute('hidden')
      button.addEventListener('click', () => clear(input))
    }
    input.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || !input.value) return
      e.stopPropagation()
      clear(input)
    })
  })
}

export function initPatterns(root = document) {
  if (typeof document === 'undefined' || !root) return
  initSearch(root)
}

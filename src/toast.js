// Tabula toast. A short message that floats bottom right and leaves on its own.
// toast({ message, intent, action, timeout }) returns a function that dismisses it.
// intent: 'danger' | 'warning' | 'success' | 'ai', or nothing for a neutral note.
// action: { label, onClick } adds one button. Clicking it runs onClick, then dismisses.
// timeout: milliseconds before it leaves. Default 4000. 0 keeps it until closed.

const svg = body =>
  `<svg class="tb-icon" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`

const ICONS = {
  info: svg('<circle cx="8" cy="8" r="6.25"/><path d="M8 7.25v3.75M8 5v.01"/>'),
  danger: svg('<circle cx="8" cy="8" r="6.25"/><path d="M8 4.75v4M8 11.25v.01"/>'),
  warning: svg('<path d="M8 2.25 14.25 13.5H1.75z"/><path d="M8 6.5v3M8 11.5v.01"/>'),
  success: svg('<circle cx="8" cy="8" r="6.25"/><path d="m5.25 8.25 1.9 1.9 3.6-3.9"/>'),
  ai: svg('<path d="M8 1.75 9.4 6.6l4.85 1.4-4.85 1.4L8 14.25 6.6 9.4 1.75 8l4.85-1.4z"/>'),
  close: svg('<path d="m4.5 4.5 7 7M11.5 4.5l-7 7"/>'),
}

const INTENTS = ['danger', 'warning', 'success', 'ai']
const LEAVE_FALLBACK = 400

function getStack() {
  let stack = document.querySelector('.tb-toast-stack')
  if (!stack) {
    stack = document.createElement('div')
    stack.className = 'tb-toast-stack'
    stack.setAttribute('role', 'region')
    stack.setAttribute('aria-label', 'Notifications')
    stack.setAttribute('aria-live', 'polite')
    document.body.appendChild(stack)
  }
  return stack
}

export function toast(options = {}) {
  if (typeof document === 'undefined') return () => {}
  const opts = typeof options === 'string' ? { message: options } : options
  const { message = '', intent, action, timeout = 4000 } = opts
  const tone = INTENTS.includes(intent) ? intent : null

  const el = document.createElement('div')
  el.className = `tb-toast is-entering${tone ? ` tb-toast--${tone}` : ''}`
  // The stack is a polite live region. A danger toast interrupts instead.
  if (tone === 'danger') el.setAttribute('role', 'alert')

  const icon = document.createElement('span')
  icon.className = 'tb-toast-icon'
  icon.innerHTML = ICONS[tone || 'info']
  el.appendChild(icon)

  const text = document.createElement('div')
  text.className = 'tb-toast-message'
  text.textContent = message
  el.appendChild(text)

  let dismissed = false
  let timer = null

  const dismiss = () => {
    if (dismissed) return
    dismissed = true
    clearTimeout(timer)
    el.classList.add('is-leaving')
    const remove = () => { el.remove() }
    el.addEventListener('transitionend', e => { if (e.target === el) remove() })
    setTimeout(remove, LEAVE_FALLBACK)
  }

  if (action && action.label) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'tb-button tb-button--minimal tb-button--sm tb-toast-action'
    btn.textContent = action.label
    btn.addEventListener('click', () => {
      if (typeof action.onClick === 'function') action.onClick()
      dismiss()
    })
    el.appendChild(btn)
  }

  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'tb-button tb-button--minimal tb-button--sm tb-toast-close'
  close.setAttribute('aria-label', 'Dismiss')
  close.innerHTML = ICONS.close
  close.addEventListener('click', dismiss)
  el.appendChild(close)

  // The timer stops while the pointer or the keyboard is on the toast, and starts again in
  // full when it leaves, so nobody loses a message they are reading.
  const start = () => {
    clearTimeout(timer)
    if (timeout > 0 && !dismissed) timer = setTimeout(dismiss, timeout)
  }
  const pause = () => clearTimeout(timer)
  el.addEventListener('mouseenter', pause)
  el.addEventListener('mouseleave', start)
  el.addEventListener('focusin', pause)
  el.addEventListener('focusout', e => { if (!el.contains(e.relatedTarget)) start() })

  getStack().appendChild(el)
  // Force a layout so the entering state is painted before it is removed.
  void el.offsetHeight
  requestAnimationFrame(() => el.classList.remove('is-entering'))
  start()

  return dismiss
}

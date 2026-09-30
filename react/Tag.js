// Tag: tone, minimal, dot, interactive (renders a button with aria-pressed).
import React from 'react'

export function Tag({
  tone, minimal, dot, interactive, pressed, className = '', children, ...rest
}) {
  const cls = [
    'tb-tag',
    tone && `tb-tag--${tone}`,
    minimal && 'tb-tag--minimal',
    interactive && 'tb-tag--interactive',
    className,
  ].filter(Boolean).join(' ')

  const content = (
    <>
      {dot && <span className="tb-tag-dot" aria-hidden="true" />}
      {children}
    </>
  )

  if (interactive) {
    return (
      <button type="button" className={cls} aria-pressed={pressed} {...rest}>
        {content}
      </button>
    )
  }
  return <span className={cls} {...rest}>{content}</span>
}

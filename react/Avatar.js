// Avatar: initials or an icon node, size sm|lg, tone neutral|ai. Pass label when it stands alone.
import React from 'react'

export function Avatar({ initials, icon, size, tone, label, className = '', ...rest }) {
  const cls = ['tb-avatar', size && `tb-avatar--${size}`, tone && `tb-avatar--${tone}`, className].filter(Boolean).join(' ')
  return (
    <span className={cls} aria-hidden={label ? undefined : 'true'} aria-label={label} {...rest}>
      {icon || initials}
    </span>
  )
}

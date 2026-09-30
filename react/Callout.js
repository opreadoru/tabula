// Callout: tone info|warning|danger|success|ai. Pass an icon node, the wrapper draws none.
import React from 'react'

export function Callout({ tone, icon, title, className = '', children, ...rest }) {
  const cls = ['tb-callout', tone && `tb-callout--${tone}`, className].filter(Boolean).join(' ')
  return (
    <div className={cls} {...rest}>
      {icon}
      <div className="tb-callout-content">
        {title && <strong className="tb-callout-title">{title}</strong>}
        {children}
      </div>
    </div>
  )
}

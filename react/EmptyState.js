// EmptyState: compact drops the description and uses a smaller title tag.
import React from 'react'

export function EmptyState({ compact, icon, title, description, action, className = '', ...rest }) {
  const cls = ['tb-empty', compact && 'tb-empty--compact', className].filter(Boolean).join(' ')
  const Title = compact ? 'p' : 'h3'
  return (
    <div className={cls} {...rest}>
      {icon && <span className="tb-empty-icon">{icon}</span>}
      <Title className="tb-empty-title">{title}</Title>
      {description && <p className="tb-empty-description">{description}</p>}
      {action && <div className="tb-empty-action">{action}</div>}
    </div>
  )
}

// Breadcrumbs: items as [{ label, href }], the last one marked current. wrap breaks onto lines.
import React from 'react'

export function Breadcrumbs({ items = [], wrap, label = 'Breadcrumb', className = '' }) {
  const cls = ['tb-breadcrumbs', wrap && 'tb-breadcrumbs--wrap', className].filter(Boolean).join(' ')
  return (
    <nav className={cls} aria-label={label}>
      <ol>
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <li key={item.href || item.label || i}>
              {last
                ? <span className="tb-breadcrumb" aria-current="page">{item.label}</span>
                : <a className="tb-breadcrumb" href={item.href || '#'}>{item.label}</a>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// List and ListItem. Pass href on an item to make its title a link that covers the row.
import React from 'react'

export function List({ divided, dense, label, className = '', children, ...rest }) {
  const cls = ['tb-list', divided && 'tb-list--divided', dense && 'tb-list--dense', className].filter(Boolean).join(' ')
  return <ul className={cls} aria-label={label} {...rest}>{children}</ul>
}

export function ListItem({ leading, title, meta, trailing, selected, href, className = '', ...rest }) {
  const cls = ['tb-list-item', selected && 'is-selected', className].filter(Boolean).join(' ')
  return (
    <li className={cls} {...rest}>
      {leading && <span className="tb-list-item-leading">{leading}</span>}
      <span className="tb-list-item-body">
        {href
          ? <a className="tb-list-item-link tb-list-item-title" href={href}>{title}</a>
          : <span className="tb-list-item-title">{title}</span>}
        {meta && <span className="tb-list-item-meta">{meta}</span>}
      </span>
      {trailing && <span className="tb-list-item-trailing">{trailing}</span>}
    </li>
  )
}

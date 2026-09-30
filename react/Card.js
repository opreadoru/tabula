// Card, with Card.Header, Card.Body and Card.Footer. Pass href to make the whole card a link.
import React from 'react'

export function Card({ interactive, selected, href, className = '', children, ...rest }) {
  const cls = [
    'tb-card',
    interactive && 'tb-card--interactive',
    selected && 'tb-card--selected',
    className,
  ].filter(Boolean).join(' ')

  if (href) {
    return (
      <a className={cls} href={href} aria-current={selected ? 'true' : undefined} {...rest}>
        {children}
      </a>
    )
  }
  return <div className={cls} {...rest}>{children}</div>
}

Card.Header = function CardHeader({ plain, className = '', children, ...rest }) {
  const cls = ['tb-card-header', plain && 'tb-card-header--plain', className].filter(Boolean).join(' ')
  return <div className={cls} {...rest}>{children}</div>
}

Card.Body = function CardBody({ flush, className = '', children, ...rest }) {
  const cls = ['tb-card-body', flush && 'tb-card-body--flush', className].filter(Boolean).join(' ')
  return <div className={cls} {...rest}>{children}</div>
}

Card.Footer = function CardFooter({ className = '', children, ...rest }) {
  return <div className={['tb-card-footer', className].filter(Boolean).join(' ')} {...rest}>{children}</div>
}

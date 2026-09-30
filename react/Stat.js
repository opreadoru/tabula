// Stat and StatStrip. Pass pressed to render a filter button instead of a plain figure.
import React from 'react'

export function Stat({
  label, value, sub, spark, lg, tile, danger, pressed, className = '', ...rest
}) {
  const cls = [
    'tb-stat',
    lg && 'tb-stat--lg',
    tile && 'tb-stat--tile',
    danger && 'tb-stat--danger',
    className,
  ].filter(Boolean).join(' ')

  const body = (
    <>
      <span className="tb-stat-label">{label}</span>
      <span className="tb-stat-value">{value}</span>
      {spark && <span className="tb-stat-spark">{spark}</span>}
      {sub && <span className="tb-stat-sub">{sub}</span>}
    </>
  )

  if (pressed !== undefined) {
    return <button type="button" className={cls} aria-pressed={pressed} {...rest}>{body}</button>
  }
  return <div className={cls} {...rest}>{body}</div>
}

export function StatStrip({ className = '', children, ...rest }) {
  return <div className={['tb-card', 'tb-stat-strip', className].filter(Boolean).join(' ')} {...rest}>{children}</div>
}

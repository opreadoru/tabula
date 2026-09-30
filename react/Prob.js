// Prob: a churn risk as number, band colour and bar together. band is inferred from
// value when not given: low under 10, mid up to 40, high above it.
import React from 'react'

const bandFor = value => (value > 40 ? 'high' : value >= 10 ? 'mid' : 'low')

export function Prob({ value, band, bar = true, className = '' }) {
  const b = band || bandFor(value)
  const cls = ['tb-prob', `tb-prob--${b}`, className].filter(Boolean).join(' ')
  return (
    <span className={cls}>
      {value.toFixed(1)}&nbsp;%
      {bar && <span className="tb-prob-bar" style={{ '--value': value }} />}
    </span>
  )
}

// Button: variant primary|danger|minimal, size sm|lg, icon, loading.
import React from 'react'

export function Button({
  variant, size, icon, loading, className = '', children, disabled, ...rest
}) {
  const cls = [
    'tb-button',
    variant && `tb-button--${variant}`,
    size && `tb-button--${size}`,
    icon && !children && 'tb-button--icon',
    loading && 'is-loading',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      className={cls}
      aria-busy={loading || undefined}
      disabled={disabled}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

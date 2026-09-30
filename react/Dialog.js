// Dialog: open, onClose, title, footer. Renders the tb-dialog markup; open/close state stays
// with React rather than the data-tb-dialog-open attribute the vanilla version uses.
import React from 'react'

const CloseIcon = () => (
  <svg className="tb-icon" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <path d="m4.5 4.5 7 7M11.5 4.5l-7 7" />
  </svg>
)

export function Dialog({ open, onClose, title, footer, danger, size, className = '', children }) {
  const backdropCls = ['tb-dialog-backdrop', open && 'is-open'].filter(Boolean).join(' ')
  const panelCls = ['tb-dialog', size && `tb-dialog--${size}`, danger && 'tb-dialog--danger', className].filter(Boolean).join(' ')

  return (
    <div className={backdropCls} onClick={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className={panelCls} role="dialog" aria-modal="true" aria-labelledby="tb-dialog-title">
        <div className="tb-dialog-header">
          <h2 className="tb-dialog-title" id="tb-dialog-title">{title}</h2>
          <button className="tb-button tb-button--minimal tb-button--sm" type="button" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="tb-dialog-body">{children}</div>
        {footer && <div className="tb-dialog-footer">{footer}</div>}
      </div>
    </div>
  )
}

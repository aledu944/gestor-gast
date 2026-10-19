import { X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'

let openSheets = 0

function lockScroll() {
  openSheets += 1
  document.documentElement.classList.add('sheet-open')
}

function unlockScroll() {
  openSheets = Math.max(0, openSheets - 1)
  if (openSheets === 0) document.documentElement.classList.remove('sheet-open')
}

type SheetProps = {
  title: string
  eyebrow?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md'
}

/**
 * Bottom sheet on phones, centered modal on wider screens.
 * Only the body scrolls; header and footer stay pinned so actions are never hidden.
 */
export function Sheet({ title, eyebrow, onClose, children, footer, size = 'md' }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const drag = useRef<{ startY: number; startT: number; dy: number } | null>(null)
  const [closing, setClosing] = useState(false)
  const closeRequested = useRef(false)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    lockScroll()
    return () => {
      unlockScroll()
      if (dialog.open) dialog.close()
    }
  }, [])

  const requestClose = useCallback(() => {
    if (closeRequested.current) return
    closeRequested.current = true
    setClosing(true)
    window.setTimeout(onClose, 180)
  }, [onClose])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const onCancel = (event: Event) => {
      event.preventDefault()
      requestClose()
    }
    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [requestClose])

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return
    drag.current = { startY: event.clientY, startT: event.timeStamp, dy: 0 }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    const dialog = ref.current
    if (!state || !dialog) return
    state.dy = Math.max(0, event.clientY - state.startY)
    dialog.style.transition = 'none'
    dialog.style.transform = `translateY(${state.dy}px)`
  }
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    const dialog = ref.current
    drag.current = null
    if (!state || !dialog) return
    const velocity = state.dy / Math.max(1, event.timeStamp - state.startT)
    dialog.style.transition = ''
    dialog.style.transform = ''
    if (state.dy > 90 || velocity > 0.6) requestClose()
  }

  return (
    <dialog
      ref={ref}
      className={`sheet sheet-${size}${closing ? ' is-closing' : ''}`}
      aria-labelledby={titleId}
      onClick={(event) => event.target === event.currentTarget && requestClose()}
    >
      <div className="sheet-panel">
        <div
          className="sheet-grab"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="sheet-handle" aria-hidden="true" />
          <header className="sheet-header">
            <div>
              {eyebrow && <span className="eyebrow">{eyebrow}</span>}
              <h2 id={titleId}>{title}</h2>
            </div>
            <button type="button" className="icon-button" onClick={requestClose} aria-label="Cerrar">
              <X size={19} aria-hidden="true" />
            </button>
          </header>
        </div>
        <div
          className="sheet-body"
          onFocus={(event) => {
            const target = event.target as HTMLElement
            if (target.matches('input, textarea, select')) {
              window.setTimeout(() => target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250)
            }
          }}
        >
          {children}
        </div>
        {footer && <footer className="sheet-footer">{footer}</footer>}
      </div>
    </dialog>
  )
}

export type SheetAction = {
  label: string
  hint?: string
  icon: ReactNode
  tone?: 'default' | 'danger'
  disabled?: boolean
  onSelect: () => void
}

export function ActionSheet({
  title,
  eyebrow,
  actions,
  onClose,
}: {
  title: string
  eyebrow?: string
  actions: SheetAction[]
  onClose: () => void
}) {
  return (
    <Sheet title={title} eyebrow={eyebrow} onClose={onClose} size="sm">
      <div className="action-list">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={`action-item${action.tone === 'danger' ? ' is-danger' : ''}`}
            disabled={action.disabled}
            onClick={action.onSelect}
          >
            <span className="action-icon">{action.icon}</span>
            <span>
              <strong>{action.label}</strong>
              {action.hint && <small>{action.hint}</small>}
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

export type ConfirmOption = {
  label: string
  hint?: string
  tone?: 'default' | 'danger'
  onSelect: () => void
}

export function ConfirmSheet({
  title,
  message,
  options,
  busy,
  onClose,
}: {
  title: string
  message: string
  options: ConfirmOption[]
  busy?: boolean
  onClose: () => void
}) {
  return (
    <Sheet
      title={title}
      onClose={onClose}
      size="sm"
      footer={<button type="button" className="button ghost block" onClick={onClose}>Cancelar</button>}
    >
      <p className="confirm-message">{message}</p>
      <div className="confirm-options">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            className={`button block ${option.tone === 'danger' ? 'danger' : 'secondary'}`}
            disabled={busy}
            onClick={option.onSelect}
          >
            {option.label}
            {option.hint && <small>{option.hint}</small>}
          </button>
        ))}
      </div>
    </Sheet>
  )
}

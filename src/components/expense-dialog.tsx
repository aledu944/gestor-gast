import { useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Check, Loader2, Repeat2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

import {
  createExpense,
  setExpensePayment,
  updateExpense,
} from '#/features/expenses/expenses.functions'
import type { CategoryDto, ExpenseDto } from '#/features/expenses/types'
import { invalidateExpenseQueries } from '#/features/expenses/queries'
import { parseMoneyInput } from '#/lib/finance'
import { useOnline } from '#/hooks/use-online'

type ExpenseDialogProps = {
  mode: 'pending' | 'paid' | 'edit'
  categories: CategoryDto[]
  pendingExpenses?: ExpenseDto[]
  initial?: ExpenseDto
  onClose: () => void
}

export function ExpenseDialog({
  mode,
  categories,
  pendingExpenses = [],
  initial,
  onClose,
}: ExpenseDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const online = useOnline()
  const nameRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [recurring, setRecurring] = useState(Boolean(initial?.recurringExpenseId))

  useEffect(() => {
    nameRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const markExistingPaid = async (expense: ExpenseDto) => {
    setSaving(true)
    setError('')
    try {
      await setExpensePayment({
        data: { id: expense.id, paid: true, paidAt: new Date().toISOString() },
      })
      await invalidateExpenseQueries(queryClient)
      await router.invalidate({ sync: true })
      onClose()
    } catch {
      setError('No se pudo registrar el pago. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!online) return
    const form = new FormData(event.currentTarget)
    const amountMinor = parseMoneyInput(String(form.get('amount')))
    if (!amountMinor) {
      setError('Ingresa un monto mayor que cero.')
      return
    }

    setSaving(true)
    setError('')
    const data = {
      name: String(form.get('name')),
      amountMinor,
      dueDate: String(form.get('dueDate')),
      paidAt:
        mode === 'paid'
          ? new Date().toISOString()
          : initial?.paidAt
            ? initial.paidAt
            : null,
      notes: String(form.get('notes') || '') || null,
      categoryId: String(form.get('categoryId') || '') || null,
      recurring,
      endsOn: recurring ? String(form.get('endsOn') || '') || null : null,
    }

    try {
      if (initial) {
        await updateExpense({
          data: {
            ...data,
            id: initial.id,
            scope: String(form.get('scope') || 'occurrence') as 'occurrence' | 'future',
          },
        })
      } else {
        await createExpense({ data })
      }
      await invalidateExpenseQueries(queryClient)
      await router.invalidate({ sync: true })
      onClose()
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : ''
      setError(message.includes('Unique') ? 'Ya existe un registro similar.' : 'No se pudo guardar el gasto.')
    } finally {
      setSaving(false)
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const title = initial
    ? 'Editar gasto'
    : mode === 'paid'
      ? 'Registrar pago'
      : 'Añadir pendiente'

  return (
    <div className="dialog-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="expense-dialog" role="dialog" aria-modal="true" aria-labelledby="expense-dialog-title">
        <header className="dialog-header">
          <div>
            <span className="eyebrow">Movimiento</span>
            <h2 id="expense-dialog-title">{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        {mode === 'paid' && !initial && pendingExpenses.length > 0 && (
          <div className="pending-picker">
            <p className="field-label">Selecciona un pendiente</p>
            <div className="pending-picker-list">
              {pendingExpenses.slice(0, 4).map((expense) => (
                <button key={expense.id} onClick={() => markExistingPaid(expense)} disabled={saving}>
                  <span>{expense.name}<small>Vence {expense.dueDate}</small></span>
                  <Check size={17} aria-hidden="true" />
                </button>
              ))}
            </div>
            <div className="form-divider"><span>o registra uno nuevo</span></div>
          </div>
        )}

        <form className="expense-form" onSubmit={submit}>
          <label>
            <span>Nombre</span>
            <input ref={nameRef} name="name" required minLength={2} maxLength={80} defaultValue={initial?.name} placeholder="Ej. Internet de casa" />
          </label>
          <div className="form-grid">
            <label>
              <span>Monto</span>
              <div className="amount-input"><b>Bs</b><input name="amount" inputMode="decimal" required defaultValue={initial ? (initial.amountMinor / 100).toFixed(2) : ''} placeholder="0,00" /></div>
            </label>
            <label>
              <span>Vencimiento</span>
              <div className="input-with-icon"><CalendarDays size={17} aria-hidden="true" /><input name="dueDate" type="date" required defaultValue={initial?.dueDate ?? today} /></div>
            </label>
          </div>
          <label>
            <span>Categoría</span>
            <select name="categoryId" defaultValue={initial?.category?.id ?? ''}>
              <option value="">Sin categoría</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label>
            <span>Nota <small>opcional</small></span>
            <textarea name="notes" maxLength={240} rows={2} defaultValue={initial?.notes ?? ''} placeholder="Algo que quieras recordar" />
          </label>

          {!initial && (
            <label className="switch-row">
              <span><Repeat2 size={18} aria-hidden="true" /><span>Se repite cada mes<small>Crearemos cada vencimiento por separado.</small></span></span>
              <input type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} />
            </label>
          )}

          {recurring && (
            <label>
              <span>Finaliza <small>opcional</small></span>
              <input name="endsOn" type="month" min={(initial?.period ?? today.slice(0, 7))} />
            </label>
          )}

          {initial?.recurringExpenseId && (
            <label>
              <span>Aplicar cambios</span>
              <select name="scope" defaultValue="occurrence">
                <option value="occurrence">Solo este mes</option>
                <option value="future">Este y los siguientes</option>
              </select>
            </label>
          )}

          {!online && <p className="form-error">Vuelve a conectarte para guardar cambios.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="dialog-actions">
            <button type="button" className="button ghost" onClick={onClose}>Cancelar</button>
            <button className="button primary" disabled={saving || !online}>
              {saving ? <Loader2 className="spin" size={17} /> : <Check size={17} />}
              {initial ? 'Guardar cambios' : mode === 'paid' ? 'Registrar gasto' : 'Añadir gasto'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

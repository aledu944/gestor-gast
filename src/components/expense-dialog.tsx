import { Check, Loader2, Repeat2 } from 'lucide-react'
import { useId, useState } from 'react'
import type { FormEvent } from 'react'

import {
  useCreateExpense,
  useSetPayment,
  useUpdateExpense,
} from '#/features/expenses/mutations'
import type { CategoryDto, ExpenseDto } from '#/features/expenses/types'
import { useOnline } from '#/hooks/use-online'
import { formatMoney, parseMoneyInput } from '#/lib/finance'
import { CategoryIcon } from './category-icon'
import { Sheet } from './sheet'

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
  const formId = useId()
  const online = useOnline()
  const create = useCreateExpense()
  const update = useUpdateExpense()
  const pay = useSetPayment()
  const [error, setError] = useState('')
  const [recurring, setRecurring] = useState(Boolean(initial?.recurringExpenseId))
  const [categoryId, setCategoryId] = useState(initial?.category?.id ?? '')

  const saving = create.isPending || update.isPending || pay.isPending

  const markExistingPaid = async (expense: ExpenseDto) => {
    setError('')
    try {
      await pay.mutateAsync({ id: expense.id, paid: true, paidAt: new Date().toISOString() })
      onClose()
    } catch {
      setError('No se pudo registrar el pago. Intenta de nuevo.')
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
      categoryId: categoryId || null,
      recurring,
      endsOn: recurring ? String(form.get('endsOn') || '') || null : null,
    }

    try {
      if (initial) {
        await update.mutateAsync({
          ...data,
          id: initial.id,
          scope: String(form.get('scope') || 'occurrence') as 'occurrence' | 'future',
        })
      } else {
        await create.mutateAsync(data)
      }
      onClose()
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : ''
      setError(message.includes('Unique') ? 'Ya existe un registro similar.' : 'No se pudo guardar el gasto.')
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const title = initial
    ? 'Editar gasto'
    : mode === 'paid'
      ? 'Registrar pago'
      : 'Añadir pendiente'
  const submitLabel = initial ? 'Guardar cambios' : mode === 'paid' ? 'Registrar gasto' : 'Añadir gasto'
  const quickPicks = mode === 'paid' && !initial ? pendingExpenses.slice(0, 4) : []

  return (
    <Sheet
      title={title}
      eyebrow="Movimiento"
      onClose={onClose}
      footer={
        <>
          {!online && <p className="form-error">Vuelve a conectarte para guardar cambios.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="sheet-actions">
            <button type="button" className="button ghost" onClick={onClose}>Cancelar</button>
            <button className="button primary grow" form={formId} disabled={saving || !online}>
              {saving ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}
              {submitLabel}
            </button>
          </div>
        </>
      }
    >
      {quickPicks.length > 0 && (
        <div className="pending-picker">
          <p className="field-label">Marca uno de tus pendientes</p>
          <div className="pending-picker-list">
            {quickPicks.map((expense) => (
              <button key={expense.id} type="button" onClick={() => markExistingPaid(expense)} disabled={saving}>
                <span>{expense.name}<small>Vence {expense.dueDate} · {formatMoney(expense.amountMinor, expense.currency)}</small></span>
                <Check size={17} aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className="form-divider"><span>o registra uno nuevo</span></div>
        </div>
      )}

      <form id={formId} className="sheet-form" onSubmit={submit}>
        <label className="amount-field">
          <span>Monto</span>
          <div className="amount-input">
            <b>Bs</b>
            <input
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              required
              autoFocus={!initial}
              defaultValue={initial ? (initial.amountMinor / 100).toFixed(2) : ''}
              placeholder="0,00"
            />
          </div>
        </label>
        <label>
          <span>Nombre</span>
          <input name="name" required minLength={2} maxLength={80} autoComplete="off" defaultValue={initial?.name} placeholder="Ej. Internet de casa" />
        </label>
        <label>
          <span>Vencimiento</span>
          <input name="dueDate" type="date" required defaultValue={initial?.dueDate ?? today} />
        </label>

        <fieldset className="chip-field">
          <legend>Categoría</legend>
          <div className="chip-row">
            <label className="chip">
              <input type="radio" name="category" checked={categoryId === ''} onChange={() => setCategoryId('')} />
              <span>Sin categoría</span>
            </label>
            {categories.map((category) => (
              <label key={category.id} className="chip" style={{ '--chip-color': category.color } as React.CSSProperties}>
                <input type="radio" name="category" checked={categoryId === category.id} onChange={() => setCategoryId(category.id)} />
                <span><CategoryIcon name={category.icon} size={15} />{category.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          <span>Nota <small>opcional</small></span>
          <textarea name="notes" maxLength={240} rows={2} defaultValue={initial?.notes ?? ''} placeholder="Algo que quieras recordar" />
        </label>

        {!initial && (
          <label className="switch-row">
            <span className="switch-copy"><Repeat2 size={18} aria-hidden="true" /><span>Se repite cada mes<small>Crearemos cada vencimiento por separado.</small></span></span>
            <input className="switch" type="checkbox" role="switch" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} />
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
      </form>
    </Sheet>
  )
}

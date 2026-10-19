import { Check, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { useDeleteExpense, useSetPayment } from '#/features/expenses/mutations'
import type { CategoryDto, ExpenseDto } from '#/features/expenses/types'
import { useOnline } from '#/hooks/use-online'
import { formatMoney } from '#/lib/finance'
import { CategoryIcon } from './category-icon'
import { ExpenseDialog } from './expense-dialog'
import { Money } from './money'
import { ActionSheet, ConfirmSheet } from './sheet'

const dayFormat = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', timeZone: 'UTC' })

export function ExpenseRow({ expense, categories }: { expense: ExpenseDto; categories: CategoryDto[] }) {
  const online = useOnline()
  const pay = useSetPayment()
  const remove = useDeleteExpense()
  const [sheet, setSheet] = useState<'actions' | 'edit' | 'delete' | null>(null)
  const today = new Date().toISOString().slice(0, 10)
  const status = expense.paidAt ? 'paid' : expense.dueDate < today ? 'overdue' : 'pending'
  const statusLabel = status === 'paid' ? 'Pagado' : status === 'overdue' ? 'Atrasado' : 'Pendiente'
  const recurring = Boolean(expense.recurringExpenseId)

  const togglePaid = () => {
    if (!online) return
    pay.mutate({ id: expense.id, paid: !expense.paidAt })
    setSheet(null)
  }

  const destroy = async (scope: 'occurrence' | 'future') => {
    try {
      await remove.mutateAsync({ id: expense.id, scope })
    } finally {
      setSheet(null)
    }
  }

  return (
    <>
      <article className={`expense-row is-${status}`}>
        <button
          type="button"
          className="pay-toggle"
          onClick={togglePaid}
          disabled={!online || pay.isPending}
          aria-pressed={status === 'paid'}
          aria-label={status === 'paid' ? `Devolver ${expense.name} a pendiente` : `Pagar ${expense.name}`}
        >
          <Check size={16} strokeWidth={3} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="expense-main"
          onClick={() => setSheet('actions')}
          disabled={!online}
          aria-label={`Acciones para ${expense.name}. ${formatMoney(expense.amountMinor, expense.currency)}, ${statusLabel}`}
          aria-haspopup="dialog"
        >
          <span className="category-badge" style={{ '--category-color': expense.category?.color ?? '#A6938A' } as React.CSSProperties}>
            <CategoryIcon name={expense.category?.icon} />
          </span>
          <span className="expense-copy">
            <strong><span className="expense-name">{expense.name}</span>{recurring && <span className="repeat-tag">Mensual</span>}</strong>
            <span>{expense.category?.name ?? 'Sin categoría'} · {status === 'overdue' ? 'Venció' : 'Vence'} {dayFormat.format(new Date(`${expense.dueDate}T00:00:00Z`))}</span>
          </span>
          <span className="expense-amount">
            <Money amountMinor={expense.amountMinor} currency={expense.currency} />
            <span className={`status-pill ${status}`}>{statusLabel}</span>
          </span>
        </button>
      </article>

      {sheet === 'actions' && (
        <ActionSheet
          title={expense.name}
          eyebrow={formatMoney(expense.amountMinor, expense.currency)}
          onClose={() => setSheet(null)}
          actions={[
            {
              label: expense.paidAt ? 'Volver a pendiente' : 'Marcar pagado',
              hint: expense.paidAt ? 'Quita la fecha de pago' : 'Registra el pago con la fecha de hoy',
              icon: expense.paidAt ? <RotateCcw size={18} /> : <Check size={18} />,
              onSelect: togglePaid,
            },
            { label: 'Editar', hint: 'Cambia monto, fecha o categoría', icon: <Pencil size={18} />, onSelect: () => setSheet('edit') },
            { label: 'Eliminar', tone: 'danger', icon: <Trash2 size={18} />, onSelect: () => setSheet('delete') },
          ]}
        />
      )}

      {sheet === 'edit' && <ExpenseDialog mode="edit" categories={categories} initial={expense} onClose={() => setSheet(null)} />}

      {sheet === 'delete' && (
        <ConfirmSheet
          title="¿Eliminar este gasto?"
          message={recurring ? `“${expense.name}” se repite cada mes. Elige qué quieres eliminar.` : `“${expense.name}” se eliminará y no podrás recuperarlo.`}
          busy={remove.isPending}
          onClose={() => setSheet(null)}
          options={recurring
            ? [
                { label: 'Solo este mes', tone: 'danger', onSelect: () => destroy('occurrence') },
                { label: 'Este y los siguientes', tone: 'danger', onSelect: () => destroy('future') },
              ]
            : [{ label: 'Eliminar', tone: 'danger', onSelect: () => destroy('occurrence') }]}
        />
      )}
    </>
  )
}

import { useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Check, MoreHorizontal, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { deleteExpense, setExpensePayment } from '#/features/expenses/expenses.functions'
import type { CategoryDto, ExpenseDto } from '#/features/expenses/types'
import { invalidateExpenseQueries } from '#/features/expenses/queries'
import { useOnline } from '#/hooks/use-online'
import { formatMoney } from '#/lib/finance'
import { CategoryIcon } from './category-icon'
import { ExpenseDialog } from './expense-dialog'

export function ExpenseRow({ expense, categories }: { expense: ExpenseDto; categories: CategoryDto[] }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const online = useOnline()
  const [editing, setEditing] = useState(false)
  const [menu, setMenu] = useState(false)
  const [busy, setBusy] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const status = expense.paidAt ? 'paid' : expense.dueDate < today ? 'overdue' : 'pending'

  const togglePaid = async () => {
    if (!online) return
    setBusy(true)
    try {
      await setExpensePayment({ data: { id: expense.id, paid: !expense.paidAt } })
      await invalidateExpenseQueries(queryClient)
      await router.invalidate({ sync: true })
    } finally {
      setBusy(false)
      setMenu(false)
    }
  }

  const remove = async () => {
    if (!online) return
    const future = Boolean(expense.recurringExpenseId) && window.confirm('Este gasto es mensual. Aceptar elimina este y los próximos pendientes; Cancelar elimina solo este mes.')
    if (!window.confirm('Esta acción no se puede deshacer. ¿Eliminar gasto?')) return
    setBusy(true)
    try {
      await deleteExpense({ data: { id: expense.id, scope: future ? 'future' : 'occurrence' } })
      await invalidateExpenseQueries(queryClient)
      await router.invalidate({ sync: true })
    } finally {
      setBusy(false)
      setMenu(false)
    }
  }

  return (
    <>
      <article className="expense-row">
        <div className="category-badge" style={{ '--category-color': expense.category?.color ?? '#8B8F9C' } as React.CSSProperties}>
          <CategoryIcon name={expense.category?.icon} />
        </div>
        <div className="expense-copy">
          <div><strong>{expense.name}</strong>{expense.recurringExpenseId && <span className="repeat-tag">Mensual</span>}</div>
          <span>{expense.category?.name ?? 'Sin categoría'} · {status === 'overdue' ? 'Venció' : 'Vence'} {new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${expense.dueDate}T00:00:00Z`))}</span>
        </div>
        <div className="expense-amount">
          <strong>{formatMoney(expense.amountMinor, expense.currency)}</strong>
          <span className={`status-pill ${status}`}>{status === 'paid' ? 'Pagado' : status === 'overdue' ? 'Atrasado' : 'Pendiente'}</span>
        </div>
        <div className="row-menu-wrap">
          <button className="icon-button subtle" onClick={() => setMenu((value) => !value)} aria-label={`Acciones para ${expense.name}`} aria-expanded={menu} disabled={busy || !online} title={online ? undefined : 'Disponible con conexión'}>
            <MoreHorizontal size={19} />
          </button>
          {menu && (
            <div className="row-menu">
              <button onClick={togglePaid} disabled={!online}>{expense.paidAt ? <RotateCcw size={16} /> : <Check size={16} />}{expense.paidAt ? 'Volver a pendiente' : 'Marcar pagado'}</button>
              <button onClick={() => { setEditing(true); setMenu(false) }} disabled={!online}><Pencil size={16} />Editar</button>
              <button className="danger" onClick={remove} disabled={!online}><Trash2 size={16} />Eliminar</button>
            </div>
          )}
        </div>
      </article>
      {editing && <ExpenseDialog mode="edit" categories={categories} initial={expense} onClose={() => setEditing(false)} />}
    </>
  )
}

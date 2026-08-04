import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Filter, Plus, Search, WalletCards } from 'lucide-react'
import { useState } from 'react'

import { ExpenseDialog } from '#/components/expense-dialog'
import { ExpenseRow } from '#/components/expense-row'
import { bootstrapQueryOptions, expensesQueryOptions } from '#/features/expenses/queries'
import { monthLabel, normalizeMonth } from '#/lib/finance'

const expenseSearch = (search: Record<string, unknown>) => ({
  month: normalizeMonth(typeof search.month === 'string' ? search.month : undefined),
  status: ['all', 'pending', 'paid', 'overdue'].includes(String(search.status))
    ? String(search.status) as 'all' | 'pending' | 'paid' | 'overdue'
    : 'all' as const,
  category: typeof search.category === 'string' ? search.category : 'all',
  query: typeof search.query === 'string' ? search.query.slice(0, 80) : '',
  sort: ['due-asc', 'due-desc', 'amount-desc'].includes(String(search.sort))
    ? String(search.sort) as 'due-asc' | 'due-desc' | 'amount-desc'
    : 'due-asc' as const,
})

export const Route = createFileRoute('/gastos')({
  validateSearch: expenseSearch,
  loaderDeps: ({ search }) => ({
    month: search.month,
    status: search.status,
    category: search.category,
    query: search.query,
    sort: search.sort,
  }),
  loader: async ({ context, deps }) => {
    const [expenses, bootstrap] = await Promise.all([
      context.queryClient.fetchQuery(expensesQueryOptions(deps)),
      context.queryClient.fetchQuery(bootstrapQueryOptions()),
    ])
    return { expenses, bootstrap }
  },
  component: ExpensesPage,
})

function ExpensesPage() {
  const { expenses, bootstrap } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/gastos' })
  const [dialog, setDialog] = useState<'pending' | 'paid' | null>(null)

  const update = (values: Partial<typeof search>) =>
    navigate({ search: (previous) => ({ ...previous, ...values }) })

  return (
    <div className="page expenses-page">
      <section className="page-heading split-heading">
        <div><span className="eyebrow">Historial y agenda</span><h1>Todos tus gastos</h1><p>Busca, filtra y resuelve cada movimiento desde un solo lugar.</p></div>
        <div className="heading-actions">
          <button className="button secondary" onClick={() => setDialog('paid')}>Registrar pago</button>
          <button className="button primary" onClick={() => setDialog('pending')}><Plus size={17} />Añadir pendiente</button>
        </div>
      </section>

      <section className="filter-bar" aria-label="Filtros de gastos">
        <label className="search-control"><Search size={17} /><input value={search.query} onChange={(event) => update({ query: event.target.value })} placeholder="Buscar por nombre" /></label>
        <label><span className="sr-only">Mes</span><input type="month" value={search.month} onChange={(event) => update({ month: event.target.value })} /></label>
        <label><Filter size={16} /><span className="sr-only">Estado</span><select value={search.status} onChange={(event) => update({ status: event.target.value as typeof search.status })}><option value="all">Todos</option><option value="pending">Pendientes</option><option value="paid">Pagados</option><option value="overdue">Atrasados</option></select></label>
        <label><span className="sr-only">Categoría</span><select value={search.category} onChange={(event) => update({ category: event.target.value })}><option value="all">Todas las categorías</option>{bootstrap.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label><span className="sr-only">Ordenar</span><select value={search.sort} onChange={(event) => update({ sort: event.target.value as typeof search.sort })}><option value="due-asc">Vencimiento próximo</option><option value="due-desc">Vencimiento lejano</option><option value="amount-desc">Mayor monto</option></select></label>
      </section>

      <section className="panel records-panel">
        <header className="panel-header"><div><span className="eyebrow">{monthLabel(search.month)}</span><h2>{expenses.length} {expenses.length === 1 ? 'movimiento' : 'movimientos'}</h2></div></header>
        {expenses.length ? <div className="expense-list">{expenses.map((expense) => <ExpenseRow key={expense.id} expense={expense} categories={bootstrap.categories} />)}</div> : <div className="empty-state large"><span><WalletCards /></span><strong>No encontramos gastos</strong><p>Prueba otro filtro o registra un movimiento para este mes.</p><button className="button primary" onClick={() => setDialog('pending')}><Plus size={17} />Añadir gasto</button></div>}
      </section>

      {dialog && <ExpenseDialog mode={dialog} categories={bootstrap.categories} pendingExpenses={expenses.filter((expense) => !expense.paidAt)} onClose={() => setDialog(null)} />}
    </div>
  )
}

import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Plus, Search, WalletCards, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useQuickAdd } from '#/components/app-shell'
import { ExpenseRow } from '#/components/expense-row'
import { MonthSwitcher } from '#/components/month-switcher'
import { bootstrapQueryOptions, expensesQueryOptions } from '#/features/expenses/queries'
import { monthLabel, normalizeMonth } from '#/lib/finance'
import { useOnline } from '#/hooks/use-online'

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

const statusChips = [
  ['all', 'Todos'],
  ['pending', 'Pendientes'],
  ['overdue', 'Atrasados'],
  ['paid', 'Pagados'],
] as const

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
    await Promise.all([
      context.queryClient.ensureQueryData(expensesQueryOptions(deps)),
      context.queryClient.ensureQueryData(bootstrapQueryOptions()),
    ])
  },
  component: ExpensesPage,
})

function ExpensesPage() {
  const search = Route.useSearch()
  const { data: bootstrap } = useSuspenseQuery(bootstrapQueryOptions())
  const { data: expenses = [], isPlaceholderData } = useQuery(expensesQueryOptions(search))
  const navigate = useNavigate({ from: '/gastos' })
  const online = useOnline()
  const quickAdd = useQuickAdd()
  const [text, setText] = useState(search.query)

  const update = (values: Partial<typeof search>) =>
    navigate({ search: (previous) => ({ ...previous, ...values }), replace: true })

  // Search runs on the server, so wait for a pause in typing instead of querying per keystroke.
  useEffect(() => {
    if (text === search.query) return
    const timer = window.setTimeout(() => void update({ query: text }), 350)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  useEffect(() => { setText(search.query) }, [search.query])

  return (
    <div className="page expenses-page">
      <section className="page-heading split-heading">
        <div><span className="eyebrow">Historial y agenda</span><h1>Todos tus gastos</h1></div>
        <MonthSwitcher month={search.month} onChange={(month) => void update({ month })} />
      </section>

      <section className="filters" aria-label="Filtros de gastos">
        <label className="search-control">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Buscar por nombre</span>
          <input type="search" value={text} onChange={(event) => setText(event.target.value)} placeholder="Buscar por nombre" enterKeyHint="search" />
          {text && <button type="button" className="icon-button subtle" onClick={() => { setText(''); void update({ query: '' }) }} aria-label="Borrar búsqueda"><X size={15} /></button>}
        </label>
        <div className="chip-row scroll-row" role="group" aria-label="Estado">
          {statusChips.map(([value, label]) => (
            <button key={value} type="button" className={`chip-button${search.status === value ? ' is-selected' : ''}`} aria-pressed={search.status === value} onClick={() => void update({ status: value })}>{label}</button>
          ))}
        </div>
        <div className="filter-selects">
          <label><span className="sr-only">Categoría</span><select value={search.category} onChange={(event) => void update({ category: event.target.value })}><option value="all">Todas las categorías</option>{bootstrap.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label><span className="sr-only">Ordenar</span><select value={search.sort} onChange={(event) => void update({ sort: event.target.value as typeof search.sort })}><option value="due-asc">Vencimiento próximo</option><option value="due-desc">Vencimiento lejano</option><option value="amount-desc">Mayor monto</option></select></label>
        </div>
      </section>

      <section className={`panel records-panel${isPlaceholderData ? ' is-refreshing' : ''}`} aria-busy={isPlaceholderData}>
        <header className="panel-header"><div><span className="eyebrow">{monthLabel(search.month)}</span><h2>{expenses.length} {expenses.length === 1 ? 'movimiento' : 'movimientos'}</h2></div></header>
        {expenses.length ? <div className="expense-list">{expenses.map((expense) => <ExpenseRow key={expense.id} expense={expense} categories={bootstrap.categories} />)}</div> : <div className="empty-state large"><span><WalletCards /></span><strong>No encontramos gastos</strong><p>Prueba otro filtro o registra un movimiento para este mes.</p><button type="button" className="button primary" onClick={() => quickAdd.open('pending')} disabled={!online}><Plus size={17} />Añadir gasto</button></div>}
      </section>
    </div>
  )
}

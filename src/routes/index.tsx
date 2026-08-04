import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, CalendarClock, CheckCircle2, CloudOff, Plus, ReceiptText, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { ExpenseDialog } from '#/components/expense-dialog'
import { ExpenseRow } from '#/components/expense-row'
import { bootstrapQueryOptions, dashboardQueryOptions } from '#/features/expenses/queries'
import type { DashboardSnapshot } from '#/features/expenses/types'
import { formatMoney, monthLabel, normalizeMonth } from '#/lib/finance'
import { cacheDashboard, readCachedDashboard } from '#/lib/offline-cache'

const dashboardSearch = (search: Record<string, unknown>): {
  month: string
  action?: 'pending' | 'paid'
} => {
  const action = search.action === 'pending' || search.action === 'paid' ? search.action : undefined
  const result: { month: string; action?: 'pending' | 'paid' } = {
    month: normalizeMonth(typeof search.month === 'string' ? search.month : undefined),
  }
  if (action) result.action = action
  return result
}

export const Route = createFileRoute('/')({
  validateSearch: dashboardSearch,
  loaderDeps: ({ search }) => ({ month: search.month }),
  loader: async ({ context, deps }) => {
    const [dashboard, bootstrap] = await Promise.all([
      context.queryClient.fetchQuery(dashboardQueryOptions(deps.month)),
      context.queryClient.fetchQuery(bootstrapQueryOptions()),
    ])
    return { dashboard, bootstrap }
  },
  pendingComponent: DashboardSkeleton,
  errorComponent: OfflineDashboard,
  component: DashboardPage,
})

function DashboardPage() {
  const { dashboard, bootstrap } = Route.useLoaderData()
  const { action } = Route.useSearch()
  const navigate = useNavigate({ from: '/' })
  const [dialog, setDialog] = useState<'pending' | 'paid' | null>(action ?? null)

  useEffect(() => {
    void cacheDashboard(dashboard)
  }, [dashboard])

  return (
    <div className="page dashboard-page">
      <section className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">Tu mes, en claro</span>
          <h1>Hola, este es tu pulso.</h1>
          <p>Lo que ya resolviste y lo que viene después.</p>
        </div>
        <label className="month-control">
          <span>Período</span>
          <input
            type="month"
            value={dashboard.month}
            onChange={(event) =>
              navigate({ search: (previous) => ({ ...previous, month: event.target.value }) })
            }
          />
        </label>
      </section>

      <PulseCard snapshot={dashboard} />

      <div className="quick-actions" aria-label="Acciones rápidas">
        <button className="quick-action primary-action" onClick={() => setDialog('pending')}>
          <span><Plus size={20} /></span>
          <span><strong>Añadir pendiente</strong><small>Programa un próximo pago</small></span>
        </button>
        <button className="quick-action" onClick={() => setDialog('paid')}>
          <span><CheckCircle2 size={20} /></span>
          <span><strong>Registrar pago</strong><small>Cierra uno o anota un gasto</small></span>
        </button>
      </div>

      {dashboard.overdue.length > 0 && (
        <section className="overdue-banner">
          <div><CalendarClock size={21} /><span><strong>{dashboard.overdue.length} {dashboard.overdue.length === 1 ? 'pago necesita' : 'pagos necesitan'} atención</strong><small>El más antiguo venció el {dashboard.overdue[0].dueDate}.</small></span></div>
          <Link to="/gastos" search={{ month: dashboard.month, status: 'overdue', category: 'all', query: '', sort: 'due-asc' }}>Revisar <ArrowRight size={16} /></Link>
        </section>
      )}

      <div className="dashboard-grid">
        <section className="panel upcoming-panel">
          <header className="panel-header">
            <div><span className="eyebrow">Agenda</span><h2>Próximos pagos</h2></div>
            <Link to="/gastos" search={{ month: dashboard.month, status: 'all', category: 'all', query: '', sort: 'due-asc' }}>Ver todos</Link>
          </header>
          {dashboard.upcoming.length ? (
            <div className="expense-list compact-list">
              {dashboard.upcoming.slice(0, 5).map((expense) => <ExpenseRow key={expense.id} expense={expense} categories={bootstrap.categories} />)}
            </div>
          ) : (
            <EmptyState icon={<ReceiptText />} title="Nada urgente por aquí" copy="Cuando agregues un vencimiento, aparecerá ordenado por fecha." />
          )}
        </section>

        <section className="panel categories-panel">
          <header className="panel-header"><div><span className="eyebrow">Distribución</span><h2>Por categoría</h2></div></header>
          <CategoryBars snapshot={dashboard} />
        </section>
      </div>

      <section className="panel month-expenses">
        <header className="panel-header">
          <div><span className="eyebrow">{monthLabel(dashboard.month)}</span><h2>Movimientos del mes</h2></div>
          <span className="record-count">{dashboard.expenses.length} registros</span>
        </header>
        {dashboard.expenses.length ? (
          <div className="expense-list">
            {dashboard.expenses.slice(0, 6).map((expense) => <ExpenseRow key={expense.id} expense={expense} categories={bootstrap.categories} />)}
          </div>
        ) : (
          <EmptyState icon={<Wallet />} title="Tu mes empieza limpio" copy="Añade el primer gasto para ver cómo cambia tu pulso." />
        )}
      </section>

      {dialog && (
        <ExpenseDialog
          mode={dialog}
          categories={bootstrap.categories}
          pendingExpenses={[...dashboard.overdue, ...dashboard.upcoming]}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}

function PulseCard({ snapshot }: { snapshot: DashboardSnapshot }) {
  const totals = snapshot.totals[0] ?? { currency: 'BOB', committed: 0, paid: 0, pending: 0 }
  const additionalTotals = snapshot.totals.slice(1)
  const paidPercent = totals.committed ? Math.round((totals.paid / totals.committed) * 100) : 0
  const markers = useMemo(() => snapshot.expenses.map((expense) => ({
    id: expense.id,
    left: `${Math.min(97, Math.max(3, (Number(expense.dueDate.slice(8, 10)) / 31) * 100))}%`,
    paid: Boolean(expense.paidAt),
    label: expense.name,
  })), [snapshot.expenses])

  return (
    <section className="pulse-card" aria-label={`Pulso de ${monthLabel(snapshot.month)}`}>
      <div className="pulse-topline"><span>Pulso de {monthLabel(snapshot.month)}</span><strong>{paidPercent}% resuelto</strong></div>
      <div className="pulse-amount"><span>Comprometido</span><strong>{formatMoney(totals.committed, totals.currency)}</strong></div>
      <div className="pulse-track" role="img" aria-label={`${formatMoney(totals.paid, totals.currency)} pagado de ${formatMoney(totals.committed, totals.currency)}`}>
        <div className="pulse-paid" style={{ width: `${paidPercent}%` }} />
        {markers.map((marker) => <i key={marker.id} className={marker.paid ? 'is-paid' : ''} style={{ left: marker.left }} title={marker.label} />)}
      </div>
      <div className="pulse-legend">
        <div><span className="legend-dot paid" /><span>Pagado<strong>{formatMoney(totals.paid, totals.currency)}</strong></span></div>
        <div><span className="legend-dot pending" /><span>Pendiente<strong>{formatMoney(totals.pending, totals.currency)}</strong></span></div>
      </div>
      {additionalTotals.length > 0 && (
        <div className="pulse-currency-breakdown" aria-label="Totales en otras monedas">
          {additionalTotals.map((item) => (
            <div key={item.currency}>
              <strong>{item.currency}</strong>
              <span>{formatMoney(item.paid, item.currency)} pagado</span>
              <span>{formatMoney(item.pending, item.currency)} pendiente</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function CategoryBars({ snapshot }: { snapshot: DashboardSnapshot }) {
  if (!snapshot.categoryTotals.length) return <EmptyState icon={<Wallet />} title="Aún sin distribución" copy="Asigna categorías para comparar tus gastos." />
  const maxima = new Map<string, number>()
  for (const item of snapshot.categoryTotals) {
    maxima.set(item.currency, Math.max(maxima.get(item.currency) ?? 1, item.amountMinor))
  }
  return <div className="category-bars">{snapshot.categoryTotals.slice(0, 5).map((item) => (
    <div key={`${item.id}-${item.currency}`} className="category-bar-row">
      <div><span className="category-swatch" style={{ background: item.color }} /><span>{item.name}</span><strong>{formatMoney(item.amountMinor, item.currency)}</strong></div>
      <span className="category-track"><i style={{ width: `${Math.max(8, (item.amountMinor / (maxima.get(item.currency) ?? 1)) * 100)}%`, background: item.color }} /></span>
    </div>
  ))}</div>
}

function EmptyState({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return <div className="empty-state"><span>{icon}</span><strong>{title}</strong><p>{copy}</p></div>
}

function DashboardSkeleton() {
  return <div className="page"><div className="skeleton heading-skeleton" /><div className="skeleton pulse-skeleton" /><div className="dashboard-grid"><div className="skeleton panel-skeleton" /><div className="skeleton panel-skeleton" /></div></div>
}

function OfflineDashboard() {
  const { month } = Route.useSearch()
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)
  useEffect(() => { void readCachedDashboard(month).then((data) => setSnapshot(data ?? null)) }, [month])
  if (snapshot) return <div className="page"><div className="offline-notice"><CloudOff size={18} />Mostrando la copia guardada el {new Date(snapshot.syncedAt).toLocaleString('es-BO')}.</div><PulseCard snapshot={snapshot} /><section className="panel"><h2>Próximos pagos</h2><p>Vuelve a conectarte para editar o actualizar la información.</p>{snapshot.upcoming.map((expense) => <div className="offline-expense" key={expense.id}><span>{expense.name}</span><strong>{formatMoney(expense.amountMinor, expense.currency)}</strong></div>)}</section></div>
  return <div className="full-state"><CloudOff size={34} /><h1>Sin conexión</h1><p>Abre Gestor Gast una vez con internet para guardar tu resumen mensual.</p></div>
}

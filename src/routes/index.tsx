import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, CalendarClock, CheckCircle2, CloudOff, Plus, ReceiptText, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { useQuickAdd } from '#/components/app-shell'
import { ExpenseRow } from '#/components/expense-row'
import { Money } from '#/components/money'
import { MonthSwitcher } from '#/components/month-switcher'
import { bootstrapQueryOptions, dashboardQueryOptions } from '#/features/expenses/queries'
import type { DashboardSnapshot } from '#/features/expenses/types'
import { formatMoney, monthLabel, normalizeMonth } from '#/lib/finance'
import { cacheDashboard, readCachedDashboard } from '#/lib/offline-cache'
import { useOnline } from '#/hooks/use-online'

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
    await Promise.all([
      context.queryClient.ensureQueryData(dashboardQueryOptions(deps.month)),
      context.queryClient.ensureQueryData(bootstrapQueryOptions()),
    ])
  },
  pendingComponent: DashboardSkeleton,
  errorComponent: OfflineDashboard,
  component: DashboardPage,
})

function DashboardPage() {
  const { month, action } = Route.useSearch()
  const { data: dashboard } = useSuspenseQuery(dashboardQueryOptions(month))
  const { data: bootstrap } = useSuspenseQuery(bootstrapQueryOptions())
  const online = useOnline()
  const quickAdd = useQuickAdd()
  const navigate = useNavigate({ from: '/' })

  useEffect(() => {
    void cacheDashboard(dashboard)
  }, [dashboard])

  // Manifest shortcuts open the flow once, then clean the URL.
  useEffect(() => {
    if (!action) return
    quickAdd.open(action)
    void navigate({ search: (previous) => ({ month: previous.month }), replace: true })
  }, [action, navigate, quickAdd])

  return (
    <div className="page dashboard-page">
      {!online && (
        <div className="offline-notice" role="status">
          <CloudOff size={18} />
          Modo sin conexión · última sincronización {new Date(dashboard.syncedAt).toLocaleString('es-BO')}.
        </div>
      )}
      <section className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">Tu mes, en claro</span>
          <h1>Hola, este es tu pulso.</h1>
        </div>
        <MonthSwitcher month={dashboard.month} onChange={(next) => navigate({ search: (previous) => ({ ...previous, month: next }) })} />
      </section>

      <PulseCard snapshot={dashboard} />

      <div className="quick-actions" aria-label="Acciones rápidas">
        <button type="button" className="quick-action" onClick={() => quickAdd.open('pending')} disabled={!online}>
          <span><Plus size={19} /></span>
          <span><strong>Añadir pendiente</strong><small>Programa un próximo pago</small></span>
        </button>
        <button type="button" className="quick-action" onClick={() => quickAdd.open('paid')} disabled={!online}>
          <span><CheckCircle2 size={19} /></span>
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
    </div>
  )
}

const WEEKS = ['1-7', '8-14', '15-21', '22-28', '29-31'] as const

function PulseCard({ snapshot }: { snapshot: DashboardSnapshot }) {
  const totals = snapshot.totals[0] ?? { currency: 'BOB', committed: 0, paid: 0, pending: 0 }
  const additionalTotals = snapshot.totals.slice(1)
  const paidPercent = totals.committed ? Math.round((totals.paid / totals.committed) * 100) : 0

  const weeks = useMemo(() => {
    const buckets = WEEKS.map((label) => ({ label, paid: 0, pending: 0 }))
    for (const expense of snapshot.expenses) {
      if (expense.currency !== totals.currency) continue
      const bucket = buckets[Math.min(4, Math.floor((Number(expense.dueDate.slice(8, 10)) - 1) / 7))]
      if (expense.paidAt) bucket.paid += expense.amountMinor
      else bucket.pending += expense.amountMinor
    }
    const peak = Math.max(1, ...buckets.map((bucket) => bucket.paid + bucket.pending))
    return buckets.map((bucket) => ({ ...bucket, total: bucket.paid + bucket.pending, peak }))
  }, [snapshot.expenses, totals.currency])

  return (
    <section className="pulse-card" aria-label={`Pulso de ${monthLabel(snapshot.month)}`}>
      <div className="pulse-topline"><span>Por pagar · {monthLabel(snapshot.month)}</span><strong>{paidPercent}% resuelto</strong></div>
      <Money className="pulse-amount" amountMinor={totals.pending} currency={totals.currency} />
      <div className="pulse-stats">
        <div><span>Comprometido</span><strong>{formatMoney(totals.committed, totals.currency)}</strong></div>
        <div><span>Pagado</span><strong className="is-paid">{formatMoney(totals.paid, totals.currency)}</strong></div>
      </div>

      <div className="rhythm" role="img" aria-label={`Ritmo del mes por semana: ${weeks.map((week) => `${week.label}: ${formatMoney(week.total, totals.currency)}`).join(', ')}`}>
        {weeks.map((week) => (
          <div className="rhythm-col" key={week.label}>
            <div className="rhythm-bar">
              <span className="rhythm-fill" style={{ height: `${(week.total / week.peak) * 100}%` }}>
                {week.pending > 0 && <i className="rhythm-pending" style={{ flexGrow: week.pending }} />}
                {week.paid > 0 && <i className="rhythm-paid" style={{ flexGrow: week.paid }} />}
              </span>
            </div>
            <small>{week.label}</small>
          </div>
        ))}
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

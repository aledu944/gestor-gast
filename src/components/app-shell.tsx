import { Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  CloudOff,
  FolderKanban,
  ListChecks,
  Plus,
  Settings,
  Timer,
  WalletCards,
  Home,
} from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { bootstrapQueryOptions, expenseQueryKeys } from '#/features/expenses/queries'
import type { DashboardSnapshot, ExpenseDto } from '#/features/expenses/types'
import { useOnline } from '#/hooks/use-online'
import { normalizeMonth } from '#/lib/finance'
import { ExpenseDialog } from './expense-dialog'
import { ActionSheet } from './sheet'

const tabsBefore = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/gastos', label: 'Gastos', icon: ListChecks },
] as const
const tabsAfter = [
  { to: '/categorias', label: 'Categorías', icon: FolderKanban },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
] as const
const allTabs = [...tabsBefore, ...tabsAfter]

type QuickAddMode = 'pending' | 'paid'
type QuickAddValue = { open: (mode?: QuickAddMode) => void }

const QuickAddContext = createContext<QuickAddValue | null>(null)

/** Opens the create-expense flow from any screen. Without a mode it asks which one. */
export function useQuickAdd() {
  const value = useContext(QuickAddContext)
  if (!value) throw new Error('useQuickAdd must be used inside AppShell')
  return value
}

export function AppShell({ children }: { children: ReactNode }) {
  const online = useOnline()
  const queryClient = useQueryClient()
  const [picker, setPicker] = useState(false)
  const [mode, setMode] = useState<QuickAddMode | null>(null)
  const [pending, setPending] = useState<ExpenseDto[]>([])
  const { data: bootstrap } = useQuery(bootstrapQueryOptions())

  const open = useCallback((next?: QuickAddMode) => {
    if (!next) {
      setPicker(true)
      return
    }
    // Reuse whatever dashboard is already cached; never fetch just to list pending items.
    const [, snapshot] = queryClient.getQueriesData<DashboardSnapshot>({ queryKey: expenseQueryKeys.dashboards })[0] ?? []
    setPending(snapshot ? [...snapshot.overdue, ...snapshot.upcoming] : [])
    setPicker(false)
    setMode(next)
  }, [queryClient])

  const value = useMemo(() => ({ open }), [open])

  return (
    <QuickAddContext.Provider value={value}>
      <div className="app-shell">
        <aside className="desktop-sidebar">
          <Brand />
          <button type="button" className="button primary block side-add" onClick={() => open()} disabled={!online}>
            <Plus size={18} aria-hidden="true" />Nuevo movimiento
          </button>
          <nav className="side-nav" aria-label="Navegación principal">
            {allTabs.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} activeOptions={{ exact: to === '/' }}>
                {({ isActive }) => (
                  <span className={isActive ? 'is-active' : ''}>
                    <Icon size={19} aria-hidden="true" />
                    {label}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <div className="sidebar-note">
            <span className={`status-dot${online ? '' : ' is-offline'}`} />
            {online ? 'Tus cifras, al día' : 'Modo de consulta offline'}
          </div>
        </aside>

        <div className="app-stage">
          <header className="mobile-header">
            <Brand />
            {!online && <span className="offline-chip"><CloudOff size={14} aria-hidden="true" />Sin conexión</span>}
          </header>
          <main className="page-stage">{children}</main>
        </div>

        <nav className="mobile-nav" aria-label="Navegación principal">
          {tabsBefore.map((tab) => <Tab key={tab.to} {...tab} />)}
          <button type="button" className="fab" onClick={() => open()} disabled={!online} aria-label="Nuevo movimiento">
            <Plus size={26} strokeWidth={2.4} aria-hidden="true" />
          </button>
          {tabsAfter.map((tab) => <Tab key={tab.to} {...tab} />)}
        </nav>
      </div>

      {picker && (
        <ActionSheet
          title="Nuevo movimiento"
          eyebrow="¿Qué quieres hacer?"
          onClose={() => setPicker(false)}
          actions={[
            { label: 'Añadir pendiente', hint: 'Programa un próximo pago', icon: <Timer size={18} />, onSelect: () => open('pending') },
            { label: 'Registrar pago', hint: 'Cierra un pendiente o anota un gasto', icon: <CheckCircle2 size={18} />, onSelect: () => open('paid') },
          ]}
        />
      )}
      {mode && (
        <ExpenseDialog
          mode={mode}
          categories={bootstrap?.categories ?? []}
          pendingExpenses={pending}
          onClose={() => setMode(null)}
        />
      )}
    </QuickAddContext.Provider>
  )
}

function Tab({ to, label, icon: Icon }: (typeof allTabs)[number]) {
  return (
    <Link to={to} activeOptions={{ exact: to === '/' }}>
      {({ isActive }) => (
        <span className={isActive ? 'is-active' : ''}>
          <Icon size={21} aria-hidden="true" />
          <small>{label}</small>
        </span>
      )}
    </Link>
  )
}

function Brand() {
  return (
    <Link className="brand" to="/" search={{ month: normalizeMonth() }} aria-label="Gestor Gast, inicio">
      <span className="brand-mark"><WalletCards size={20} aria-hidden="true" /></span>
      <span>Gestor <strong>Gast</strong></span>
    </Link>
  )
}

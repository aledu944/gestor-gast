import { Link } from '@tanstack/react-router'
import {
  ChartNoAxesCombined,
  FolderKanban,
  ListChecks,
  Settings,
  WalletCards,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useOnline } from '#/hooks/use-online'
import { normalizeMonth } from '#/lib/finance'
import { ThemeControl } from './theme-control'

const navItems = [
  { to: '/', label: 'Inicio', icon: ChartNoAxesCombined },
  { to: '/gastos', label: 'Gastos', icon: ListChecks },
  { to: '/categorias', label: 'Categorías', icon: FolderKanban },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const online = useOnline()
  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <Brand />
        <nav className="side-nav" aria-label="Navegación principal">
          {navItems.map(({ to, label, icon: Icon }) => (
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
          <ThemeControl compact />
        </header>
        <main className="page-stage">{children}</main>
      </div>

      <nav className="mobile-nav" aria-label="Navegación principal">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} activeOptions={{ exact: to === '/' }}>
            {({ isActive }) => (
              <span className={isActive ? 'is-active' : ''}>
                <Icon size={20} aria-hidden="true" />
                <small>{label}</small>
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  )
}

function Brand() {
  return (
    <Link className="brand" to="/" search={{ month: normalizeMonth() }} aria-label="Gestor Gast, inicio">
      <span className="brand-mark"><WalletCards size={21} aria-hidden="true" /></span>
      <span>Gestor <strong>Gast</strong></span>
    </Link>
  )
}

import { Laptop, Moon, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'

function applyTheme(mode: ThemeMode) {
  const dark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

export function ThemeControl({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemeMode>('system')
  const activeTheme = useRef<ThemeMode>('system')

  useEffect(() => {
    const saved = localStorage.getItem('gestor-gast-theme') as ThemeMode | null
    const initial = saved && ['system', 'light', 'dark'].includes(saved) ? saved : 'system'
    activeTheme.current = initial
    setTheme(initial)
    applyTheme(initial)
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => activeTheme.current === 'system' && applyTheme('system')
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  const choose = (mode: ThemeMode) => {
    activeTheme.current = mode
    setTheme(mode)
    localStorage.setItem('gestor-gast-theme', mode)
    applyTheme(mode)
  }

  if (compact) {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Laptop
    return (
      <button className="icon-button" onClick={() => choose(next)} aria-label={`Tema: ${theme}`}>
        <Icon size={18} aria-hidden="true" />
      </button>
    )
  }

  return (
    <div className="segmented-control" aria-label="Tema de la aplicación">
      {([
        ['system', Laptop, 'Sistema'],
        ['light', Sun, 'Claro'],
        ['dark', Moon, 'Oscuro'],
      ] as const).map(([mode, Icon, label]) => (
        <button
          key={mode}
          className={theme === mode ? 'is-selected' : ''}
          onClick={() => choose(mode)}
          aria-pressed={theme === mode}
        >
          <Icon size={16} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  )
}

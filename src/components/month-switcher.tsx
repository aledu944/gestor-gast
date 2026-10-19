import { ChevronLeft, ChevronRight } from 'lucide-react'

import { addMonths, monthKey, monthLabel, monthStart } from '#/lib/finance'

export function MonthSwitcher({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const shift = (amount: number) => onChange(monthKey(addMonths(monthStart(month), amount)))
  return (
    <div className="month-switcher" role="group" aria-label="Período">
      <button type="button" className="icon-button" onClick={() => shift(-1)} aria-label="Mes anterior">
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <span aria-live="polite">{monthLabel(month)}</span>
      <button type="button" className="icon-button" onClick={() => shift(1)} aria-label="Mes siguiente">
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  )
}

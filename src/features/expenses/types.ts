export type CategoryDto = {
  id: string
  name: string
  icon: string
  color: string
}

export type ExpenseDto = {
  id: string
  name: string
  amountMinor: number
  currency: string
  dueDate: string
  paidAt: string | null
  notes: string | null
  period: string | null
  recurringExpenseId: string | null
  category: CategoryDto | null
}

export type CurrencyTotals = {
  currency: string
  committed: number
  paid: number
  pending: number
}

export type CategoryTotal = CategoryDto & {
  amountMinor: number
  currency: string
}

export type DashboardSnapshot = {
  month: string
  totals: CurrencyTotals[]
  expenses: ExpenseDto[]
  overdue: ExpenseDto[]
  upcoming: ExpenseDto[]
  categoryTotals: CategoryTotal[]
  syncedAt: string
}

export type SettingsDto = {
  defaultCurrency: string
  timeZone: string
  dueReminderDays: number
  monthlyDigestEnabled: boolean
  reminderHour: number
}

export type ExpenseFilters = {
  month: string
  status: 'all' | 'pending' | 'paid' | 'overdue'
  category: string
  query: string
  sort: 'due-asc' | 'due-desc' | 'amount-desc'
}

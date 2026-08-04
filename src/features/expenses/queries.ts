import { queryOptions } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'

import { getBootstrap, getDashboard, getExpenses } from './expenses.functions'
import type { ExpenseFilters } from './types'

export const expenseQueryKeys = {
  all: ['gestor-gast'] as const,
  bootstrap: ['gestor-gast', 'bootstrap'] as const,
  dashboard: (month: string) => ['gestor-gast', 'dashboard', month] as const,
  expenses: (filters: ExpenseFilters) => ['gestor-gast', 'expenses', filters] as const,
}

export const bootstrapQueryOptions = () => queryOptions({
  queryKey: expenseQueryKeys.bootstrap,
  queryFn: () => getBootstrap(),
  staleTime: 15_000,
})

export const dashboardQueryOptions = (month: string) => queryOptions({
  queryKey: expenseQueryKeys.dashboard(month),
  queryFn: () => getDashboard({ data: { month } }),
  staleTime: 15_000,
})

export const expensesQueryOptions = (filters: ExpenseFilters) => queryOptions({
  queryKey: expenseQueryKeys.expenses(filters),
  queryFn: () => getExpenses({ data: filters }),
  staleTime: 15_000,
})

export const invalidateExpenseQueries = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: expenseQueryKeys.all })

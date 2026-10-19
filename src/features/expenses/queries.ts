import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'

import { getBootstrap, getDashboard, getExpenses } from './expenses.functions'
import type { ExpenseFilters } from './types'

export const expenseQueryKeys = {
  all: ['gestor-gast'] as const,
  bootstrap: ['gestor-gast', 'bootstrap'] as const,
  dashboards: ['gestor-gast', 'dashboard'] as const,
  expenseLists: ['gestor-gast', 'expenses'] as const,
  dashboard: (month: string) => ['gestor-gast', 'dashboard', month] as const,
  expenses: (filters: ExpenseFilters) => ['gestor-gast', 'expenses', filters] as const,
}

export const bootstrapQueryOptions = () => queryOptions({
  queryKey: expenseQueryKeys.bootstrap,
  queryFn: () => getBootstrap(),
  staleTime: 5 * 60_000,
})

export const dashboardQueryOptions = (month: string) => queryOptions({
  queryKey: expenseQueryKeys.dashboard(month),
  queryFn: () => getDashboard({ data: { month } }),
})

export const expensesQueryOptions = (filters: ExpenseFilters) => queryOptions({
  queryKey: expenseQueryKeys.expenses(filters),
  queryFn: () => getExpenses({ data: filters }),
  placeholderData: keepPreviousData,
})

/** Refresh every month/filter view after expenses change. Categories and settings stay cached. */
export const invalidateExpenseViews = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: expenseQueryKeys.dashboards }),
    queryClient.invalidateQueries({ queryKey: expenseQueryKeys.expenseLists }),
  ])

/** Categories are embedded in every expense, so they refresh all three. */
export const invalidateCategoryViews = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: expenseQueryKeys.bootstrap }),
    invalidateExpenseViews(queryClient),
  ])

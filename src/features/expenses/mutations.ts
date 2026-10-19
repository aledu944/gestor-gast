import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  createExpense,
  deleteCategory,
  deleteExpense,
  saveCategory,
  setExpensePayment,
  updateExpense,
  updateSettings,
} from './expenses.functions'
import {
  expenseQueryKeys,
  invalidateCategoryViews,
  invalidateExpenseViews,
} from './queries'
import type { DashboardSnapshot, ExpenseDto } from './types'

type Variables<T extends (...args: never[]) => unknown> = Parameters<T>[0]['data']

function patchExpense(expense: ExpenseDto, id: string, paidAt: string | null) {
  return expense.id === id ? { ...expense, paidAt } : expense
}

function recalculate(snapshot: DashboardSnapshot, id: string, paidAt: string | null): DashboardSnapshot {
  const expenses = snapshot.expenses.map((item) => patchExpense(item, id, paidAt))
  const totals = new Map<string, { committed: number; paid: number; pending: number }>()
  for (const item of expenses) {
    const current = totals.get(item.currency) ?? { committed: 0, paid: 0, pending: 0 }
    current.committed += item.amountMinor
    if (item.paidAt) current.paid += item.amountMinor
    else current.pending += item.amountMinor
    totals.set(item.currency, current)
  }
  const pendingOf = (list: ExpenseDto[]) => list.filter((item) => item.id !== id || !paidAt)
  return {
    ...snapshot,
    expenses,
    totals: [...totals.entries()].map(([currency, value]) => ({ currency, ...value })),
    overdue: pendingOf(snapshot.overdue),
    upcoming: pendingOf(snapshot.upcoming),
  }
}

/** Marks an expense paid or pending instantly, rolling back if the server rejects it. */
export function useSetPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Variables<typeof setExpensePayment>) => setExpensePayment({ data }),
    onMutate: async ({ id, paid, paidAt }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: expenseQueryKeys.dashboards }),
        queryClient.cancelQueries({ queryKey: expenseQueryKeys.expenseLists }),
      ])
      const stamp = paid ? (paidAt ?? new Date().toISOString()) : null
      const previous = [
        ...queryClient.getQueriesData<DashboardSnapshot>({ queryKey: expenseQueryKeys.dashboards }),
        ...queryClient.getQueriesData<ExpenseDto[]>({ queryKey: expenseQueryKeys.expenseLists }),
      ]
      queryClient.setQueriesData<DashboardSnapshot>(
        { queryKey: expenseQueryKeys.dashboards },
        (snapshot) => (snapshot ? recalculate(snapshot, id, stamp) : snapshot),
      )
      queryClient.setQueriesData<ExpenseDto[]>(
        { queryKey: expenseQueryKeys.expenseLists },
        (list) => list?.map((item) => patchExpense(item, id, stamp)),
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      context?.previous.forEach(([key, value]) => queryClient.setQueryData(key, value))
    },
    onSettled: () => invalidateExpenseViews(queryClient),
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Variables<typeof createExpense>) => createExpense({ data }),
    onSuccess: () => invalidateExpenseViews(queryClient),
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Variables<typeof updateExpense>) => updateExpense({ data }),
    onSuccess: () => invalidateExpenseViews(queryClient),
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Variables<typeof deleteExpense>) => deleteExpense({ data }),
    onSuccess: () => invalidateExpenseViews(queryClient),
  })
}

export function useSaveCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Variables<typeof saveCategory>) => saveCategory({ data }),
    onSuccess: () => invalidateCategoryViews(queryClient),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Variables<typeof deleteCategory>) => deleteCategory({ data }),
    onSuccess: () => invalidateCategoryViews(queryClient),
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Variables<typeof updateSettings>) => updateSettings({ data }),
    onSuccess: (settings) => {
      queryClient.setQueryData(expenseQueryKeys.bootstrap, (bootstrap: { categories: unknown[]; settings: unknown } | undefined) =>
        bootstrap ? { ...bootstrap, settings } : bootstrap,
      )
    },
  })
}

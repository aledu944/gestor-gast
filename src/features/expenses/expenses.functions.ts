import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import {
  categoryInputSchema,
  dashboardInputSchema,
  deleteExpenseInputSchema,
  expenseFiltersSchema,
  expenseInputSchema,
  idInputSchema,
  paymentInputSchema,
  pushSubscriptionSchema,
  settingsInputSchema,
  updateExpenseInputSchema,
} from './schemas'
import {
  createExpenseData,
  deleteCategoryData,
  deleteExpenseData,
  disablePushSubscriptionData,
  getBootstrapData,
  getDashboardData,
  getExpensesData,
  saveCategoryData,
  savePushSubscriptionData,
  setPaymentData,
  updateExpenseData,
  updateSettingsData,
} from './expenses.server'

export const getDashboard = createServerFn({ method: 'GET' })
  .validator(dashboardInputSchema)
  .handler(({ data }) => getDashboardData(data.month))

export const getExpenses = createServerFn({ method: 'GET' })
  .validator(expenseFiltersSchema)
  .handler(({ data }) => getExpensesData(data))

export const getBootstrap = createServerFn({ method: 'GET' }).handler(() =>
  getBootstrapData(),
)

export const createExpense = createServerFn({ method: 'POST' })
  .validator(expenseInputSchema)
  .handler(({ data }) => createExpenseData(data))

export const updateExpense = createServerFn({ method: 'POST' })
  .validator(updateExpenseInputSchema)
  .handler(({ data }) => updateExpenseData(data))

export const deleteExpense = createServerFn({ method: 'POST' })
  .validator(deleteExpenseInputSchema)
  .handler(({ data }) => deleteExpenseData(data))

export const setExpensePayment = createServerFn({ method: 'POST' })
  .validator(paymentInputSchema)
  .handler(({ data }) => setPaymentData(data))

export const saveCategory = createServerFn({ method: 'POST' })
  .validator(categoryInputSchema)
  .handler(({ data }) => saveCategoryData(data))

export const deleteCategory = createServerFn({ method: 'POST' })
  .validator(idInputSchema)
  .handler(({ data }) => deleteCategoryData(data.id))

export const updateSettings = createServerFn({ method: 'POST' })
  .validator(settingsInputSchema)
  .handler(({ data }) => updateSettingsData(data))

export const getVapidPublicKey = createServerFn({ method: 'GET' }).handler(() => ({
  publicKey: process.env.VAPID_PUBLIC_KEY ?? null,
}))

export const savePushSubscription = createServerFn({ method: 'POST' })
  .validator(pushSubscriptionSchema)
  .handler(({ data }) => savePushSubscriptionData(data))

export const disablePushSubscription = createServerFn({ method: 'POST' })
  .validator(z.object({ endpoint: z.string().url() }))
  .handler(({ data }) => disablePushSubscriptionData(data.endpoint))

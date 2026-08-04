import { z } from 'zod'

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const monthSchema = z.string().regex(/^\d{4}-\d{2}$/)

export const dashboardInputSchema = z.object({ month: monthSchema })

export const expenseFiltersSchema = z.object({
  month: monthSchema,
  status: z.enum(['all', 'pending', 'paid', 'overdue']).default('all'),
  category: z.string().default('all'),
  query: z.string().max(80).default(''),
  sort: z.enum(['due-asc', 'due-desc', 'amount-desc']).default('due-asc'),
})

export const expenseInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  amountMinor: z.number().int().positive().max(2_000_000_000),
  dueDate: dateOnlySchema,
  paidAt: z.string().datetime().nullable().optional(),
  notes: z.string().trim().max(240).nullable().optional(),
  categoryId: z.string().nullable().optional(),
  recurring: z.boolean().default(false),
  endsOn: monthSchema.nullable().optional(),
})

export const updateExpenseInputSchema = expenseInputSchema.extend({
  id: z.string().min(1),
  scope: z.enum(['occurrence', 'future']).default('occurrence'),
})

export const deleteExpenseInputSchema = z.object({
  id: z.string().min(1),
  scope: z.enum(['occurrence', 'future']).default('occurrence'),
})

export const paymentInputSchema = z.object({
  id: z.string().min(1),
  paid: z.boolean(),
  paidAt: z.string().datetime().optional(),
})

export const categoryInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(32),
  icon: z.enum(['House', 'Zap', 'ShoppingBasket', 'Bus', 'HeartPulse', 'RefreshCw', 'GraduationCap', 'Gamepad2', 'Gift', 'Shapes']),
  color: z.enum(['#5B5BD6', '#F2A65A', '#2DBA9A', '#5B8DEF', '#E56872', '#9467D8']),
})

export const idInputSchema = z.object({ id: z.string().min(1) })

export const settingsInputSchema = z.object({
  defaultCurrency: z.string().length(3).transform((value) => value.toUpperCase()),
  timeZone: z.string().min(1).max(64),
  dueReminderDays: z.number().int().min(1).max(30),
  monthlyDigestEnabled: z.boolean(),
  reminderHour: z.number().int().min(0).max(23),
})

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().max(300).optional(),
})

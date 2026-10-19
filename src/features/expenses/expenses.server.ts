import '@tanstack/react-start/server-only'

import type { Prisma } from '#/generated/prisma/client.js'
import { getPrisma } from '#/db.server'
import {
  addMonths,
  dateForDay,
  dateOnlyString,
  monthBounds,
  monthKey,
  monthStart,
  normalizeMonth,
  toDateOnly,
  todayInTimeZone,
} from '#/lib/finance'

import type {
  CategoryDto,
  DashboardSnapshot,
  ExpenseDto,
  SettingsDto,
} from './types'

type ExpenseWithCategory = Prisma.ExpenseGetPayload<{
  include: { category: true }
}>

function serializeCategory(
  category: ExpenseWithCategory['category'],
): CategoryDto | null {
  if (!category) return null
  return {
    id: category.id,
    name: category.name,
    icon: category.icon,
    color: category.color,
  }
}

function serializeExpense(expense: ExpenseWithCategory): ExpenseDto {
  return {
    id: expense.id,
    name: expense.name,
    amountMinor: expense.amountMinor,
    currency: expense.currency,
    dueDate: dateOnlyString(expense.dueDate),
    paidAt: expense.paidAt?.toISOString() ?? null,
    notes: expense.notes,
    period: expense.period ? monthKey(expense.period) : null,
    recurringExpenseId: expense.recurringExpenseId,
    category: serializeCategory(expense.category),
  }
}

function serializeSettings(settings: {
  defaultCurrency: string
  timeZone: string
  dueReminderDays: number
  monthlyDigestEnabled: boolean
  reminderHour: number
}): SettingsDto {
  return {
    defaultCurrency: settings.defaultCurrency,
    timeZone: settings.timeZone,
    dueReminderDays: settings.dueReminderDays,
    monthlyDigestEnabled: settings.monthlyDigestEnabled,
    reminderHour: settings.reminderHour,
  }
}

export async function ensureSettings() {
  const prisma = getPrisma()
  const existing = await prisma.appSettings.findUnique({ where: { id: 'default' } })
  if (existing) return existing
  return prisma.appSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  })
}

// Months already expanded from recurring series, with the time they were checked.
// Avoids re-running the expansion on every read; cleared whenever a series changes.
const MATERIALIZE_TTL_MS = 10 * 60_000
const materializedMonths = new Map<string, number>()

export function invalidateMaterialized() {
  materializedMonths.clear()
}

export async function materializeMonth(monthValue: string) {
  const key = normalizeMonth(monthValue)
  const checkedAt = materializedMonths.get(key)
  if (checkedAt && Date.now() - checkedAt < MATERIALIZE_TTL_MS) return

  const prisma = getPrisma()
  const month = monthStart(key)
  const nextMonth = addMonths(month, 1)
  const series = await prisma.recurringExpense.findMany({
    where: {
      active: true,
      startsOn: { lt: nextMonth },
      OR: [{ endsOn: null }, { endsOn: { gte: month } }],
    },
  })

  if (series.length) {
    await prisma.expense.createMany({
      data: series.map((item) => ({
        name: item.name,
        amountMinor: item.amountMinor,
        currency: item.currency,
        dueDate: dateForDay(month, item.dueDay),
        period: month,
        notes: item.notes,
        categoryId: item.categoryId,
        recurringExpenseId: item.id,
      })),
      skipDuplicates: true,
    })
  }
  materializedMonths.set(key, Date.now())
}

export async function getDashboardData(monthValue: string): Promise<DashboardSnapshot> {
  const prisma = getPrisma()
  const month = normalizeMonth(monthValue)
  const settings = await ensureSettings()
  const today = todayInTimeZone(settings.timeZone)
  const currentMonth = monthKey(today)

  await Promise.all(
    [...new Set([month, currentMonth, monthKey(addMonths(today, 1))])].map(materializeMonth),
  )

  const { start, end } = monthBounds(month)
  const upcomingEnd = new Date(today)
  upcomingEnd.setUTCDate(upcomingEnd.getUTCDate() + 31)

  const [expenses, overdue, upcoming] = await Promise.all([
    prisma.expense.findMany({
      where: { dueDate: { gte: start, lt: end } },
      include: { category: true },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.expense.findMany({
      where: { paidAt: null, dueDate: { lt: today } },
      include: { category: true },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.expense.findMany({
      where: { paidAt: null, dueDate: { gte: today, lte: upcomingEnd } },
      include: { category: true },
      orderBy: { dueDate: 'asc' },
      take: 8,
    }),
  ])

  const totalsByCurrency = new Map<
    string,
    { committed: number; paid: number; pending: number }
  >()
  const categoryMap = new Map<
    string,
    CategoryDto & { amountMinor: number; currency: string }
  >()

  for (const expense of expenses) {
    const totals = totalsByCurrency.get(expense.currency) ?? {
      committed: 0,
      paid: 0,
      pending: 0,
    }
    totals.committed += expense.amountMinor
    if (expense.paidAt) totals.paid += expense.amountMinor
    else totals.pending += expense.amountMinor
    totalsByCurrency.set(expense.currency, totals)

    if (expense.category) {
      const key = `${expense.category.id}:${expense.currency}`
      const current = categoryMap.get(key)
      categoryMap.set(key, {
        id: expense.category.id,
        name: expense.category.name,
        icon: expense.category.icon,
        color: expense.category.color,
        currency: expense.currency,
        amountMinor: (current?.amountMinor ?? 0) + expense.amountMinor,
      })
    }
  }

  return {
    month,
    totals: [...totalsByCurrency.entries()].map(([currency, totals]) => ({
      currency,
      ...totals,
    })),
    expenses: expenses.map(serializeExpense),
    overdue: overdue.map(serializeExpense),
    upcoming: upcoming.map(serializeExpense),
    categoryTotals: [...categoryMap.values()].sort(
      (a, b) => b.amountMinor - a.amountMinor,
    ),
    syncedAt: new Date().toISOString(),
  }
}

export async function getExpensesData(input: {
  month: string
  status: 'all' | 'pending' | 'paid' | 'overdue'
  category: string
  query: string
  sort: 'due-asc' | 'due-desc' | 'amount-desc'
}) {
  const prisma = getPrisma()
  const month = normalizeMonth(input.month)
  const [settings] = await Promise.all([ensureSettings(), materializeMonth(month)])
  const today = todayInTimeZone(settings.timeZone)
  const { start, end } = monthBounds(month)

  const where: Prisma.ExpenseWhereInput = {
    dueDate: { gte: start, lt: end },
    ...(input.category !== 'all' ? { categoryId: input.category } : {}),
    ...(input.query
      ? { name: { contains: input.query, mode: 'insensitive' } }
      : {}),
  }

  if (input.status === 'paid') where.paidAt = { not: null }
  if (input.status === 'pending') where.paidAt = null
  if (input.status === 'overdue') {
    where.paidAt = null
    where.dueDate = { gte: start, lt: today }
  }

  const orderBy: Prisma.ExpenseOrderByWithRelationInput =
    input.sort === 'due-desc'
      ? { dueDate: 'desc' }
      : input.sort === 'amount-desc'
        ? { amountMinor: 'desc' }
        : { dueDate: 'asc' }

  const expenses = await prisma.expense.findMany({
    where,
    include: { category: true },
    orderBy,
  })
  return expenses.map(serializeExpense)
}

export async function getBootstrapData() {
  const prisma = getPrisma()
  const [categories, settings] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    ensureSettings(),
  ])
  return {
    categories: categories.map(({ id, name, icon, color }) => ({
      id,
      name,
      icon,
      color,
    })),
    settings: serializeSettings(settings),
  }
}

export async function createExpenseData(input: {
  name: string
  amountMinor: number
  dueDate: string
  paidAt?: string | null
  notes?: string | null
  categoryId?: string | null
  recurring: boolean
  endsOn?: string | null
}) {
  const prisma = getPrisma()
  const settings = await ensureSettings()
  const dueDate = toDateOnly(input.dueDate)
  const period = monthStart(monthKey(dueDate))

  return prisma.$transaction(async (tx) => {
    if (!input.recurring) {
      return tx.expense.create({
        data: {
          name: input.name,
          amountMinor: input.amountMinor,
          currency: settings.defaultCurrency,
          dueDate,
          paidAt: input.paidAt ? new Date(input.paidAt) : null,
          notes: input.notes || null,
          categoryId: input.categoryId || null,
        },
      })
    }

    const recurring = await tx.recurringExpense.create({
      data: {
        name: input.name,
        amountMinor: input.amountMinor,
        currency: settings.defaultCurrency,
        dueDay: dueDate.getUTCDate(),
        startsOn: period,
        endsOn: input.endsOn ? monthStart(input.endsOn) : null,
        notes: input.notes || null,
        categoryId: input.categoryId || null,
      },
    })

    return tx.expense.create({
      data: {
        name: input.name,
        amountMinor: input.amountMinor,
        currency: settings.defaultCurrency,
        dueDate,
        paidAt: input.paidAt ? new Date(input.paidAt) : null,
        notes: input.notes || null,
        categoryId: input.categoryId || null,
        recurringExpenseId: recurring.id,
        period,
      },
    })
  })
}

export async function updateExpenseData(input: {
  id: string
  name: string
  amountMinor: number
  dueDate: string
  paidAt?: string | null
  notes?: string | null
  categoryId?: string | null
  recurring: boolean
  endsOn?: string | null
  scope: 'occurrence' | 'future'
}) {
  const prisma = getPrisma()
  const expense = await prisma.expense.findUniqueOrThrow({ where: { id: input.id } })
  const dueDate = toDateOnly(input.dueDate)

  if (input.scope === 'occurrence' || !expense.recurringExpenseId || !expense.period) {
    return prisma.expense.update({
      where: { id: input.id },
      data: {
        name: input.name,
        amountMinor: input.amountMinor,
        dueDate,
        paidAt: input.paidAt ? new Date(input.paidAt) : null,
        notes: input.notes || null,
        categoryId: input.categoryId || null,
      },
    })
  }

  return prisma.$transaction(async (tx) => {
    await tx.recurringExpense.update({
      where: { id: expense.recurringExpenseId! },
      data: {
        name: input.name,
        amountMinor: input.amountMinor,
        dueDay: dueDate.getUTCDate(),
        endsOn: input.endsOn ? monthStart(input.endsOn) : null,
        notes: input.notes || null,
        categoryId: input.categoryId || null,
      },
    })

    const future = await tx.expense.findMany({
      where: {
        recurringExpenseId: expense.recurringExpenseId,
        period: { gte: expense.period! },
        paidAt: null,
      },
    })
    for (const item of future) {
      await tx.expense.update({
        where: { id: item.id },
        data: {
          name: input.name,
          amountMinor: input.amountMinor,
          dueDate: dateForDay(item.period!, dueDate.getUTCDate()),
          notes: input.notes || null,
          categoryId: input.categoryId || null,
        },
      })
    }
    return { updated: future.length }
  })
}

export async function deleteExpenseData(input: {
  id: string
  scope: 'occurrence' | 'future'
}) {
  const prisma = getPrisma()
  const expense = await prisma.expense.findUniqueOrThrow({ where: { id: input.id } })
  if (input.scope === 'occurrence' || !expense.recurringExpenseId || !expense.period) {
    await prisma.expense.delete({ where: { id: input.id } })
    return { deleted: 1 }
  }

  return prisma.$transaction(async (tx) => {
    await tx.recurringExpense.update({
      where: { id: expense.recurringExpenseId! },
      data: { active: false, endsOn: addMonths(expense.period!, -1) },
    })
    const result = await tx.expense.deleteMany({
      where: {
        recurringExpenseId: expense.recurringExpenseId,
        period: { gte: expense.period! },
        paidAt: null,
      },
    })
    return { deleted: result.count }
  })
}

export async function setPaymentData(input: {
  id: string
  paid: boolean
  paidAt?: string
}) {
  return getPrisma().expense.update({
    where: { id: input.id },
    data: { paidAt: input.paid ? new Date(input.paidAt ?? Date.now()) : null },
  })
}

function normalizeCategoryName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es')
}

export async function saveCategoryData(input: {
  id?: string
  name: string
  icon: string
  color: string
}) {
  const data = {
    name: input.name,
    normalizedName: normalizeCategoryName(input.name),
    icon: input.icon,
    color: input.color,
  }
  if (input.id) {
    return getPrisma().category.update({ where: { id: input.id }, data })
  }
  return getPrisma().category.create({ data })
}

export async function deleteCategoryData(id: string) {
  await getPrisma().category.delete({ where: { id } })
  return { deleted: true }
}

export async function updateSettingsData(input: SettingsDto) {
  const settings = await getPrisma().appSettings.upsert({
    where: { id: 'default' },
    update: input,
    create: { id: 'default', ...input },
  })
  return serializeSettings(settings)
}

export async function savePushSubscriptionData(input: {
  endpoint: string
  keys: { p256dh: string; auth: string }
  userAgent?: string
}) {
  return getPrisma().pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    update: {
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent,
      enabled: true,
      lastSeenAt: new Date(),
    },
    create: {
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent,
    },
  })
}

export async function disablePushSubscriptionData(endpoint: string) {
  await getPrisma().pushSubscription.updateMany({
    where: { endpoint },
    data: { enabled: false },
  })
  return { disabled: true }
}

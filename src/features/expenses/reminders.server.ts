import '@tanstack/react-start/server-only'

import webpush from 'web-push'

import { getPrisma } from '#/db.server'
import { formatMoney, monthKey, todayInTimeZone } from '#/lib/finance'
import { ensureSettings, materializeMonth } from './expenses.server'

export async function runReminderCron() {
  const subject = process.env.VAPID_SUBJECT
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!subject || !publicKey || !privateKey) {
    throw new Error('VAPID configuration is incomplete')
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  const prisma = getPrisma()
  const settings = await ensureSettings()
  const today = todayInTimeZone(settings.timeZone)
  const windowEnd = new Date(today)
  windowEnd.setUTCDate(windowEnd.getUTCDate() + settings.dueReminderDays)

  await Promise.all([
    materializeMonth(monthKey(today)),
    materializeMonth(monthKey(windowEnd)),
  ])

  const [subscriptions, dueSoon, overdue] = await Promise.all([
    prisma.pushSubscription.findMany({ where: { enabled: true } }),
    prisma.expense.findMany({
      where: { paidAt: null, dueDate: { gte: today, lte: windowEnd } },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.expense.findMany({
      where: { paidAt: null, dueDate: { lt: today } },
      orderBy: { dueDate: 'asc' },
    }),
  ])

  let sent = 0
  for (const subscription of subscriptions) {
    for (const expense of dueSoon) {
      const referenceKey = `due:${expense.id}`
      const delivered = await prisma.notificationDelivery.findUnique({
        where: { subscriptionId_referenceKey: { subscriptionId: subscription.id, referenceKey } },
      })
      if (delivered) continue
      const days = Math.max(0, Math.round((expense.dueDate.getTime() - today.getTime()) / 86_400_000))
      const body = days === 0
        ? `${expense.name} vence hoy por ${formatMoney(expense.amountMinor, expense.currency)}.`
        : `${expense.name} vence en ${days} días por ${formatMoney(expense.amountMinor, expense.currency)}.`
      const ok = await send(subscription, {
        title: 'Pago próximo',
        body,
        url: `/gastos?month=${monthKey(expense.dueDate)}&status=pending&category=all&query=&sort=due-asc`,
        tag: referenceKey,
      })
      if (ok) {
        await prisma.notificationDelivery.create({
          data: { kind: 'DUE_SOON', referenceKey, subscriptionId: subscription.id, expenseId: expense.id },
        })
        sent += 1
      }
    }

    if (settings.monthlyDigestEnabled && today.getUTCDate() <= 3) {
      const month = monthKey(today)
      const referenceKey = `digest:${month}`
      const delivered = await prisma.notificationDelivery.findUnique({
        where: { subscriptionId_referenceKey: { subscriptionId: subscription.id, referenceKey } },
      })
      if (!delivered) {
        const current = await prisma.expense.findMany({
          where: {
            paidAt: null,
            dueDate: {
              gte: new Date(`${month}-01T00:00:00.000Z`),
              lt: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)),
            },
          },
          orderBy: { dueDate: 'asc' },
        })
        const names = [...overdue, ...current].slice(0, 3).map((expense) => expense.name).join(', ')
        const total = overdue.length + current.length
        const ok = await send(subscription, {
          title: `Tu mes comienza con ${total} ${total === 1 ? 'pendiente' : 'pendientes'}`,
          body: names ? `Lo más próximo: ${names}.` : 'No tienes pagos pendientes. Buen comienzo.',
          url: `/?month=${month}`,
          tag: referenceKey,
        })
        if (ok) {
          await prisma.notificationDelivery.create({
            data: { kind: 'MONTHLY_DIGEST', referenceKey, subscriptionId: subscription.id },
          })
          sent += 1
        }
      }
    }
  }

  return { ok: true, subscriptions: subscriptions.length, sent }
}

async function send(
  subscription: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url: string; tag: string },
) {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      { TTL: 86_400, urgency: 'normal' },
    )
    return true
  } catch (error) {
    const statusCode = error && typeof error === 'object' && 'statusCode' in error ? error.statusCode : null
    if (statusCode === 404 || statusCode === 410) {
      await getPrisma().pushSubscription.update({
        where: { id: subscription.id },
        data: { enabled: false },
      })
      return false
    }
    throw error
  }
}

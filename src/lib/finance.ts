export const DEFAULT_TIME_ZONE = 'America/La_Paz'
export const DEFAULT_CURRENCY = 'BOB'

export function normalizeMonth(value?: string) {
  const match = value?.match(/^(\d{4})-(0[1-9]|1[0-2])$/)
  if (match) return value as string
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

export function monthStart(month: string) {
  return new Date(`${normalizeMonth(month)}-01T00:00:00.000Z`)
}

export function addMonths(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1))
}

export function monthBounds(month: string) {
  const start = monthStart(month)
  return { start, end: addMonths(start, 1) }
}

export function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function dateForDay(month: Date, dueDay: number) {
  const lastDay = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
  ).getUTCDate()
  return new Date(
    Date.UTC(
      month.getUTCFullYear(),
      month.getUTCMonth(),
      Math.min(Math.max(dueDay, 1), lastDay),
    ),
  )
}

export function toDateOnly(value: string | Date) {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
  }
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`)
}

export function dateOnlyString(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function todayInTimeZone(timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return new Date(`${values.year}-${values.month}-${values.day}T00:00:00.000Z`)
}

export function formatMoney(amountMinor: number, currency = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100)
}

export function parseMoneyInput(value: string) {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.')
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.round(parsed * 100)
}

export function monthLabel(month: string) {
  const date = monthStart(month)
  const label = new Intl.DateTimeFormat('es-BO', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

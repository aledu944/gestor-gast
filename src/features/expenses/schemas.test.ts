import { describe, expect, it } from 'vitest'
import { expenseFiltersSchema, expenseInputSchema, settingsInputSchema } from './schemas'

describe('expense validation', () => {
  it('accepts a valid monthly expense', () => {
    const parsed = expenseInputSchema.parse({
      name: 'Internet',
      amountMinor: 24990,
      dueDate: '2026-08-31',
      recurring: true,
      endsOn: null,
    })
    expect(parsed.recurring).toBe(true)
  })

  it('rejects zero and negative amounts', () => {
    expect(() => expenseInputSchema.parse({ name: 'Luz', amountMinor: 0, dueDate: '2026-08-10' })).toThrow()
  })

  it('provides stable filter defaults', () => {
    expect(expenseFiltersSchema.parse({ month: '2026-08' })).toMatchObject({
      status: 'all',
      category: 'all',
      query: '',
      sort: 'due-asc',
    })
  })

  it('normalizes configured currencies', () => {
    const parsed = settingsInputSchema.parse({
      defaultCurrency: 'usd',
      timeZone: 'America/La_Paz',
      dueReminderDays: 3,
      monthlyDigestEnabled: true,
      reminderHour: 9,
    })
    expect(parsed.defaultCurrency).toBe('USD')
  })
})

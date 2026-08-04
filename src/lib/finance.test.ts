import { describe, expect, it } from 'vitest'
import {
  dateForDay,
  formatMoney,
  monthBounds,
  normalizeMonth,
  parseMoneyInput,
} from './finance'

describe('finance helpers', () => {
  it('normalizes valid and invalid month values', () => {
    expect(normalizeMonth('2026-08')).toBe('2026-08')
    expect(normalizeMonth('2026-13')).toMatch(/^\d{4}-\d{2}$/)
  })

  it('clamps monthly due days to the final valid day', () => {
    expect(dateForDay(new Date('2025-02-01T00:00:00Z'), 31).toISOString().slice(0, 10)).toBe('2025-02-28')
    expect(dateForDay(new Date('2024-02-01T00:00:00Z'), 31).toISOString().slice(0, 10)).toBe('2024-02-29')
  })

  it('returns exclusive month boundaries', () => {
    const { start, end } = monthBounds('2026-12')
    expect(start.toISOString().slice(0, 10)).toBe('2026-12-01')
    expect(end.toISOString().slice(0, 10)).toBe('2027-01-01')
  })

  it('parses decimal amounts into minor units without float storage', () => {
    expect(parseMoneyInput('123,45')).toBe(12345)
    expect(parseMoneyInput('0')).toBeNull()
    expect(parseMoneyInput('texto')).toBeNull()
  })

  it('formats BOB amounts for the Spanish Bolivia locale', () => {
    expect(formatMoney(125050, 'BOB')).toContain('1.250,50')
  })
})

import { formatMoney } from '#/lib/finance'

/** Amount with the cents set smaller, so the whole figure reads first. */
export function Money({ amountMinor, currency, className }: { amountMinor: number; currency?: string; className?: string }) {
  const text = formatMoney(amountMinor, currency)
  const match = text.match(/^(.*?)([.,]\d{2})$/)
  if (!match) return <span className={className}>{text}</span>
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{match[1]}<small>{match[2]}</small></span>
    </span>
  )
}

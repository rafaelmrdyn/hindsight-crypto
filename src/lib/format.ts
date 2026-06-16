export const usd = (n: number, opts: Intl.NumberFormatOptions = {}) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: n >= 1000 ? 0 : n >= 1 ? 2 : 6,
    ...opts,
  }).format(n)

export const compactUsd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n)

export const pct = (frac: number, digits = 1) => `${frac >= 0 ? '+' : ''}${(frac * 100).toFixed(digits)}%`

export const num = (n: number, digits = 2) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(n)

export const fmtDate = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

export const fmtMonthYear = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })

// Human-ish elapsed span, e.g. "4 yr 2 mo".
export function spanLabel(fromTs: number, toTs: number): string {
  const days = Math.max(0, Math.round((toTs - fromTs) / 86_400))
  const y = Math.floor(days / 365)
  const m = Math.floor((days % 365) / 30)
  if (y === 0 && m === 0) return `${days} day${days === 1 ? '' : 's'}`
  const parts = []
  if (y) parts.push(`${y} yr`)
  if (m) parts.push(`${m} mo`)
  return parts.join(' ')
}

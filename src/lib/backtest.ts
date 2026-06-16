// The engine. Given a coin's full price history and a strategy, it replays
// the past day-by-day and reports what would have happened — no live calls,
// no guessing, just arithmetic over real closes.

import type { ChartPoint } from '../api'

export type Mode = 'once' | 'recurring'
export type Frequency = 'daily' | 'weekly' | 'monthly'

export interface BacktestInput {
  history: ChartPoint[] // [unixSeconds, priceUsd, ...]
  startTs: number // unix seconds
  amount: number // USD per contribution (or the single lump)
  mode: Mode
  frequency: Frequency // ignored when mode === 'once'
}

export interface Buy {
  ts: number
  price: number
  amount: number
  units: number
}

export interface SeriesPoint {
  ts: number
  value: number // portfolio value in USD at this time
  invested: number // cumulative amount put in by this time
}

export interface BacktestResult {
  ok: boolean
  reason?: string
  startTs: number
  endTs: number
  invested: number
  units: number
  currentPrice: number
  currentValue: number
  roi: number // fraction, e.g. 0.42 = +42%
  avgCost: number // average price paid per unit
  multiple: number // currentValue / invested
  buys: Buy[]
  series: SeriesPoint[]
  // The "what if I'd just dumped it all in on day one" baseline.
  lumpSumValue: number
  lumpSumRoi: number
  // Flavor.
  bestDay: { ts: number; changePct: number } | null
  worstDay: { ts: number; changePct: number } | null
  peakValue: number
  maxDrawdown: number // fraction from peak, e.g. 0.6 = -60% at worst
}

const DAY = 86_400
const stepSeconds: Record<Frequency, number> = {
  daily: DAY,
  weekly: 7 * DAY,
  monthly: 30 * DAY,
}

// Most recent price at-or-before ts (binary search; history is ascending).
function priceAt(history: ChartPoint[], ts: number): number | null {
  if (!history.length || ts < history[0][0]) return null
  let lo = 0
  let hi = history.length - 1
  let ans = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (history[mid][0] <= ts) {
      ans = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return history[ans][1]
}

export function runBacktest(input: BacktestInput): BacktestResult {
  const { history, startTs, amount, mode, frequency } = input
  const endTs = history.length ? history[history.length - 1][0] : startTs
  const currentPrice = history.length ? history[history.length - 1][1] : 0

  const empty: BacktestResult = {
    ok: false,
    startTs,
    endTs,
    invested: 0,
    units: 0,
    currentPrice,
    currentValue: 0,
    roi: 0,
    avgCost: 0,
    multiple: 0,
    buys: [],
    series: [],
    lumpSumValue: 0,
    lumpSumRoi: 0,
    bestDay: null,
    worstDay: null,
    peakValue: 0,
    maxDrawdown: 0,
  }

  if (!history.length) return { ...empty, reason: 'No price history available.' }
  if (startTs < history[0][0]) {
    return { ...empty, reason: 'That date is before this coin existed. Pick a later start.' }
  }
  if (amount <= 0) return { ...empty, reason: 'Enter an amount greater than zero.' }

  // ── schedule the buys ──
  const buyDates: number[] =
    mode === 'once'
      ? [startTs]
      : (() => {
          const out: number[] = []
          const step = stepSeconds[frequency]
          for (let t = startTs; t <= endTs; t += step) out.push(t)
          return out
        })()

  const buys: Buy[] = []
  for (const ts of buyDates) {
    const p = priceAt(history, ts)
    if (!p || p <= 0) continue
    buys.push({ ts, price: p, amount, units: amount / p })
  }
  if (!buys.length) return { ...empty, reason: 'No valid buy points in that range.' }

  const invested = buys.reduce((s, b) => s + b.amount, 0)
  const units = buys.reduce((s, b) => s + b.units, 0)
  const currentValue = units * currentPrice
  const avgCost = invested / units
  const roi = invested ? currentValue / invested - 1 : 0

  // Lump-sum baseline: everything invested at the first buy's price.
  const lumpUnits = invested / buys[0].price
  const lumpSumValue = lumpUnits * currentPrice
  const lumpSumRoi = invested ? lumpSumValue / invested - 1 : 0

  // ── value series + drawdown, walking the history from the start ──
  const series: SeriesPoint[] = []
  let bi = 0
  let unitsSoFar = 0
  let investedSoFar = 0
  let peak = 0
  let maxDrawdown = 0
  for (const point of history) {
    const ts = point[0]
    if (ts < startTs) continue
    while (bi < buys.length && buys[bi].ts <= ts) {
      unitsSoFar += buys[bi].units
      investedSoFar += buys[bi].amount
      bi++
    }
    const value = unitsSoFar * point[1]
    series.push({ ts, value, invested: investedSoFar })
    if (value > peak) peak = value
    if (peak > 0) maxDrawdown = Math.max(maxDrawdown, 1 - value / peak)
  }

  // ── best / worst single day within the window (by daily % change) ──
  let bestDay: BacktestResult['bestDay'] = null
  let worstDay: BacktestResult['worstDay'] = null
  let startIdx = history.findIndex((p) => p[0] >= startTs)
  if (startIdx < 1) startIdx = 1
  for (let i = startIdx; i < history.length; i++) {
    const prev = history[i - 1][1]
    if (!prev) continue
    const change = history[i][1] / prev - 1
    if (!bestDay || change > bestDay.changePct) bestDay = { ts: history[i][0], changePct: change }
    if (!worstDay || change < worstDay.changePct) worstDay = { ts: history[i][0], changePct: change }
  }

  return {
    ok: true,
    startTs,
    endTs,
    invested,
    units,
    currentPrice,
    currentValue,
    roi,
    avgCost,
    multiple: invested ? currentValue / invested : 0,
    buys,
    series,
    lumpSumValue,
    lumpSumRoi,
    bestDay,
    worstDay,
    peakValue: peak,
    maxDrawdown,
  }
}

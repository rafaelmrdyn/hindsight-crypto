import { useEffect, useMemo, useRef, useState } from 'react'
import { fullHistory, type ChartPoint, type Coin } from './api'
import { runBacktest, type BacktestResult, type Frequency, type Mode } from './lib/backtest'
import { compactUsd, fmtDate, num, pct, spanLabel, usd } from './lib/format'
import { useCountUp } from './hooks/useCountUp'
import { CoinSearch } from './components/CoinSearch'
import { ValueChart } from './components/ValueChart'
import { TickerStrip } from './components/TickerStrip'

const BITCOIN: Coin = { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', icon: 'https://static.coinstats.app/coins/1650455588819.png' }
const FREQ_WORD: Record<Frequency, string> = { daily: 'day', weekly: 'week', monthly: 'month' }

function isoDaysAgo(days: number) {
  const d = new Date(Date.now() - days * 86_400_000)
  return d.toISOString().slice(0, 10)
}
const toTs = (iso: string) => Math.floor(new Date(`${iso}T00:00:00Z`).getTime() / 1000)

// memorable historical moments people actually want to test against
const DATE_PRESETS: { label: string; iso: string }[] = [
  { label: 'COVID low · Mar 2020', iso: '2020-03-13' },
  { label: '2021 top · Nov 2021', iso: '2021-11-08' },
  { label: 'Bear bottom · Nov 2022', iso: '2022-11-21' },
  { label: '1 year ago', iso: isoDaysAgo(365) },
]

export default function App() {
  const [selected, setSelected] = useState<Coin>(BITCOIN)
  const [mode, setMode] = useState<Mode>('once')
  const [amount, setAmount] = useState(1000)
  const [frequency, setFrequency] = useState<Frequency>('weekly')
  const [startIso, setStartIso] = useState('2020-03-13')

  const [history, setHistory] = useState<ChartPoint[]>([])
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const historyCache = useRef<Map<string, ChartPoint[]>>(new Map())

  async function run() {
    setLoading(true)
    setError(null)
    try {
      let hist = historyCache.current.get(selected.id)
      if (!hist) {
        hist = await fullHistory(selected.id)
        historyCache.current.set(selected.id, hist)
      }
      setHistory(hist)
      const res = runBacktest({ history: hist, startTs: toTs(startIso), amount, mode, frequency })
      if (!res.ok) {
        setError(res.reason ?? 'Could not run that scenario.')
        setResult(null)
      } else {
        setResult(res)
      }
    } catch (e) {
      setError('Could not reach the market archive. Check the API key and try again.')
    } finally {
      setLoading(false)
    }
  }

  // Run a default scenario on first load so the page opens with a story.
  useEffect(() => {
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const minDate = useMemo(() => (history.length ? new Date(history[0][0] * 1000).toISOString().slice(0, 10) : '2010-01-01'), [history])
  const canRun = selected && amount > 0

  return (
    <div className="shell">
      <header className="masthead">
        <div className="wordmark">
          <span className="glyph">⏳</span>
          <h1>HINDSIGHT</h1>
        </div>
        <TickerStrip />
      </header>

      <section className="hero">
        <div className="eyebrow">The clarity of looking back</div>
        <h2>
          What if you'd <em>actually bought it</em>?
        </h2>
        <p>
          Pick a coin, a date, and an amount. Hindsight replays the real market — every daily close since the coin
          existed — and tells you, to the dollar, what that bet would be worth today.
        </p>
      </section>

      <section className="console">
        <div className="console-bar">
          <span>Set the dials</span>
          <span className="dots">
            <i />
            <i />
            <i className="live" />
          </span>
        </div>
        <div className="console-body">
          <div className="console-left">
            <div className="field">
              <label>Asset</label>
              <CoinSearch selected={selected} onSelect={(c) => setSelected(c)} />
            </div>

            <div className="field">
              <label>Strategy</label>
              <div className="switch">
                <button className={mode === 'once' ? 'on' : ''} onClick={() => setMode('once')}>
                  One-time buy
                </button>
                <button className={mode === 'recurring' ? 'on' : ''} onClick={() => setMode('recurring')}>
                  Recurring (DCA)
                </button>
              </div>
            </div>

            <div className="field">
              <label>{mode === 'once' ? 'Amount' : `Amount per ${FREQ_WORD[frequency]}`}</label>
              <div className="amount-row">
                <span className="dollar">$</span>
                <input
                  className="inp"
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                />
              </div>
              <div className="chips">
                {[100, 500, 1000, 5000].map((a) => (
                  <button key={a} className="chip" onClick={() => setAmount(a)}>
                    ${a.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'recurring' && (
              <div className="field">
                <label>Frequency</label>
                <div className="switch">
                  {(['daily', 'weekly', 'monthly'] as Frequency[]).map((f) => (
                    <button key={f} className={frequency === f ? 'on' : ''} onClick={() => setFrequency(f)}>
                      {f[0].toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="field">
              <label>{mode === 'once' ? 'Buy date' : 'Start date'}</label>
              <input className="inp" type="date" min={minDate} max={isoDaysAgo(1)} value={startIso} onChange={(e) => setStartIso(e.target.value)} />
              <div className="chips">
                {DATE_PRESETS.map((p) => (
                  <button key={p.label} className="chip" onClick={() => setStartIso(p.iso)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="console-right">
            <div className="console-note">
              Hindsight pulls the <b>full daily price history</b> for {selected.name} straight from the CoinStats
              market archive, then simulates your{' '}
              {mode === 'once' ? (
                <>
                  single <b>{usd(amount)}</b> purchase
                </>
              ) : (
                <>
                  <b>{usd(amount)}</b> bought every <b>{FREQ_WORD[frequency]}</b>
                </>
              )}{' '}
              starting <b>{fmtDate(toTs(startIso))}</b>. No live trading, no fees modeled — just the honest math of
              the closes.
            </div>
            <button className="run" onClick={run} disabled={!canRun || loading}>
              {loading ? (
                <>
                  <span className="spinner" />
                  Replaying…
                </>
              ) : (
                'Run the time machine'
              )}
            </button>
          </div>
        </div>
      </section>

      {error && <div className="banner err">⚠ {error}</div>}

      {result && !error && <Result result={result} coin={selected} mode={mode} amount={amount} frequency={frequency} startIso={startIso} />}

      <footer className="colophon">
        <span>HINDSIGHT · a what-if time machine</span>
        <span>
          market data ·{' '}
          <a href="https://coinstats.app/api-docs/" target="_blank" rel="noreferrer">
            CoinStats Open API
          </a>
        </span>
        <span>past performance is not a promise — it's a lesson.</span>
      </footer>
    </div>
  )
}

function Result({
  result,
  coin,
  mode,
  amount,
  frequency,
  startIso,
}: {
  result: BacktestResult
  coin: Coin
  mode: Mode
  amount: number
  frequency: Frequency
  startIso: string
}) {
  const animatedValue = useCountUp(result.currentValue)
  const positive = result.roi >= 0
  const startTs = toTs(startIso)

  const lead =
    mode === 'once'
      ? `A single ${usd(amount)} buy of ${coin.symbol} on ${fmtDate(startTs)} would be worth`
      : `${usd(amount)} into ${coin.symbol} every ${FREQ_WORD[frequency]} since ${fmtDate(startTs)} — ${usd(result.invested)} invested — would be worth`

  const dcaBeatLump = result.roi - result.lumpSumRoi

  return (
    <section className="result">
      <div className="verdict">
        <div className="lead">{lead}</div>
        <div className="big mono">{usd(animatedValue, { maximumFractionDigits: 0 })}</div>
        <div className="roi">
          <span className={positive ? 'gain' : 'loss'}>{pct(result.roi)}</span>
          <span className="multiple">{result.multiple.toFixed(2)}× your money</span>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="k">Invested</div>
          <div className="v">{usd(result.invested, { maximumFractionDigits: 0 })}</div>
          <div className="sub">
            {mode === 'once' ? 'one purchase' : `${result.buys.length} buys`} over {spanLabel(startTs, result.endTs)}
          </div>
        </div>
        <div className="stat">
          <div className="k">{coin.symbol} held</div>
          <div className="v">{num(result.units, result.units < 1 ? 6 : 4)}</div>
          <div className="sub">at {usd(result.currentPrice)} today</div>
        </div>
        <div className="stat">
          <div className="k">Avg cost</div>
          <div className="v">{usd(result.avgCost)}</div>
          <div className="sub">per {coin.symbol}</div>
        </div>
        {mode === 'recurring' ? (
          <div className="stat">
            <div className="k">vs. lump sum</div>
            <div className={`v ${dcaBeatLump >= 0 ? 'gain' : 'loss'}`}>{pct(dcaBeatLump)}</div>
            <div className="sub">{dcaBeatLump >= 0 ? 'DCA beat' : 'DCA trailed'} buying all at once</div>
          </div>
        ) : (
          <div className="stat">
            <div className="k">Max drawdown</div>
            <div className="v loss">{pct(-result.maxDrawdown)}</div>
            <div className="sub">worst dip from peak</div>
          </div>
        )}
      </div>

      <ValueChart result={result} />

      <div className="flavor">
        <div className="card">
          <div className="k">Along the way</div>
          <div className="line">
            <span className="dt">Peak value</span>
            <span className="brass">{usd(result.peakValue, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="line">
            <span className="dt">Deepest drawdown</span>
            <span className="loss">{pct(-result.maxDrawdown)}</span>
          </div>
          <div className="line">
            <span className="dt">Lump-sum alternative</span>
            <span className={result.lumpSumRoi >= 0 ? 'gain' : 'loss'}>{usd(result.lumpSumValue, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
        <div className="card">
          <div className="k">Wildest single days</div>
          {result.bestDay && (
            <div className="line">
              <span className="dt">Best · {fmtDate(result.bestDay.ts)}</span>
              <span className="gain">{pct(result.bestDay.changePct)}</span>
            </div>
          )}
          {result.worstDay && (
            <div className="line">
              <span className="dt">Worst · {fmtDate(result.worstDay.ts)}</span>
              <span className="loss">{pct(result.worstDay.changePct)}</span>
            </div>
          )}
          <div className="line">
            <span className="dt">Held for</span>
            <span style={{ color: 'var(--paper-dim)' }}>{spanLabel(startTs, result.endTs)}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

import { useMemo, useRef, useState } from 'react'
import type { BacktestResult } from '../lib/backtest'
import { compactUsd, fmtDate, usd } from '../lib/format'

const W = 1000
const H = 320
const PAD = { top: 18, right: 8, bottom: 26, left: 8 }

export function ValueChart({ result }: { result: BacktestResult }) {
  const [hover, setHover] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const positive = result.currentValue >= result.invested
  const accent = positive ? 'var(--gain)' : 'var(--loss)'

  const geom = useMemo(() => {
    const s = result.series
    if (s.length < 2) return null
    const t0 = s[0].ts
    const t1 = s[s.length - 1].ts
    const maxV = Math.max(...s.map((p) => Math.max(p.value, p.invested)), 1)

    const x = (ts: number) => PAD.left + ((ts - t0) / (t1 - t0)) * (W - PAD.left - PAD.right)
    const y = (v: number) => PAD.top + (1 - v / maxV) * (H - PAD.top - PAD.bottom)

    const valueLine = s.map((p, i) => `${i ? 'L' : 'M'}${x(p.ts).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
    const valueArea = `${valueLine} L${x(t1).toFixed(1)},${y(0).toFixed(1)} L${x(t0).toFixed(1)},${y(0).toFixed(1)} Z`
    const investedLine = s.map((p, i) => `${i ? 'L' : 'M'}${x(p.ts).toFixed(1)},${y(p.invested).toFixed(1)}`).join(' ')

    // buy markers sit on the value line at the moment of purchase
    const markers = result.buys.map((b) => {
      // find nearest series point
      const sp = s.reduce((best, p) => (Math.abs(p.ts - b.ts) < Math.abs(best.ts - b.ts) ? p : best), s[0])
      return { cx: x(b.ts), cy: y(sp.value) }
    })

    // year gridlines
    const years: { x: number; label: string }[] = []
    const startYear = new Date(t0 * 1000).getFullYear()
    const endYear = new Date(t1 * 1000).getFullYear()
    for (let yr = startYear + 1; yr <= endYear; yr++) {
      const ts = new Date(`${yr}-01-01T00:00:00Z`).getTime() / 1000
      if (ts >= t0 && ts <= t1) years.push({ x: x(ts), label: String(yr) })
    }

    return { s, t0, t1, x, y, valueLine, valueArea, investedLine, markers, maxV, years }
  }, [result])

  if (!geom) return null

  const hoverPoint = hover != null ? geom.s[hover] : null

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    // map x back to nearest index
    const { t0, t1, s } = geom
    const frac = Math.min(1, Math.max(0, (px - PAD.left) / (W - PAD.left - PAD.right)))
    const ts = t0 + frac * (t1 - t0)
    let lo = 0
    let hi = s.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (s[mid].ts < ts) lo = mid + 1
      else hi = mid
    }
    setHover(lo)
  }

  const tipLeft = hoverPoint ? `${(geom.x(hoverPoint.ts) / W) * 100}%` : '0'
  const tipTop = hoverPoint ? `${(geom.y(hoverPoint.value) / H) * 100}%` : '0'

  return (
    <div className="chart-wrap">
      <div className="chart-head">
        <span>Portfolio value · {result.series.length} days replayed</span>
        <span className="chart-legend">
          <span>
            <i style={{ background: accent }} /> value
          </span>
          <span>
            <i style={{ background: 'var(--muted)', borderTop: '2px dashed var(--muted)', height: 0 }} /> invested
          </span>
        </span>
      </div>

      <div ref={wrapRef} style={{ position: 'relative' }}>
        <svg
          className="value-chart"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* year guides */}
          {geom.years.map((g) => (
            <g key={g.label}>
              <line x1={g.x} y1={PAD.top} x2={g.x} y2={H - PAD.bottom} stroke="rgba(236,230,218,0.08)" />
              <text x={g.x + 4} y={H - 10} fill="var(--faint)" fontSize="11" fontFamily="var(--mono)">
                {g.label}
              </text>
            </g>
          ))}

          {/* invested (cost basis) */}
          <path d={geom.investedLine} fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.7" />

          {/* value */}
          <path d={geom.valueArea} fill="url(#fill)" />
          <path d={geom.valueLine} fill="none" stroke={accent} strokeWidth="2.25" />

          {/* buy markers */}
          {geom.markers.map((m, i) => (
            <circle key={i} cx={m.cx} cy={m.cy} r="2.4" fill="var(--brass)" stroke="var(--ink)" strokeWidth="1" />
          ))}

          {/* scrubber */}
          {hoverPoint && (
            <g>
              <line x1={geom.x(hoverPoint.ts)} y1={PAD.top} x2={geom.x(hoverPoint.ts)} y2={H - PAD.bottom} stroke="var(--brass-dim)" strokeWidth="1" />
              <circle cx={geom.x(hoverPoint.ts)} cy={geom.y(hoverPoint.value)} r="4" fill="var(--brass)" stroke="var(--ink)" strokeWidth="1.5" />
            </g>
          )}
        </svg>

        {hoverPoint && (
          <div className="scrub-tip" style={{ left: tipLeft, top: tipTop }}>
            <div className="d">{fmtDate(hoverPoint.ts)}</div>
            <div>
              value <b style={{ color: 'var(--paper)' }}>{usd(hoverPoint.value)}</b>
            </div>
            <div style={{ color: 'var(--muted)' }}>in {compactUsd(hoverPoint.invested)}</div>
          </div>
        )}
      </div>
    </div>
  )
}

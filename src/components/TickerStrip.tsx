import { useEffect, useState } from 'react'
import { topCoins, type Coin } from '../api'
import { pct, usd } from '../lib/format'

export function TickerStrip() {
  const [coins, setCoins] = useState<Coin[]>([])
  useEffect(() => {
    let alive = true
    topCoins(10).then((c) => alive && setCoins(c)).catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  if (!coins.length) return <div className="ticker" />
  return (
    <div className="ticker">
      {coins.map((c) => (
        <span className="tk" key={c.id}>
          <span className="sym">{c.symbol}</span>
          <span>{usd(c.price ?? 0)}</span>
          <span className={(c.priceChange1d ?? 0) >= 0 ? 'gain' : 'loss'}>{pct((c.priceChange1d ?? 0) / 100)}</span>
        </span>
      ))}
    </div>
  )
}

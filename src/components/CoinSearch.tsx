import { useEffect, useRef, useState } from 'react'
import { searchCoins, topCoins, type Coin } from '../api'

const FALLBACK_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='11' fill='%231b160e' stroke='%238a8073'/%3E%3C/svg%3E"

export function CoinSearch({ selected, onSelect }: { selected: Coin | null; onSelect: (c: Coin) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Coin[]>([])
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // When opened with no query, show the popular coins as a starting menu.
  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    if (!query.trim()) {
      let alive = true
      topCoins(30).then((c) => alive && setResults(c)).catch(() => {})
      return () => {
        alive = false
      }
    }
  }, [open])

  // Debounced search.
  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (!q) {
      topCoins(30).then(setResults).catch(() => {})
      return
    }
    setLoading(true)
    const t = setTimeout(() => {
      searchCoins(q)
        .then((c) => {
          setResults(c)
          setActive(0)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 220)
    return () => clearTimeout(t)
  }, [query, open])

  const pick = (c: Coin) => {
    onSelect(c)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="search" ref={boxRef}>
      {!open && selected ? (
        <div className="search-selected" onClick={() => setOpen(true)}>
          <img src={selected.icon || FALLBACK_ICON} alt="" onError={(e) => (e.currentTarget.src = FALLBACK_ICON)} />
          <span className="nm">{selected.name}</span>
          <span className="sy">{selected.symbol}</span>
          <span className="swap">CHANGE ▾</span>
        </div>
      ) : (
        <input
          ref={inputRef}
          className="inp"
          placeholder="Search any coin — Bitcoin, SOL, PEPE…"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, results.length - 1))
            else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0))
            else if (e.key === 'Enter' && results[active]) pick(results[active])
            else if (e.key === 'Escape') setOpen(false)
          }}
        />
      )}

      {open && (
        <div className="dropdown">
          {loading && results.length === 0 ? (
            <div className="dd-item" style={{ color: 'var(--muted)' }}>
              <span className="spinner" />
              searching…
            </div>
          ) : results.length === 0 ? (
            <div className="dd-item" style={{ color: 'var(--muted)' }}>
              no matches
            </div>
          ) : (
            results.map((c, i) => (
              <div key={c.id} className={`dd-item ${i === active ? 'active' : ''}`} onClick={() => pick(c)} onMouseEnter={() => setActive(i)}>
                <img src={c.icon || FALLBACK_ICON} alt="" onError={(e) => (e.currentTarget.src = FALLBACK_ICON)} />
                <span className="nm">{c.name}</span>
                <span className="sy">{c.symbol}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

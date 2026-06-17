// Pure-frontend client: the browser calls the CoinStats Open API directly.
// CORS is open (access-control-allow-origin: *), so no backend is needed.
// NOTE: the key ships in the bundle — that's inherent to having no server.

export interface Coin {
  id: string
  name: string
  symbol: string
  icon?: string
  rank?: number
  price?: number
  priceChange1d?: number
  marketCap?: number
  color?: string
}

// CoinStats chart points are [unixSeconds, priceUsd, priceBtc, ...].
export type ChartPoint = [number, number, ...number[]]

const BASE = 'https://api.coinstats.app'
const KEY = import.meta.env.VITE_COINSTATS_API_KEY as string

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'X-API-KEY': KEY, accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`API ${res.status} on ${path}`)
  return res.json() as Promise<T>
}

export async function topCoins(limit = 60): Promise<Coin[]> {
  const data = await get<{ result: Coin[] }>(`/coins?limit=${limit}`)
  return data.result ?? []
}

export async function searchCoins(query: string, limit = 12): Promise<Coin[]> {
  const q = query.trim()
  if (!q) return []
  const data = await get<{ result: Coin[] }>(`/coins?limit=${limit}&name=${encodeURIComponent(q)}`)
  return data.result ?? []
}

export async function coin(id: string): Promise<Coin> {
  return get<Coin>(`/coins/${encodeURIComponent(id)}`)
}

// Full daily history back to listing — the raw material for every backtest.
export async function fullHistory(id: string): Promise<ChartPoint[]> {
  return get<ChartPoint[]>(`/coins/${encodeURIComponent(id)}/charts?period=all`)
}

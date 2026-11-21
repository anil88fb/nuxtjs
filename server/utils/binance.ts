// Binance public market data client (no API key needed).
// Docs: https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints

export const INTERVALS = [
  '1s', '1m', '3m', '5m', '15m', '30m',
  '1h', '2h', '4h', '6h', '8h', '12h',
  '1d', '3d', '1w', '1M',
] as const
export type Interval = (typeof INTERVALS)[number]

export interface Candle {
  openTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  closeTime: number
  quoteVolume: number
  trades: number
  takerBuyBaseVolume: number
  takerBuyQuoteVolume: number
}

export interface Ticker24h {
  symbol: string
  lastPrice: number
  priceChange: number
  priceChangePercent: number
  highPrice: number
  lowPrice: number
  volume: number
  quoteVolume: number
  openTime: number
  closeTime: number
}

export interface OrderBook {
  lastUpdateId: number
  bids: [price: number, qty: number][]
  asks: [price: number, qty: number][]
}

const SYMBOL_RE = /^[A-Z0-9]{2,20}$/

export function parseSymbol(raw: unknown): string {
  const symbol = String(raw ?? '').toUpperCase().trim()
  if (!SYMBOL_RE.test(symbol)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid symbol: "${raw}" (e.g. BTCUSDT)` })
  }
  return symbol
}

export function parseSymbols(raw: unknown, fallback: string[]): string[] {
  const list = raw == null || raw === ''
    ? fallback
    : String(raw).split(',').map(s => s.trim()).filter(Boolean)
  if (list.length > 100) {
    throw createError({ statusCode: 400, statusMessage: 'At most 100 symbols per request' })
  }
  return [...new Set(list.map(parseSymbol))]
}

export function parseInterval(raw: unknown, fallback: Interval = '1h'): Interval {
  const interval = raw == null || raw === '' ? fallback : String(raw)
  if (!(INTERVALS as readonly string[]).includes(interval)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid interval. Use one of: ${INTERVALS.join(', ')}` })
  }
  return interval as Interval
}

export function parseIntParam(raw: unknown, name: string, fallback: number, min: number, max: number): number {
  if (raw == null || raw === '') return fallback
  const n = Number(raw)
  if (!Number.isInteger(n) || n < min || n > max) {
    throw createError({ statusCode: 400, statusMessage: `${name} must be an integer between ${min} and ${max}` })
  }
  return n
}

async function binanceGet<T>(path: string, query: Record<string, string | number | undefined>): Promise<T> {
  const { binance } = useRuntimeConfig()
  const bases = String(binance.baseUrls).split(',').map(s => s.trim()).filter(Boolean)
  let lastError: any

  // Try each base URL in order (e.g. data-api.binance.vision, then api.binance.com).
  for (const baseURL of bases) {
    try {
      return await $fetch<T>(path, { baseURL, query, timeout: 10_000, retry: 1 })
    } catch (err: any) {
      lastError = err
      const status = err?.response?.status
      // 4xx from Binance (bad symbol etc.) won't be fixed by another host — except 451/403 geo-blocks.
      if (status && status >= 400 && status < 500 && status !== 403 && status !== 451 && status !== 429) break
    }
  }

  const status = lastError?.response?.status ?? 502
  const msg = lastError?.data?.msg ?? lastError?.message ?? 'Binance request failed'
  throw createError({ statusCode: status >= 500 || status === 451 || status === 403 ? 502 : status, statusMessage: `Binance: ${msg}` })
}

export async function getKlines(symbol: string, interval: Interval, opts: { limit?: number, startTime?: number, endTime?: number } = {}): Promise<Candle[]> {
  const rows = await binanceGet<any[][]>('/api/v3/klines', {
    symbol, interval, limit: opts.limit ?? 500, startTime: opts.startTime, endTime: opts.endTime,
  })
  return rows.map(r => ({
    openTime: r[0],
    open: +r[1],
    high: +r[2],
    low: +r[3],
    close: +r[4],
    volume: +r[5],
    closeTime: r[6],
    quoteVolume: +r[7],
    trades: r[8],
    takerBuyBaseVolume: +r[9],
    takerBuyQuoteVolume: +r[10],
  }))
}

export async function getTickers24h(symbols: string[]): Promise<Ticker24h[]> {
  const rows = await binanceGet<any[]>('/api/v3/ticker/24hr', { symbols: JSON.stringify(symbols) })
  return rows.map(t => ({
    symbol: t.symbol,
    lastPrice: +t.lastPrice,
    priceChange: +t.priceChange,
    priceChangePercent: +t.priceChangePercent,
    highPrice: +t.highPrice,
    lowPrice: +t.lowPrice,
    volume: +t.volume,
    quoteVolume: +t.quoteVolume,
    openTime: t.openTime,
    closeTime: t.closeTime,
  }))
}

export async function getOrderBook(symbol: string, limit = 100): Promise<OrderBook> {
  const book = await binanceGet<any>('/api/v3/depth', { symbol, limit })
  const conv = (side: string[][]) => side.map(([p, q]) => [+p, +q] as [number, number])
  return { lastUpdateId: book.lastUpdateId, bids: conv(book.bids), asks: conv(book.asks) }
}

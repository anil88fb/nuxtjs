// GET /api/market/snapshot?symbols=BTCUSDT,ETHUSDT&interval=1h&limit=200
// One call for the bot: 24h ticker + recent candles for every symbol.
export default defineEventHandler(async (event) => {
  const { binance } = useRuntimeConfig()
  const q = getQuery(event)
  const symbols = parseSymbols(q.symbols, String(binance.defaultSymbols).split(','))
  if (symbols.length > 20) {
    throw createError({ statusCode: 400, statusMessage: 'snapshot supports at most 20 symbols' })
  }
  const interval = parseInterval(q.interval)
  const limit = parseIntParam(q.limit, 'limit', 200, 1, 1000)

  const [tickers, candleSets] = await Promise.all([
    getTickers24h(symbols),
    Promise.all(symbols.map(s => getKlines(s, interval, { limit }))),
  ])
  const tickerBySymbol = Object.fromEntries(tickers.map(t => [t.symbol, t]))

  return {
    fetchedAt: Date.now(),
    interval,
    markets: symbols.map((symbol, i) => ({
      symbol,
      ticker: tickerBySymbol[symbol] ?? null,
      candles: candleSets[i],
    })),
  }
})

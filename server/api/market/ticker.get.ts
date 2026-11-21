// GET /api/market/ticker?symbols=BTCUSDT,ETHUSDT
export default defineEventHandler(async (event) => {
  const { binance } = useRuntimeConfig()
  const symbols = parseSymbols(getQuery(event).symbols, String(binance.defaultSymbols).split(','))
  const tickers = await getTickers24h(symbols)
  return { count: tickers.length, tickers }
})

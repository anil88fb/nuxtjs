// GET /api/market/klines?symbol=BTCUSDT&interval=1h&limit=500[&startTime=ms&endTime=ms]
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const symbol = parseSymbol(q.symbol ?? 'BTCUSDT')
  const interval = parseInterval(q.interval)
  const limit = parseIntParam(q.limit, 'limit', 500, 1, 1000)
  const startTime = q.startTime ? parseIntParam(q.startTime, 'startTime', 0, 0, Number.MAX_SAFE_INTEGER) : undefined
  const endTime = q.endTime ? parseIntParam(q.endTime, 'endTime', 0, 0, Number.MAX_SAFE_INTEGER) : undefined

  const candles = await getKlines(symbol, interval, { limit, startTime, endTime })
  return { symbol, interval, count: candles.length, candles }
})

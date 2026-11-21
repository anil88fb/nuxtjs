// GET /api/market/depth?symbol=BTCUSDT&limit=100
const DEPTH_LIMITS = [5, 10, 20, 50, 100, 500, 1000, 5000]

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const symbol = parseSymbol(q.symbol ?? 'BTCUSDT')
  const limit = parseIntParam(q.limit, 'limit', 100, 1, 5000)
  if (!DEPTH_LIMITS.includes(limit)) {
    throw createError({ statusCode: 400, statusMessage: `limit must be one of ${DEPTH_LIMITS.join(', ')}` })
  }
  const book = await getOrderBook(symbol, limit)
  const bestBid = book.bids[0]?.[0] ?? null
  const bestAsk = book.asks[0]?.[0] ?? null
  return {
    symbol,
    bestBid,
    bestAsk,
    spread: bestBid != null && bestAsk != null ? bestAsk - bestBid : null,
    ...book,
  }
})

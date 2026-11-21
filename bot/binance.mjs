// Public Binance market data, no API key needed.
export async function fetchClosedCandles(symbol, interval, limit, baseUrls) {
  let lastErr
  for (const base of baseUrls) {
    const url = `${base}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit + 1}`
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
      if (!res.ok) {
        const body = await res.text()
        lastErr = new Error(`${res.status} ${body.slice(0, 200)}`)
        if (res.status === 400) break // bad symbol/interval: another host won't help
        continue
      }
      const rows = await res.json()
      const now = Date.now()
      // Drop the still-open candle so signals don't repaint.
      return rows
        .filter(r => r[6] < now)
        .slice(-limit)
        .map(r => ({ openTime: r[0], close: +r[4], closeTime: r[6] }))
    } catch (err) {
      lastErr = err
    }
  }
  throw new Error(`Binance ${symbol}: ${lastErr?.message ?? 'request failed'}`)
}

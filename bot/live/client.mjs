import { createHmac } from 'node:crypto'

// Binance Spot REST client. Signed endpoints use HMAC-SHA256 keys.
export function createClient({ apiKey, apiSecret, baseUrl, fetchImpl = globalThis.fetch }) {
  let timeOffset = 0

  async function request(method, path, params = {}, signed = false) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) qs.append(k, String(v))
    const headers = {}
    if (signed) {
      if (!apiKey || !apiSecret) throw new Error('BINANCE_API_KEY / BINANCE_API_SECRET missing')
      qs.append('recvWindow', '5000')
      qs.append('timestamp', String(Date.now() + timeOffset))
      qs.append('signature', createHmac('sha256', apiSecret).update(qs.toString()).digest('hex'))
      headers['X-MBX-APIKEY'] = apiKey
    }
    const res = await fetchImpl(`${baseUrl}${path}${qs.size ? `?${qs}` : ''}`, { method, headers, signal: AbortSignal.timeout(15_000) })
    const text = await res.text()
    let body
    try { body = JSON.parse(text) } catch { body = text }
    if (!res.ok) {
      const err = new Error(`Binance ${method} ${path} → ${res.status}: ${body?.msg ?? String(text).slice(0, 200)}`)
      err.status = res.status
      err.code = body?.code
      throw err
    }
    return body
  }

  return {
    hasKeys: Boolean(apiKey && apiSecret),
    async syncTime() {
      const { serverTime } = await request('GET', '/api/v3/time')
      timeOffset = serverTime - Date.now()
    },
    exchangeInfo: () => request('GET', '/api/v3/exchangeInfo'),
    tickers24h: () => request('GET', '/api/v3/ticker/24hr'),
    price: symbol => request('GET', '/api/v3/ticker/price', { symbol }),
    klines: (symbol, interval, limit) => request('GET', '/api/v3/klines', { symbol, interval, limit }),
    account: () => request('GET', '/api/v3/account', { omitZeroBalances: true }, true),
    myTrades: symbol => request('GET', '/api/v3/myTrades', { symbol, limit: 1000 }, true),
    order: params => request('POST', '/api/v3/order', { newOrderRespType: 'FULL', ...params }, true),
    testOrder: params => request('POST', '/api/v3/order/test', params, true),
    apiRestrictions: () => request('GET', '/sapi/v1/account/apiRestrictions', {}, true),
  }
}

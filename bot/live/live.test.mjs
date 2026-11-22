import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { createHmac } from 'node:crypto'
import { floorToStep, sellableQty, averageCost, parseRules } from './rules.mjs'
import { netPnlPct, sellSignal, buySignal, analyze } from './decide.mjs'
import { createClient } from './client.mjs'
import { createBot } from './engine.mjs'

const baseCfg = {
  live: true, quote: 'USDT', interval: '15m', candleLimit: 60, scanTop: 30, minQuoteVolume: 0, whitelist: [], ignoreAssets: ['BNB'],
  manageExisting: true, emaFast: 3, emaSlow: 5, emaTrend: 0, rsiPeriod: 3, rsiBuyMax: 101, takeProfitPct: 3, minProfitPct: 0.5,
  stopLossPct: 5, feePct: 0.1, tradeSizeQuote: 20, maxOpenPositions: 3, maxTotalQuote: 60, reserveQuote: 0, maxDailyLossQuote: 20,
}

test('floorToStep rounds down to the lot step', () => {
  assert.equal(floorToStep(1.23456, '0.00100000'), '1.234')
  assert.equal(floorToStep(0.3, '0.1'), '0.3')
  assert.equal(floorToStep(15.9, '1.00000000'), '15')
})

test('sellableQty rejects dust', () => {
  const rule = { stepSize: '0.001', minQty: 0.001, maxQty: Infinity, minNotional: 5 }
  assert.equal(sellableQty(0.01, 100, rule), null) // 1 USDT < 5
  assert.equal(sellableQty(0.1234, 100, rule), '0.123')
})

test('averageCost follows buys and sells', () => {
  const trades = [
    { time: 1, isBuyer: true, qty: '1', quoteQty: '100', commission: '0', commissionAsset: 'BNB' },
    { time: 2, isBuyer: true, qty: '1', quoteQty: '200', commission: '0', commissionAsset: 'BNB' },
    { time: 3, isBuyer: false, qty: '1', quoteQty: '300', commission: '0', commissionAsset: 'USDT' },
  ]
  assert.equal(averageCost(trades, 'X'), 150)
  assert.equal(averageCost([], 'X'), null)
})

test('sell rules: take profit, stop loss, profit-only cross exit', () => {
  assert.ok(netPnlPct(100, 100, 0.1) < 0)
  assert.equal(sellSignal({ entryPrice: 100 }, 104, null, baseCfg).sell, true)
  assert.equal(sellSignal({ entryPrice: 100 }, 94, null, baseCfg).sell, true)
  assert.equal(sellSignal({ entryPrice: 100 }, 94, null, { ...baseCfg, stopLossPct: 0 }).sell, false)
  assert.equal(sellSignal({ entryPrice: 100 }, 99, { crossDown: true }, baseCfg).sell, false) // never sells at a loss on cross
  assert.equal(sellSignal({ entryPrice: 100 }, 101, { crossDown: true }, baseCfg).sell, true)
})

test('buy signal needs cross up', () => {
  assert.equal(buySignal(analyze([10, 9, 8, 7, 6, 5, 5, 5, 9], baseCfg), baseCfg).buy, true)
  assert.equal(buySignal(analyze([5, 6, 7, 8, 9, 10, 11, 12, 13], baseCfg), baseCfg).buy, false)
})

test('client signs requests with HMAC-SHA256', async () => {
  let seen
  const srv = http.createServer((req, res) => { seen = req; res.end('{"balances":[]}') }).listen(0)
  const port = srv.address().port
  const c = createClient({ apiKey: 'k', apiSecret: 's', baseUrl: `http://127.0.0.1:${port}` })
  await c.account()
  srv.close()
  const url = new URL(seen.url, 'http://x')
  const sig = url.searchParams.get('signature')
  url.searchParams.delete('signature')
  assert.equal(seen.headers['x-mbx-apikey'], 'k')
  assert.equal(sig, createHmac('sha256', 's').update(url.searchParams.toString()).digest('hex'))
})

// ---- engine with an in-memory exchange ----
function fakeExchange({ balances, prices, history = {}, series = {} }) {
  const orders = []
  const now = Date.now()
  const lot = { filterType: 'LOT_SIZE', stepSize: '0.00100000', minQty: '0.001', maxQty: '9000' }
  const symbols = Object.keys(prices).map(s => ({ symbol: s, status: 'TRADING', baseAsset: s.replace('USDT', ''), quoteAsset: 'USDT', orderTypes: ['MARKET'], quoteAssetPrecision: 8, filters: [lot, { filterType: 'NOTIONAL', minNotional: '5' }] }))
  const client = {
    hasKeys: true,
    syncTime: async () => {},
    exchangeInfo: async () => ({ symbols }),
    tickers24h: async () => Object.entries(prices).map(([symbol, p]) => ({ symbol, lastPrice: String(p), quoteVolume: '1000000' })),
    price: async s => ({ price: String(prices[s]) }),
    klines: async (s, _i, limit) => {
      const closes = series[s] ?? Array(limit).fill(prices[s])
      return closes.map((c, i) => [0, '0', '0', '0', String(c), '0', now - (closes.length - i) * 1000, '0', 0, '0', '0', '0'])
    },
    account: async () => ({ canTrade: true, balances: Object.entries(balances).map(([asset, free]) => ({ asset, free: String(free), locked: '0' })) }),
    myTrades: async s => history[s] ?? [],
    testOrder: async () => ({}),
    order: async o => {
      orders.push(o)
      const p = prices[o.symbol], base = o.symbol.replace('USDT', '')
      if (o.side === 'BUY') {
        const q = Number(o.quoteOrderQty) / p
        balances.USDT -= Number(o.quoteOrderQty); balances[base] = (balances[base] ?? 0) + q
        return { executedQty: String(q), cummulativeQuoteQty: o.quoteOrderQty, fills: [] }
      }
      balances[base] -= Number(o.quantity); balances.USDT += Number(o.quantity) * p
      return { executedQty: o.quantity, cummulativeQuoteQty: String(Number(o.quantity) * p), fills: [] }
    },
  }
  return { client, orders, balances, prices }
}

const quiet = () => {}

test('imports existing coins and sells them at a profit', async () => {
  const ex = fakeExchange({
    balances: { USDT: 100, ETH: 0.5, BNB: 1, LDBTC: 1 },
    prices: { ETHUSDT: 2000, BNBUSDT: 600 },
    history: { ETHUSDT: [{ time: 1, isBuyer: true, qty: '0.5', quoteQty: '900', commission: '0', commissionAsset: 'BNB' }] },
  })
  const bot = createBot({ cfg: baseCfg, client: ex.client, log: quiet, persist: false })
  await bot.start()
  assert.deepEqual(Object.keys(bot.state.positions), ['ETHUSDT']) // BNB ignored, LD skipped
  assert.equal(bot.state.positions.ETHUSDT.entryPrice, 1800)
  await bot.tick() // 2000 vs 1800 = +11% → take profit
  assert.equal(ex.orders.length, 1)
  assert.deepEqual(ex.orders[0], { symbol: 'ETHUSDT', side: 'SELL', type: 'MARKET', quantity: '0.500' })
  assert.equal(bot.state.positions.ETHUSDT, undefined)
})

test('does not sell existing coin at a loss when stop loss is off', async () => {
  const ex = fakeExchange({
    balances: { USDT: 100, ETH: 0.5 }, prices: { ETHUSDT: 1500 },
    history: { ETHUSDT: [{ time: 1, isBuyer: true, qty: '0.5', quoteQty: '1000', commission: '0', commissionAsset: 'BNB' }] },
  })
  const bot = createBot({ cfg: { ...baseCfg, stopLossPct: 0 }, client: ex.client, log: quiet, persist: false })
  await bot.start(); await bot.tick()
  assert.equal(ex.orders.length, 0)
})

test('buys on signal within limits, then sells at take profit', async () => {
  const rising = [10, 9, 8, 7, 6, 5, 5, 5, 9]
  const ex = fakeExchange({
    balances: { USDT: 100 },
    prices: { AUSDT: 9, BUSDT: 9, CUSDT: 9, DUSDT: 9 },
    series: { AUSDT: rising, BUSDT: rising, CUSDT: rising, DUSDT: rising },
  })
  const bot = createBot({ cfg: { ...baseCfg, maxTotalQuote: 40 }, client: ex.client, log: quiet, persist: false })
  await bot.start(); await bot.tick()
  const buys = ex.orders.filter(o => o.side === 'BUY')
  assert.equal(buys.length, 2) // capped by maxTotal 40 / 20 per trade
  assert.equal(buys[0].quoteOrderQty, '20.00000000')

  await bot.tick() // same candle: no repeat buys
  assert.equal(ex.orders.filter(o => o.side === 'BUY').length, 2)

  ex.prices.AUSDT = 10 // +11%
  await bot.tick()
  const sells = ex.orders.filter(o => o.side === 'SELL')
  assert.equal(sells.length, 1)
  assert.equal(sells[0].symbol, 'AUSDT')
  assert.ok(bot.state.trades.find(t => t.side === 'SELL').pnl > 0)
  assert.equal(ex.orders.filter(o => o.side === 'BUY').length, 3) // freed limit lets the next signal in
})

test('forgets positions sold manually outside the bot', async () => {
  const ex = fakeExchange({ balances: { USDT: 100, ETH: 0.5 }, prices: { ETHUSDT: 1000 } })
  const bot = createBot({ cfg: baseCfg, client: ex.client, log: quiet, persist: false })
  await bot.start()
  assert.ok(bot.state.positions.ETHUSDT)
  ex.balances.ETH = 0
  await bot.tick()
  assert.equal(bot.state.positions.ETHUSDT, undefined)
  assert.equal(ex.orders.length, 0)
})

test('dry run never places real orders', async () => {
  const rising = [10, 9, 8, 7, 6, 5, 5, 5, 9]
  const ex = fakeExchange({ balances: { USDT: 100 }, prices: { AUSDT: 9 }, series: { AUSDT: rising } })
  const bot = createBot({ cfg: { ...baseCfg, live: false }, client: ex.client, log: quiet, persist: false })
  await bot.start(); await bot.tick()
  assert.equal(ex.orders.length, 0)
  assert.ok(bot.state.positions.AUSDT)
  assert.equal(bot.state.dryBalance, 80)
})

test('daily loss limit blocks new buys', async () => {
  const rising = [10, 9, 8, 7, 6, 5, 5, 5, 9]
  const ex = fakeExchange({ balances: { USDT: 100 }, prices: { AUSDT: 9 }, series: { AUSDT: rising } })
  const bot = createBot({ cfg: baseCfg, client: ex.client, log: quiet, persist: false })
  await bot.start()
  bot.state.daily = { date: new Date().toISOString().slice(0, 10), realized: -25 }
  await bot.tick()
  assert.equal(ex.orders.length, 0)
})

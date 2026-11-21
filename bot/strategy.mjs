import { ema, rsi } from './indicators.mjs'

// Decide on closed candles only. Returns { action: 'BUY' | 'SELL' | 'HOLD', reason, price, indicators }.
export function evaluate(closes, position, cfg) {
  const price = closes.at(-1)
  const fast = ema(closes, cfg.emaFast)
  const slow = ema(closes, cfg.emaSlow)
  const r = rsi(closes, cfg.rsiPeriod)
  const n = closes.length - 1
  const indicators = { emaFast: fast[n], emaSlow: slow[n], rsi: r[n] }

  if (fast[n - 1] == null || slow[n - 1] == null || r[n] == null) {
    return { action: 'HOLD', reason: 'not enough candles', price, indicators }
  }

  const crossUp = fast[n - 1] <= slow[n - 1] && fast[n] > slow[n]
  const crossDown = fast[n - 1] >= slow[n - 1] && fast[n] < slow[n]

  if (position) {
    const changePct = (price - position.entryPrice) / position.entryPrice * 100
    if (changePct <= -cfg.stopLossPct) return { action: 'SELL', reason: `stop loss (${changePct.toFixed(2)}%)`, price, indicators }
    if (changePct >= cfg.takeProfitPct) return { action: 'SELL', reason: `take profit (${changePct.toFixed(2)}%)`, price, indicators }
    if (crossDown && r[n] > cfg.rsiSellMin) return { action: 'SELL', reason: 'EMA cross down', price, indicators }
    return { action: 'HOLD', reason: 'in position', price, indicators }
  }

  if (crossUp && r[n] < cfg.rsiBuyMax) return { action: 'BUY', reason: 'EMA cross up', price, indicators }
  return { action: 'HOLD', reason: 'no signal', price, indicators }
}

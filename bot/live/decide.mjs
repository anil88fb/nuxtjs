import { ema, rsi } from '../indicators.mjs'

// Net profit % after paying the fee on both buy and sell.
export function netPnlPct(entryPrice, price, feePct) {
  const f = feePct / 100
  return ((price * (1 - f)) / (entryPrice * (1 + f)) - 1) * 100
}

export function analyze(closes, cfg) {
  const n = closes.length - 1
  const fast = ema(closes, cfg.emaFast)
  const slow = ema(closes, cfg.emaSlow)
  const trend = cfg.emaTrend > 0 ? ema(closes, cfg.emaTrend) : null
  const r = rsi(closes, cfg.rsiPeriod)
  const ready = n >= 1 && fast[n - 1] != null && slow[n - 1] != null && r[n] != null && (!trend || trend[n] != null)
  return {
    ready,
    close: closes[n],
    emaFast: fast[n],
    emaSlow: slow[n],
    emaTrend: trend?.[n] ?? null,
    rsi: r[n],
    crossUp: ready && fast[n - 1] <= slow[n - 1] && fast[n] > slow[n],
    crossDown: ready && fast[n - 1] >= slow[n - 1] && fast[n] < slow[n],
  }
}

export function buySignal(a, cfg) {
  if (!a.ready) return { buy: false, reason: 'not enough candles' }
  if (!a.crossUp) return { buy: false, reason: 'no EMA cross up' }
  if (a.rsi >= cfg.rsiBuyMax) return { buy: false, reason: `RSI ${a.rsi.toFixed(1)} too high` }
  if (a.emaTrend != null && a.close < a.emaTrend) return { buy: false, reason: 'below trend EMA' }
  return { buy: true, reason: `EMA cross up, RSI ${a.rsi.toFixed(1)}` }
}

// price = live price; a = analysis of closed candles (may be null if klines failed)
export function sellSignal(position, price, a, cfg) {
  const pnl = netPnlPct(position.entryPrice, price, cfg.feePct)
  if (pnl >= cfg.takeProfitPct) return { sell: true, pnl, reason: `take profit ${pnl.toFixed(2)}%` }
  if (cfg.stopLossPct > 0 && pnl <= -cfg.stopLossPct) return { sell: true, pnl, reason: `stop loss ${pnl.toFixed(2)}%` }
  if (a?.crossDown && pnl >= cfg.minProfitPct) return { sell: true, pnl, reason: `EMA cross down, profit ${pnl.toFixed(2)}%` }
  return { sell: false, pnl, reason: `holding ${pnl.toFixed(2)}%` }
}

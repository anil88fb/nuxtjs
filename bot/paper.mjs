import { readFileSync, writeFileSync, renameSync } from 'node:fs'

// Simulated account: no real orders are placed.
export function loadState(file, startingBalance) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return { balanceUsdt: startingBalance, positions: {}, trades: [], lastCandle: {} }
  }
}

export function saveState(file, state) {
  writeFileSync(file + '.tmp', JSON.stringify(state, null, 2))
  renameSync(file + '.tmp', file)
}

export function buy(state, symbol, price, cfg, reason) {
  const spend = Math.min(cfg.tradeSizeUsdt, state.balanceUsdt)
  if (spend < 10) return null
  const qty = spend * (1 - cfg.feePct / 100) / price
  state.balanceUsdt -= spend
  state.positions[symbol] = { qty, entryPrice: price, costUsdt: spend, openedAt: Date.now() }
  const trade = { time: Date.now(), symbol, side: 'BUY', price, qty, usdt: spend, reason }
  state.trades.push(trade)
  return trade
}

export function sell(state, symbol, price, cfg, reason) {
  const pos = state.positions[symbol]
  if (!pos) return null
  const proceeds = pos.qty * price * (1 - cfg.feePct / 100)
  state.balanceUsdt += proceeds
  delete state.positions[symbol]
  const pnl = proceeds - pos.costUsdt
  const trade = { time: Date.now(), symbol, side: 'SELL', price, qty: pos.qty, usdt: proceeds, pnl, reason }
  state.trades.push(trade)
  return trade
}

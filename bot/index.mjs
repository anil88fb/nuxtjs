import { config } from './config.mjs'
import { fetchClosedCandles } from './binance.mjs'
import { evaluate } from './strategy.mjs'
import { loadState, saveState, buy, sell } from './paper.mjs'

const log = (...a) => console.log(new Date().toISOString(), ...a)
const state = loadState(config.stateFile, config.startingBalanceUsdt)
const once = process.argv.includes('--once')
let stopping = false

async function tick() {
  for (const symbol of config.symbols) {
    try {
      const candles = await fetchClosedCandles(symbol, config.interval, config.candleLimit, config.baseUrls)
      const last = candles.at(-1)
      if (!last) continue
      const position = state.positions[symbol]
      const newCandle = state.lastCandle[symbol] !== last.closeTime
      const signal = evaluate(candles.map(c => c.close), position, config)

      // Entries/crossover exits once per closed candle; stop loss / take profit on every tick.
      let trade = null
      if (signal.action === 'BUY' && newCandle) trade = buy(state, symbol, signal.price, config, signal.reason)
      if (signal.action === 'SELL' && (newCandle || !signal.reason.startsWith('EMA'))) trade = sell(state, symbol, signal.price, config, signal.reason)
      state.lastCandle[symbol] = last.closeTime

      const ind = signal.indicators
      log(symbol, signal.price, `RSI=${ind.rsi?.toFixed(1)}`, `EMA${config.emaFast}=${ind.emaFast?.toFixed(2)}`,
        `EMA${config.emaSlow}=${ind.emaSlow?.toFixed(2)}`, '→', trade ? `${trade.side} (${trade.reason})` : `HOLD (${signal.reason})`)
      if (trade?.pnl != null) log(`  PnL: ${trade.pnl.toFixed(2)} USDT`)
    } catch (err) {
      log(symbol, 'ERROR', err.message)
    }
  }
  saveState(config.stateFile, state)
  const open = Object.entries(state.positions).map(([s, p]) => `${s}@${p.entryPrice}`).join(', ') || 'none'
  log(`Balance: ${state.balanceUsdt.toFixed(2)} USDT | open: ${open} | trades: ${state.trades.length}`)
}

log(`Bot started (PAPER mode) symbols=${config.symbols.join(',')} interval=${config.interval} poll=${config.pollSeconds}s`)
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stopping = true; log('Stopping...'); saveState(config.stateFile, state); process.exit(0) })

do {
  await tick()
  if (!once && !stopping) await new Promise(r => setTimeout(r, config.pollSeconds * 1000))
} while (!once && !stopping)

// All settings can be overridden with environment variables.
const env = process.env

export const config = {
  symbols: (env.BOT_SYMBOLS ?? 'BTCUSDT,ETHUSDT,SOLUSDT').split(',').map(s => s.trim().toUpperCase()).filter(Boolean),
  interval: env.BOT_INTERVAL ?? '15m',
  candleLimit: Number(env.BOT_CANDLE_LIMIT ?? 200),
  pollSeconds: Number(env.BOT_POLL_SECONDS ?? 60),

  // Strategy: EMA crossover filtered by RSI
  emaFast: Number(env.BOT_EMA_FAST ?? 9),
  emaSlow: Number(env.BOT_EMA_SLOW ?? 21),
  rsiPeriod: Number(env.BOT_RSI_PERIOD ?? 14),
  rsiBuyMax: Number(env.BOT_RSI_BUY_MAX ?? 70), // don't buy when overbought
  rsiSellMin: Number(env.BOT_RSI_SELL_MIN ?? 30), // don't sell on crossover when already oversold

  // Risk
  stopLossPct: Number(env.BOT_STOP_LOSS_PCT ?? 3),
  takeProfitPct: Number(env.BOT_TAKE_PROFIT_PCT ?? 6),
  tradeSizeUsdt: Number(env.BOT_TRADE_SIZE_USDT ?? 100),
  feePct: Number(env.BOT_FEE_PCT ?? 0.1),

  // Paper trading (no real orders)
  startingBalanceUsdt: Number(env.BOT_START_BALANCE ?? 1000),
  stateFile: env.BOT_STATE_FILE ?? new URL('./state.json', import.meta.url).pathname,

  baseUrls: (env.BOT_BINANCE_BASE_URLS ?? 'https://data-api.binance.vision,https://api.binance.com').split(',').map(s => s.trim()).filter(Boolean),
}

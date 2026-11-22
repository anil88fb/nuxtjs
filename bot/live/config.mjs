const env = process.env
const num = (k, d) => (env[k] === undefined || env[k] === '' ? d : Number(env[k]))
const list = (k, d) => (env[k] ?? d).split(',').map(s => s.trim().toUpperCase()).filter(Boolean)

export function loadConfig() {
  return {
    live: env.BOT_LIVE === 'true', // false = dry run: nothing is bought or sold
    apiKey: env.BINANCE_API_KEY ?? '',
    apiSecret: env.BINANCE_API_SECRET ?? '',
    baseUrl: env.BINANCE_BASE_URL ?? 'https://api.binance.com',

    quote: (env.BOT_QUOTE ?? 'USDT').toUpperCase(),
    interval: env.BOT_INTERVAL ?? '15m',
    candleLimit: num('BOT_CANDLE_LIMIT', 200),
    pollSeconds: num('BOT_POLL_SECONDS', 60),

    // Which coins to scan
    scanTop: num('BOT_SCAN_TOP', 30), // top N pairs by 24h volume
    minQuoteVolume: num('BOT_MIN_QUOTE_VOLUME', 20_000_000), // 24h volume in quote currency
    whitelist: list('BOT_WHITELIST', ''), // if set, only these base assets are bought
    ignoreAssets: list('BOT_IGNORE_ASSETS', 'BNB'), // never bought or sold
    manageExisting: env.BOT_MANAGE_EXISTING !== 'false', // also sell coins already in the account

    // Strategy
    emaFast: num('BOT_EMA_FAST', 9),
    emaSlow: num('BOT_EMA_SLOW', 21),
    emaTrend: num('BOT_EMA_TREND', 50), // only buy above this EMA (0 = off)
    rsiPeriod: num('BOT_RSI_PERIOD', 14),
    rsiBuyMax: num('BOT_RSI_BUY_MAX', 70),

    // Exit (percentages are net of fees)
    takeProfitPct: num('BOT_TAKE_PROFIT_PCT', 3),
    minProfitPct: num('BOT_MIN_PROFIT_PCT', 0.5), // EMA cross down only sells if at least this profitable
    stopLossPct: num('BOT_STOP_LOSS_PCT', 5), // 0 = never sell at a loss
    feePct: num('BOT_FEE_PCT', 0.1),

    // Risk limits
    tradeSizeQuote: num('BOT_TRADE_SIZE', 20),
    maxOpenPositions: num('BOT_MAX_OPEN_POSITIONS', 3),
    maxTotalQuote: num('BOT_MAX_TOTAL', 60), // max quote currency the bot keeps invested in its own buys
    reserveQuote: num('BOT_RESERVE', 0), // never spend below this balance
    maxDailyLossQuote: num('BOT_MAX_DAILY_LOSS', 20), // stop buying for the day after this realized loss

    stateFile: env.BOT_STATE_FILE ?? new URL(`./state-${env.BOT_LIVE === 'true' ? 'live' : 'dry'}.json`, import.meta.url).pathname,
    logFile: env.BOT_LOG_FILE ?? new URL('./trades.log', import.meta.url).pathname,
  }
}

export const STABLES = new Set(['USDT', 'USDC', 'FDUSD', 'TUSD', 'BUSD', 'DAI', 'USDP', 'USDE', 'EUR', 'TRY', 'BRL', 'GBP', 'JPY', 'AEUR', 'EURI'])

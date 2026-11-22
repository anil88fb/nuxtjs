// Settings the panel may read/change (never the secret).
export const SETTINGS = {
  BOT_LIVE: { type: 'bool', def: 'false' },
  BOT_QUOTE: { type: 'text', def: 'USDT' },
  BOT_INTERVAL: { type: 'select', def: '15m', options: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'] },
  BOT_POLL_SECONDS: { type: 'number', def: '60', min: 10, max: 3600 },
  BOT_TRADE_SIZE: { type: 'number', def: '20', min: 5, max: 100000 },
  BOT_MAX_OPEN_POSITIONS: { type: 'number', def: '3', min: 1, max: 50 },
  BOT_MAX_TOTAL: { type: 'number', def: '60', min: 5, max: 1000000 },
  BOT_RESERVE: { type: 'number', def: '0', min: 0, max: 1000000 },
  BOT_TAKE_PROFIT_PCT: { type: 'number', def: '3', min: 0.3, max: 100 },
  BOT_MIN_PROFIT_PCT: { type: 'number', def: '0.5', min: 0, max: 100 },
  BOT_STOP_LOSS_PCT: { type: 'number', def: '5', min: 0, max: 90 },
  BOT_MAX_DAILY_LOSS: { type: 'number', def: '20', min: 0, max: 1000000 },
  BOT_SCAN_TOP: { type: 'number', def: '30', min: 1, max: 200 },
  BOT_IGNORE_ASSETS: { type: 'text', def: 'BNB' },
  BOT_WHITELIST: { type: 'text', def: '' },
  BOT_MANAGE_EXISTING: { type: 'bool', def: 'true' },
} as Record<string, { type: string, def: string, min?: number, max?: number, options?: string[] }>

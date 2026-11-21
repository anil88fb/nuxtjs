# Nuxt Example

Deploy your [Nuxt](https://nuxt.com) project to Vercel with zero configuration.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/nuxtjs&template=nuxtjs)

_Live Example: https://nuxtjs-template.vercel.app_

Look at the [Nuxt 3 documentation](https://v3.nuxtjs.org) to learn more.

## Setup

Make sure to install the dependencies:

```bash
# yarn
yarn

# npm
npm install

# pnpm
pnpm install --shamefully-hoist
```

## Development Server

Start the development server on http://localhost:3000

```bash
npm run dev
```

## Production

Build the application for production:

```bash
npm run build
```

Locally preview production build:

```bash
npm run preview
```

Checkout the [deployment documentation](https://nuxt.com/docs/getting-started/deployment#presets) for more information.

## Crypto market data API (for the bot)

Public Binance market data, no API key needed. Server routes under `/api/market`:

| Route | Example | Returns |
| --- | --- | --- |
| `klines` | `/api/market/klines?symbol=BTCUSDT&interval=1h&limit=500` | OHLCV candles (`startTime`/`endTime` in ms optional, max 1000) |
| `ticker` | `/api/market/ticker?symbols=BTCUSDT,ETHUSDT` | 24h price, change %, volume |
| `depth` | `/api/market/depth?symbol=BTCUSDT&limit=100` | Order book, best bid/ask, spread |
| `snapshot` | `/api/market/snapshot?symbols=BTCUSDT,ETHUSDT&interval=15m&limit=200` | Ticker + candles for each symbol in one call (max 20) |

Config (env vars): `NUXT_BINANCE_BASE_URLS` (comma-separated, tried in order; default `https://data-api.binance.vision,https://api.binance.com`) and `NUXT_BINANCE_DEFAULT_SYMBOLS`.

## Crypto bot (paper trading)

`bot/` is a standalone Node bot (no extra dependencies, Node 18+). It reads public Binance candles and trades a **simulated** balance — no real orders, no API keys.

Strategy: buy when EMA(9) crosses above EMA(21) and RSI < 70; sell on EMA cross down, 3% stop loss or 6% take profit. Only closed candles are used. State (balance, positions, trade history) is kept in `bot/state.json`.

```bash
npm run bot        # run continuously (checks every 60s)
npm run bot:once   # single check, then exit
npm run test:bot   # unit tests
```

Keep it running in the background with pm2: `pm2 start bot/index.mjs --name kripto-bot`.

Settings (env vars): `BOT_SYMBOLS` (default `BTCUSDT,ETHUSDT,SOLUSDT`), `BOT_INTERVAL` (`15m`), `BOT_POLL_SECONDS` (`60`), `BOT_EMA_FAST`, `BOT_EMA_SLOW`, `BOT_RSI_PERIOD`, `BOT_RSI_BUY_MAX`, `BOT_RSI_SELL_MIN`, `BOT_STOP_LOSS_PCT`, `BOT_TAKE_PROFIT_PCT`, `BOT_TRADE_SIZE_USDT` (`100`), `BOT_START_BALANCE` (`1000`), `BOT_FEE_PCT` (`0.1`), `BOT_STATE_FILE`, `BOT_BINANCE_BASE_URLS`.

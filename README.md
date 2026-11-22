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

## Live Binance bot (real orders)

`bot/live/` trades on your Binance Spot account. **Dry run by default**: nothing is bought or sold until `BOT_LIVE=true`.

What it does every `BOT_POLL_SECONDS`:
1. Reads your account. Coins you already hold (except `BOT_IGNORE_ASSETS`, stablecoins, Earn `LD*` assets) are managed too; their average buy price is computed from your trade history.
2. Sells a position when net profit (after fees) ≥ `BOT_TAKE_PROFIT_PCT`, or on an EMA cross down if profit ≥ `BOT_MIN_PROFIT_PCT`, or at `BOT_STOP_LOSS_PCT` loss (`0` = never sell at a loss).
3. Scans the `BOT_SCAN_TOP` most liquid `USDT` pairs and buys on EMA(9)/EMA(21) cross up with RSI < 70 and price above EMA(50), using market orders of `BOT_TRADE_SIZE`.

Safety limits: `BOT_MAX_OPEN_POSITIONS`, `BOT_MAX_TOTAL` (total invested by the bot), `BOT_RESERVE`, `BOT_MAX_DAILY_LOSS`. Orders are rounded to Binance lot size and minimum notional.

### Control panel

```bash
npm install
npm run dev          # or: npm run panel (production build)
```

Open http://localhost:3000. From the panel you can save your Binance API key (written only to the local `.env`), test the connection and see balances, switch dry/live mode, start/stop the bot, edit settings and watch positions, trades and logs.

The panel only answers requests from the same computer. To use it from another PC over Tailscale, set `DASHBOARD_PASSWORD` in `.env` and start the panel with `HOST=0.0.0.0`; it will ask for the password.

Manual setup without the panel:
1. Binance → API Management → create a key with **Spot Trading only, withdrawals disabled**, restricted to your IP.
2. `cp .env.example .env` and fill in the key.
3. `npm run live` (dry run). Check the log and `bot/live/trades.log`.
4. When happy, set `BOT_LIVE=true` in `.env` and run `pm2 start bot/live/index.mjs --name binance-bot`.

`npm run test:live` runs the tests (uses a fake exchange, no network).

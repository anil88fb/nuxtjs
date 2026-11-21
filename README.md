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

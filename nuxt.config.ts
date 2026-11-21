// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  routeRules: {
    // prerender index route by default
    '/': { prerender: true },
  },
  runtimeConfig: {
    binance: {
      // Override with NUXT_BINANCE_BASE_URLS / NUXT_BINANCE_DEFAULT_SYMBOLS
      baseUrls: 'https://data-api.binance.vision,https://api.binance.com',
      defaultSymbols: 'BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT',
    },
  },
});

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },
  app: { head: { title: 'Kripto Bot Paneli', htmlAttrs: { lang: 'tr' } } },
  routeRules: {
    // control panel: rendered in the browser, talks to /api/bot/*
    '/': { ssr: false },
  },
  runtimeConfig: {
    binance: {
      // Override with NUXT_BINANCE_BASE_URLS / NUXT_BINANCE_DEFAULT_SYMBOLS
      baseUrls: 'https://data-api.binance.vision,https://api.binance.com',
      defaultSymbols: 'BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT',
    },
  },
});

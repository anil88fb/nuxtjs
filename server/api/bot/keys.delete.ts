export default defineEventHandler((event) => {
  requirePanelAccess(event)
  if (botRunning()) throw createError({ statusCode: 409, statusMessage: 'Önce botu durdur' })
  writeEnvFile({ BINANCE_API_KEY: '', BINANCE_API_SECRET: '', BOT_LIVE: 'false' })
  return { ok: true }
})

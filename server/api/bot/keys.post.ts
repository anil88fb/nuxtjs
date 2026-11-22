export default defineEventHandler(async (event) => {
  requirePanelAccess(event)
  const { apiKey, apiSecret } = await readBody<{ apiKey?: string, apiSecret?: string }>(event) ?? {}
  const key = String(apiKey ?? '').trim()
  const secret = String(apiSecret ?? '').trim()
  const valid = (s: string) => /^[A-Za-z0-9]{32,128}$/.test(s)
  if (!valid(key) || !valid(secret)) {
    throw createError({ statusCode: 400, statusMessage: 'API Key ve Secret Key harf/rakamdan oluşmalı (Binance HMAC anahtarı, 64 karakter)' })
  }
  writeEnvFile({ BINANCE_API_KEY: key, BINANCE_API_SECRET: secret })
  return { ok: true, restartNeeded: botRunning() }
})

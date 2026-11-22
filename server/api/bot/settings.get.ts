export default defineEventHandler((event) => {
  requirePanelAccess(event)
  const env = readEnvFile()
  const values = Object.fromEntries(Object.entries(SETTINGS).map(([k, s]) => [k, env[k] ?? s.def]))
  const key = env.BINANCE_API_KEY ?? ''
  return {
    values,
    schema: SETTINGS,
    apiKeyMasked: key ? `${key.slice(0, 4)}••••••••${key.slice(-4)}` : '',
    hasSecret: Boolean(env.BINANCE_API_SECRET),
  }
})

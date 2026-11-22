import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export default defineEventHandler((event) => {
  requirePanelAccess(event)
  const env = readEnvFile()
  const live = env.BOT_LIVE === 'true'
  let state: any = null
  try { state = JSON.parse(readFileSync(resolve(ROOT, `bot/live/state-${live ? 'live' : 'dry'}.json`), 'utf8')) } catch {}
  return {
    ...botRuntime(),
    configuredMode: live ? 'LIVE' : 'DRY',
    hasKeys: Boolean(env.BINANCE_API_KEY && env.BINANCE_API_SECRET),
    positions: state?.positions ?? {},
    trades: (state?.trades ?? []).slice(-50).reverse(),
    daily: state?.daily ?? null,
    dryBalance: state?.dryBalance ?? null,
  }
})

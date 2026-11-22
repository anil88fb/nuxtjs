import { loadEnv } from './env.mjs'
import { loadConfig } from './config.mjs'
import { createClient } from './client.mjs'
import { createBot } from './engine.mjs'

loadEnv()
const cfg = loadConfig()
const log = (...a) => console.log(new Date().toISOString(), ...a)
const once = process.argv.includes('--once')

if (cfg.live) {
  if (!cfg.apiKey || !cfg.apiSecret) { log('BOT_LIVE=true but BINANCE_API_KEY / BINANCE_API_SECRET are missing'); process.exit(1) }
  log('!!! LIVE MODE: REAL ORDERS WITH REAL MONEY !!!')
  log(`Limits: ${cfg.tradeSizeQuote} ${cfg.quote}/trade, max ${cfg.maxOpenPositions} positions, max ${cfg.maxTotalQuote} ${cfg.quote} invested, stop loss ${cfg.stopLossPct || 'off'}%`)
  log('Starting in 10 seconds, Ctrl+C to cancel...')
  await new Promise(r => setTimeout(r, 10_000))
} else {
  log('DRY RUN: no real orders will be placed. Set BOT_LIVE=true for real trading.')
}

const bot = createBot({ cfg, client: createClient(cfg), log })
let stopping = false
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stopping = true; log('Stopping after current step...'); if (!busy) process.exit(0) })
let busy = false

try {
  await bot.start()
} catch (e) {
  log('Startup failed:', e.message)
  process.exit(1)
}

do {
  busy = true
  try { await bot.tick() } catch (e) { log('Tick failed:', e.message) }
  busy = false
  if (stopping) break
  if (!once) await new Promise(r => setTimeout(r, cfg.pollSeconds * 1000))
} while (!once && !stopping)
process.exit(0)

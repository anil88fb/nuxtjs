import { spawn, type ChildProcess } from 'node:child_process'
import { resolve } from 'node:path'

interface BotRuntime { proc: ChildProcess | null, logs: string[], startedAt: number | null, mode: 'LIVE' | 'DRY' | null, exitCode: number | null }

const g = globalThis as any
const rt: BotRuntime = g.__kriptoBot ??= { proc: null, logs: [], startedAt: null, mode: null, exitCode: null }

function push(chunk: string) {
  for (const line of chunk.split(/\r?\n/)) if (line.trim()) rt.logs.push(line)
  if (rt.logs.length > 500) rt.logs.splice(0, rt.logs.length - 500)
}

export function botRunning() { return Boolean(rt.proc && rt.proc.exitCode === null && !rt.proc.killed) }

export function startBot() {
  if (botRunning()) throw createError({ statusCode: 409, statusMessage: 'Bot zaten çalışıyor' })
  const env = readEnvFile()
  const live = env.BOT_LIVE === 'true'
  if (live && (!env.BINANCE_API_KEY || !env.BINANCE_API_SECRET)) {
    throw createError({ statusCode: 400, statusMessage: 'Canlı mod için önce Binance API anahtarını kaydet' })
  }
  rt.logs = []
  rt.exitCode = null
  rt.mode = live ? 'LIVE' : 'DRY'
  rt.startedAt = Date.now()
  // .env values override whatever the panel process was started with.
  rt.proc = spawn(process.execPath, [resolve(ROOT, 'bot/live/index.mjs')], { cwd: ROOT, env: { ...process.env, ...env } })
  rt.proc.stdout?.on('data', d => push(String(d)))
  rt.proc.stderr?.on('data', d => push(String(d)))
  rt.proc.on('exit', (code) => { rt.exitCode = code; push(`— bot durdu (çıkış kodu ${code}) —`) })
}

export function stopBot() {
  if (!botRunning()) return
  rt.proc!.kill('SIGTERM')
  const p = rt.proc!
  setTimeout(() => { if (p.exitCode === null) p.kill('SIGKILL') }, 10_000)
}

export function botRuntime() {
  return { running: botRunning(), mode: rt.mode, startedAt: rt.startedAt, exitCode: rt.exitCode, logs: rt.logs.slice(-200) }
}

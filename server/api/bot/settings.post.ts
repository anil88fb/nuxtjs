export default defineEventHandler(async (event) => {
  requirePanelAccess(event)
  const body = await readBody<Record<string, unknown>>(event)
  const updates: Record<string, string> = {}
  for (const [k, raw] of Object.entries(body ?? {})) {
    const s = SETTINGS[k]
    if (!s) throw createError({ statusCode: 400, statusMessage: `Bilinmeyen ayar: ${k}` })
    let v = String(raw ?? '').trim()
    if (s.type === 'bool') v = v === 'true' ? 'true' : 'false'
    if (s.type === 'number') {
      const n = Number(v)
      if (!Number.isFinite(n) || n < s.min! || n > s.max!) throw createError({ statusCode: 400, statusMessage: `${k}: ${s.min} ile ${s.max} arasında olmalı` })
      v = String(n)
    }
    if (s.type === 'select' && !s.options!.includes(v)) throw createError({ statusCode: 400, statusMessage: `${k}: geçersiz değer` })
    if (s.type === 'text') v = v.toUpperCase().replace(/[^A-Z0-9,]/g, '')
    updates[k] = v
  }
  writeEnvFile(updates)
  return { ok: true, restartNeeded: botRunning() }
})

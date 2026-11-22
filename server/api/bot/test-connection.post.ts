import { createClient } from '../../../bot/live/client.mjs'

const HINTS: Record<number, string> = {
  [-2015]: 'Anahtar yanlış, IP kısıtlamasına bu bilgisayarın IP adresi eklenmemiş ya da izinler eksik.',
  [-2014]: 'API Key formatı hatalı, tekrar kopyala.',
  [-1022]: 'Secret Key yanlış.',
  [-1021]: 'Bilgisayarın saati kaymış, otomatik saat senkronizasyonunu aç.',
}

export default defineEventHandler(async (event) => {
  requirePanelAccess(event)
  const env = readEnvFile()
  if (!env.BINANCE_API_KEY || !env.BINANCE_API_SECRET) throw createError({ statusCode: 400, statusMessage: 'Önce API anahtarını kaydet' })
  const client = createClient({ apiKey: env.BINANCE_API_KEY, apiSecret: env.BINANCE_API_SECRET, baseUrl: env.BINANCE_BASE_URL || 'https://api.binance.com' })
  try {
    await client.syncTime()
    const acc: any = await client.account()
    const balances = acc.balances
      .map((b: any) => ({ asset: b.asset, free: Number(b.free), locked: Number(b.locked) }))
      .filter((b: any) => b.free + b.locked > 0)
    let restrictions: any = null
    try { restrictions = await client.apiRestrictions() } catch {}
    return {
      ok: true,
      canTrade: acc.canTrade && (restrictions?.enableSpotAndMarginTrading ?? true),
      keyCanWithdraw: restrictions?.enableWithdrawals ?? null,
      ipRestricted: restrictions?.ipRestrict ?? null,
      permissions: acc.permissions ?? [],
      balances,
    }
  } catch (e: any) {
    return { ok: false, error: e.message, hint: HINTS[e.code] ?? (e.status ? '' : 'Binance\'e ulaşılamadı. İnternet bağlantısını ya da Binance\'in bölgende erişilebilir olduğunu kontrol et.') }
  }
})

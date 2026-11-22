import { timingSafeEqual } from 'node:crypto'



const LOCAL = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

// The panel controls real money: only this computer may use it,
// unless DASHBOARD_PASSWORD is set (e.g. for access over Tailscale).
export function requirePanelAccess(event: Parameters<typeof getRequestHeader>[0]) {
  const ip = event.node.req.socket.remoteAddress ?? ''
  const forwarded = getRequestHeader(event, 'x-forwarded-for')
  if (LOCAL.has(ip) && !forwarded) return

  const password = readEnvFile().DASHBOARD_PASSWORD || process.env.DASHBOARD_PASSWORD || ''
  const given = getRequestHeader(event, 'x-dashboard-password') ?? ''
  if (password && given.length === password.length && timingSafeEqual(Buffer.from(given), Buffer.from(password))) return
  throw createError({ statusCode: 401, statusMessage: password ? 'Panel şifresi gerekli' : 'Panel sadece bu bilgisayardan kullanılabilir (uzaktan erişim için .env içinde DASHBOARD_PASSWORD ayarla)' })
}

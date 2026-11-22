export default defineEventHandler((event) => {
  requirePanelAccess(event)
  startBot()
  return { ok: true }
})

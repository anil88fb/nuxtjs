export default defineEventHandler((event) => {
  requirePanelAccess(event)
  stopBot()
  return { ok: true }
})

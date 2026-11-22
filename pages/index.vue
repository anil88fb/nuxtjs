<script setup lang="ts">
const LABELS: Record<string, string> = {
  BOT_TRADE_SIZE: 'İşlem başına tutar (USDT)',
  BOT_MAX_OPEN_POSITIONS: 'En fazla açık pozisyon',
  BOT_MAX_TOTAL: 'Botun toplam harcama limiti (USDT)',
  BOT_RESERVE: 'Dokunulmayacak USDT bakiyesi',
  BOT_TAKE_PROFIT_PCT: 'Kâr al (%, net)',
  BOT_MIN_PROFIT_PCT: 'Trend dönüşünde en az kâr (%)',
  BOT_STOP_LOSS_PCT: 'Zarar kes (%, 0 = kapalı)',
  BOT_MAX_DAILY_LOSS: 'Günlük zarar limiti (USDT)',
  BOT_INTERVAL: 'Mum aralığı',
  BOT_POLL_SECONDS: 'Kontrol sıklığı (saniye)',
  BOT_SCAN_TOP: 'Taranacak coin sayısı',
  BOT_QUOTE: 'İşlem birimi',
  BOT_IGNORE_ASSETS: 'Dokunulmayacak coinler (virgülle)',
  BOT_WHITELIST: 'Sadece bu coinleri al (boş = hepsi)',
  BOT_MANAGE_EXISTING: 'Hesaptaki mevcut coinleri de yönet',
}

const password = ref('')
const needPassword = ref(false)
try { password.value = sessionStorage.getItem('panelPassword') ?? '' } catch {}

async function api<T = any>(url: string, opts: any = {}): Promise<T> {
  try {
    return await $fetch<T>(url, { ...opts, headers: password.value ? { 'x-dashboard-password': password.value } : {} })
  } catch (e: any) {
    if (e?.response?.status === 401) needPassword.value = true
    throw new Error(e?.data?.statusMessage ?? e?.message ?? 'İstek başarısız')
  }
}

const status = ref<any>(null)
const settings = ref<any>(null)
const form = reactive<Record<string, string>>({})
const keyForm = reactive({ apiKey: '', apiSecret: '' })
const conn = ref<any>(null)
const msg = ref<{ text: string, kind: 'ok' | 'err' } | null>(null)
const busy = ref('')
const liveConfirm = ref(false)
const logBox = ref<HTMLElement>()

function flash(text: string, kind: 'ok' | 'err' = 'ok') {
  msg.value = { text, kind }
  setTimeout(() => { if (msg.value?.text === text) msg.value = null }, 6000)
}

async function run(name: string, fn: () => Promise<any>) {
  busy.value = name
  try { await fn() } catch (e: any) { flash(e.message, 'err') } finally { busy.value = '' }
}

async function loadSettings() {
  settings.value = await api('/api/bot/settings')
  Object.assign(form, settings.value.values)
}

async function loadStatus() {
  try {
    status.value = await api('/api/bot/status')
    needPassword.value = false
    await nextTick()
    if (logBox.value) logBox.value.scrollTop = logBox.value.scrollHeight
  } catch {}
}

function savePassword() {
  try { sessionStorage.setItem('panelPassword', password.value) } catch {}
  init()
}

const saveKeys = () => run('keys', async () => {
  const r = await api('/api/bot/keys', { method: 'POST', body: keyForm })
  keyForm.apiKey = ''
  keyForm.apiSecret = ''
  await loadSettings()
  flash(r.restartNeeded ? 'Anahtar kaydedildi. Bot çalışıyor; geçerli olması için durdurup yeniden başlat.' : 'Anahtar kaydedildi. Şimdi bağlantıyı test et.')
  await testConn()
})

const deleteKeys = () => run('delkeys', async () => {
  if (!confirm('API anahtarı bu bilgisayardan silinsin mi?')) return
  await api('/api/bot/keys', { method: 'DELETE' })
  conn.value = null
  await loadSettings()
  flash('Anahtar silindi.')
})

const testConn = () => run('test', async () => {
  conn.value = await api('/api/bot/test-connection', { method: 'POST' })
})

const saveSettings = () => run('settings', async () => {
  const body: Record<string, string> = {}
  for (const k of Object.keys(settings.value.schema)) if (k !== 'BOT_LIVE') body[k] = form[k]
  const r = await api('/api/bot/settings', { method: 'POST', body })
  await loadSettings()
  flash(r.restartNeeded ? 'Ayarlar kaydedildi. Geçerli olması için botu yeniden başlat.' : 'Ayarlar kaydedildi.')
})

const setMode = (live: boolean) => run('mode', async () => {
  if (live && !liveConfirm.value) throw new Error('Canlı mod için onay kutusunu işaretle.')
  await api('/api/bot/settings', { method: 'POST', body: { BOT_LIVE: String(live) } })
  liveConfirm.value = false
  await Promise.all([loadSettings(), loadStatus()])
  flash(live ? 'Canlı mod seçildi: bot başlatılınca GERÇEK emir verecek.' : 'Deneme modu seçildi.')
})

const start = () => run('start', async () => { await api('/api/bot/start', { method: 'POST' }); await loadStatus() })
const stop = () => run('stop', async () => { await api('/api/bot/stop', { method: 'POST' }); setTimeout(loadStatus, 1500) })

const isLive = computed(() => form.BOT_LIVE === 'true')
const positions = computed(() => Object.entries(status.value?.positions ?? {}).map(([symbol, p]: any) => ({ symbol, ...p })))
const sourceLabel = (s: string) => ({ bot: 'Bot aldı', imported: 'Hesapta vardı', 'imported-unknown': 'Hesapta vardı (maliyet bilinmiyor)' } as any)[s] ?? s
const fmt = (n: number, d = 2) => n == null ? '—' : Number(n).toLocaleString('tr-TR', { maximumFractionDigits: d })
const time = (t: number) => t ? new Date(t).toLocaleString('tr-TR') : '—'

async function init() {
  try { await Promise.all([loadSettings(), loadStatus()]) } catch (e: any) { flash(e.message, 'err') }
}

let timer: any
onMounted(() => { init(); timer = setInterval(loadStatus, 3000) })
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <main>
    <header>
      <h1>Kripto Bot Paneli</h1>
      <span v-if="status" class="badge" :class="status.running ? (status.mode === 'LIVE' ? 'live' : 'dry') : 'off'">
        {{ status.running ? (status.mode === 'LIVE' ? '● CANLI çalışıyor' : '● Deneme modunda çalışıyor') : '○ Durdu' }}
      </span>
    </header>

    <div v-if="msg" class="flash" :class="msg.kind">{{ msg.text }}</div>

    <section v-if="needPassword" class="card">
      <h2>Panel şifresi</h2>
      <p class="muted">Panele başka bir bilgisayardan bağlanıyorsun. <code>.env</code> içindeki <code>DASHBOARD_PASSWORD</code> değerini gir.</p>
      <form class="row" @submit.prevent="savePassword">
        <input v-model="password" type="password" placeholder="Şifre" autocomplete="current-password">
        <button>Giriş</button>
      </form>
    </section>

    <template v-if="settings">
      <!-- 1. Binance connection -->
      <section class="card">
        <h2>1. Binance bağlantısı</h2>
        <p v-if="settings.apiKeyMasked" class="saved">
          Kayıtlı anahtar: <code>{{ settings.apiKeyMasked }}</code>
          <button class="link danger" :disabled="!!busy" @click="deleteKeys">Sil</button>
        </p>
        <p v-else class="muted">
          Binance → Profil → <b>API Yönetimi</b> → <b>API Oluştur</b> → “Sistem tarafından oluşturulan”.
          Sadece <b>Spot ve Marjin Ticareti</b> iznini aç, <b>para çekmeyi açma</b>, bu bilgisayarın IP adresiyle kısıtla.
        </p>
        <form class="grid2" @submit.prevent="saveKeys">
          <label>API Key<input v-model="keyForm.apiKey" autocomplete="off" spellcheck="false" placeholder="64 karakter" required></label>
          <label>Secret Key<input v-model="keyForm.apiSecret" type="password" autocomplete="new-password" spellcheck="false" placeholder="64 karakter" required></label>
          <div class="actions">
            <button :disabled="!!busy">{{ busy === 'keys' ? 'Kaydediliyor…' : (settings.apiKeyMasked ? 'Anahtarı değiştir' : 'Anahtarı kaydet') }}</button>
            <button v-if="settings.apiKeyMasked" type="button" class="secondary" :disabled="!!busy" @click="testConn">
              {{ busy === 'test' ? 'Test ediliyor…' : 'Bağlantıyı test et' }}
            </button>
          </div>
        </form>
        <p class="muted small">Anahtar sadece bu bilgisayardaki <code>.env</code> dosyasına yazılır, hiçbir yere gönderilmez.</p>

        <div v-if="conn" class="conn" :class="conn.ok ? 'ok' : 'err'">
          <template v-if="conn.ok">
            <b>✓ Binance'e bağlandı.</b>
            <span v-if="!conn.canTrade" class="warn"> ⚠ Bu anahtarda Spot işlem izni kapalı, bot alım-satım yapamaz.</span>
            <span v-if="conn.keyCanWithdraw" class="warn"> ⚠ Bu anahtarda PARA ÇEKME izni açık. Güvenlik için Binance'ten kapat.</span>
            <span v-if="conn.ipRestricted === false" class="warn"> ⚠ Anahtar IP ile kısıtlanmamış. Binance'te bu bilgisayarın IP'sini ekle.</span>
            <table v-if="conn.balances.length">
              <thead><tr><th>Varlık</th><th>Kullanılabilir</th><th>Kilitli</th></tr></thead>
              <tbody><tr v-for="b in conn.balances" :key="b.asset"><td>{{ b.asset }}</td><td>{{ fmt(b.free, 8) }}</td><td>{{ fmt(b.locked, 8) }}</td></tr></tbody>
            </table>
            <p v-else class="muted">Hesap boş.</p>
          </template>
          <template v-else>
            <b>✗ Bağlanamadı:</b> {{ conn.error }}<br><span v-if="conn.hint">{{ conn.hint }}</span>
          </template>
        </div>
      </section>

      <!-- 2. Control -->
      <section class="card">
        <h2>2. Bot kontrol</h2>
        <div class="modes">
          <button :class="{ active: !isLive }" :disabled="!!busy || status?.running" @click="setMode(false)">Deneme modu<br><small>gerçek emir yok</small></button>
          <button :class="{ active: isLive, livebtn: true }" :disabled="!!busy || status?.running || !settings.apiKeyMasked" @click="setMode(true)">Canlı mod<br><small>gerçek para</small></button>
        </div>
        <label v-if="!isLive && settings.apiKeyMasked" class="check">
          <input v-model="liveConfirm" type="checkbox" :disabled="status?.running">
          Canlı modda botun hesabımda gerçek alım-satım yapacağını ve zarar edebileceğimi anlıyorum.
        </label>
        <p v-if="status?.running" class="muted small">Mod değiştirmek için önce botu durdur.</p>
        <div class="actions">
          <button v-if="!status?.running" class="start" :class="{ livebtn: isLive }" :disabled="!!busy" @click="start">
            ▶ {{ isLive ? 'Botu CANLI başlat' : 'Botu deneme modunda başlat' }}
          </button>
          <button v-else class="stop" :disabled="!!busy" @click="stop">■ Botu durdur</button>
        </div>
        <p v-if="status?.running" class="muted small">Başlangıç: {{ time(status.startedAt) }}</p>
      </section>

      <!-- 3. Positions & trades -->
      <section class="card">
        <h2>3. Pozisyonlar <small class="muted">({{ status?.configuredMode === 'LIVE' ? 'canlı' : 'deneme' }})</small></h2>
        <div class="stats" v-if="status">
          <div><span>Bugünkü kâr/zarar</span><b :class="(status.daily?.realized ?? 0) >= 0 ? 'pos' : 'neg'">{{ fmt(status.daily?.realized ?? 0) }} USDT</b></div>
          <div v-if="status.configuredMode === 'DRY'"><span>Sanal bakiye</span><b>{{ fmt(status.dryBalance ?? 0) }} USDT</b></div>
          <div><span>Açık pozisyon</span><b>{{ positions.length }}</b></div>
        </div>
        <table v-if="positions.length">
          <thead><tr><th>Coin</th><th>Miktar</th><th>Alış fiyatı</th><th>Kaynak</th><th>Açılış</th></tr></thead>
          <tbody>
            <tr v-for="p in positions" :key="p.symbol">
              <td>{{ p.symbol }}</td><td>{{ fmt(p.qty, 8) }}</td><td>{{ fmt(p.entryPrice, 8) }}</td><td>{{ sourceLabel(p.source) }}</td><td>{{ time(p.openedAt) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="muted">Açık pozisyon yok.</p>

        <h3>Son işlemler</h3>
        <table v-if="status?.trades?.length">
          <thead><tr><th>Zaman</th><th>Coin</th><th>Yön</th><th>Fiyat</th><th>Tutar</th><th>Kâr/Zarar</th><th>Neden</th></tr></thead>
          <tbody>
            <tr v-for="(t, i) in status.trades" :key="i">
              <td>{{ time(t.time) }}</td><td>{{ t.symbol }}</td>
              <td :class="t.side === 'BUY' ? 'pos' : 'neg'">{{ t.side === 'BUY' ? 'AL' : 'SAT' }}</td>
              <td>{{ fmt(t.price, 8) }}</td><td>{{ fmt(t.quote) }}</td>
              <td :class="(t.pnl ?? 0) >= 0 ? 'pos' : 'neg'">{{ t.pnl == null ? '—' : fmt(t.pnl) }}</td><td class="small">{{ t.reason }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="muted">Henüz işlem yok.</p>
      </section>

      <!-- 4. Log -->
      <section class="card">
        <h2>4. Bot kayıtları</h2>
        <pre ref="logBox" class="log">{{ status?.logs?.length ? status.logs.join('\n') : 'Bot başlatılınca kayıtlar burada görünür.' }}</pre>
      </section>

      <!-- 5. Settings -->
      <section class="card">
        <h2>5. Ayarlar</h2>
        <form @submit.prevent="saveSettings">
          <div class="grid3">
            <template v-for="(s, k) in (settings.schema as Record<string, any>)" :key="k">
              <label v-if="k !== 'BOT_LIVE'" :class="{ check: s.type === 'bool' }">
                <template v-if="s.type === 'bool'">
                  <input type="checkbox" :checked="form[k] === 'true'" @change="form[k] = ($event.target as HTMLInputElement).checked ? 'true' : 'false'">
                  {{ LABELS[k] ?? k }}
                </template>
                <template v-else>
                  {{ LABELS[k] ?? k }}
                  <select v-if="s.type === 'select'" v-model="form[k]"><option v-for="o in s.options" :key="o">{{ o }}</option></select>
                  <input v-else v-model="form[k]" :type="s.type === 'number' ? 'number' : 'text'" :min="s.min" :max="s.max" step="any">
                </template>
              </label>
            </template>
          </div>
          <div class="actions"><button :disabled="!!busy">{{ busy === 'settings' ? 'Kaydediliyor…' : 'Ayarları kaydet' }}</button></div>
        </form>
      </section>
    </template>
  </main>
</template>

<style>
:root { --bg: #f5f6f8; --card: #fff; --text: #1b1f24; --muted: #667085; --border: #e2e5ea; --accent: #2563eb; --pos: #0f8a4a; --neg: #c62828; --live: #d9480f; --warn-bg: #fff4e5; }
@media (prefers-color-scheme: dark) { :root { --bg: #0f1216; --card: #171b21; --text: #e6e8eb; --muted: #98a2b3; --border: #2a2f37; --accent: #4c8dff; --pos: #3ccf7c; --neg: #ff6b6b; --live: #ff8a4c; --warn-bg: #3a2a12; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 1040px; margin: 0 auto; padding: 20px 16px 60px; }
header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
h1 { font-size: 24px; margin: 0; }
h2 { font-size: 17px; margin: 0 0 12px; }
h3 { font-size: 15px; margin: 18px 0 8px; }
.card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 18px; margin-bottom: 16px; }
.muted { color: var(--muted); } .small { font-size: 13px; }
.badge { padding: 4px 12px; border-radius: 999px; font-weight: 600; font-size: 14px; border: 1px solid var(--border); }
.badge.live { color: #fff; background: var(--live); border-color: var(--live); }
.badge.dry { color: #fff; background: var(--accent); border-color: var(--accent); }
.badge.off { color: var(--muted); }
.flash { padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; font-weight: 500; }
.flash.ok { background: color-mix(in srgb, var(--pos) 15%, transparent); }
.flash.err { background: color-mix(in srgb, var(--neg) 15%, transparent); }
label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--muted); }
label.check { flex-direction: row; align-items: flex-start; gap: 8px; color: var(--text); font-size: 14px; margin: 8px 0; }
input, select { font: inherit; color: var(--text); background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; min-width: 0; }
input[type=checkbox] { width: 18px; height: 18px; margin-top: 2px; }
button { font: inherit; font-weight: 600; border: 0; border-radius: 8px; padding: 9px 16px; background: var(--accent); color: #fff; cursor: pointer; }
button:disabled { opacity: .5; cursor: not-allowed; }
button.secondary { background: transparent; color: var(--accent); border: 1px solid var(--accent); }
button.link { background: none; color: var(--accent); padding: 0 6px; }
button.danger { color: var(--neg); }
button.start { background: var(--pos); } button.stop { background: var(--neg); }
button.livebtn.start { background: var(--live); }
.row { display: flex; gap: 8px; } .row input { flex: 1; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; grid-column: 1 / -1; }
.saved { margin: 0 0 12px; }
.conn { margin-top: 12px; padding: 12px; border-radius: 8px; border: 1px solid var(--border); }
.conn.ok { border-color: var(--pos); } .conn.err { border-color: var(--neg); }
.warn { display: block; background: var(--warn-bg); padding: 6px 8px; border-radius: 6px; margin-top: 6px; }
.modes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.modes button { background: var(--bg); color: var(--text); border: 2px solid var(--border); padding: 12px; }
.modes button.active { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); }
.modes button.livebtn.active { border-color: var(--live); background: color-mix(in srgb, var(--live) 14%, transparent); }
.modes small { font-weight: 400; color: var(--muted); }
.stats { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 12px; }
.stats div { display: flex; flex-direction: column; } .stats span { font-size: 13px; color: var(--muted); } .stats b { font-size: 18px; }
.pos { color: var(--pos); } .neg { color: var(--neg); }
table { width: 100%; border-collapse: collapse; font-size: 14px; display: block; overflow-x: auto; }
th, td { text-align: left; padding: 6px 10px 6px 0; border-bottom: 1px solid var(--border); white-space: nowrap; }
th { color: var(--muted); font-weight: 500; font-size: 13px; }
.log { background: #0b0d10; color: #cfd6df; border-radius: 8px; padding: 12px; height: 300px; overflow: auto; font-size: 12.5px; margin: 0; white-space: pre-wrap; word-break: break-word; }
code { background: var(--bg); padding: 1px 5px; border-radius: 4px; font-size: 13px; }
@media (max-width: 720px) { .grid2, .grid3 { grid-template-columns: 1fr; } }
</style>

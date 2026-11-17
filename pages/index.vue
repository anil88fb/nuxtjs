<script setup lang="ts">
import 'abcjs/abcjs-audio.css'

useSeoMeta({
  title: 'Nota Okuyucu',
  description: 'Nota kağıdının fotoğrafını çek, notalar ekranda çizilsin ve çalınsın.',
})

type Recognition = {
  recognized: boolean
  title: string
  abc: string
  warnings: string[]
}

const INSTRUMENTS = [
  { label: 'Piyano', program: 0 },
  { label: 'Gitar', program: 24 },
  { label: 'Keman', program: 40 },
  { label: 'Flüt', program: 73 },
  { label: 'Klarnet', program: 71 },
  { label: 'Org', program: 19 },
]

const SAMPLE_ABC = `X:1
T:Neşeye Övgü (Beethoven)
M:4/4
L:1/8
Q:1/4=100
K:C
E2 E2 F2 G2 | G2 F2 E2 D2 | C2 C2 D2 E2 | E3 D D4 |
E2 E2 F2 G2 | G2 F2 E2 D2 | C2 C2 D2 E2 | D3 C C4 |]`

const fileInput = ref<HTMLInputElement | null>(null)
const previewUrl = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const warnings = ref<string[]>([])
const abcText = ref('')
const instrument = ref(0)
const showEditor = ref(false)

const paperEl = ref<HTMLDivElement | null>(null)
const audioEl = ref<HTMLDivElement | null>(null)

// abcjs yalnızca tarayıcıda çalışır; onMounted içinde yüklenir.
let ABCJS: typeof import('abcjs') | null = null
let synthControl: import('abcjs').SynthObjectController | null = null
let visualObj: import('abcjs').TuneObject | null = null
const audioSupported = ref(true)

onMounted(async () => {
  const mod = await import('abcjs')
  ABCJS = (mod as any).default ?? mod
  audioSupported.value = ABCJS!.synth.supportsAudio()
})

onBeforeUnmount(() => {
  synthControl?.pause()
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

function clearHighlights() {
  paperEl.value
    ?.querySelectorAll('.abcjs-highlight')
    .forEach((el) => el.classList.remove('abcjs-highlight'))
}

const cursorControl = {
  onStart: clearHighlights,
  onFinished: clearHighlights,
  onEvent(ev: import('abcjs').NoteTimingEvent) {
    if (ev.measureStart && ev.left === null) return
    clearHighlights()
    ev.elements?.forEach((group) =>
      group.forEach((el) => el.classList.add('abcjs-highlight')),
    )
  },
}

async function render() {
  if (!ABCJS || !paperEl.value || !audioEl.value) return
  const tunes = ABCJS.renderAbc(paperEl.value, abcText.value, {
    responsive: 'resize',
    add_classes: true,
    paddingleft: 0,
    paddingright: 0,
  })
  visualObj = tunes[0] ?? null
  if (!visualObj || !audioSupported.value) return

  if (!synthControl) {
    synthControl = new ABCJS.synth.SynthController()
    synthControl.load(audioEl.value, cursorControl, {
      displayLoop: true,
      displayRestart: true,
      displayPlay: true,
      displayProgress: true,
      displayWarp: true,
    })
  }
  try {
    await synthControl.setTune(visualObj, false, { program: instrument.value })
  } catch (e) {
    console.warn('Ses hazırlanamadı', e)
  }
}

// Kullanıcı ABC metnini düzenlerse kısa bir gecikmeyle yeniden çiz.
let renderTimer: ReturnType<typeof setTimeout> | undefined
watch(abcText, () => {
  clearTimeout(renderTimer)
  renderTimer = setTimeout(render, 400)
})
watch(instrument, () => render())

function pickPhoto() {
  fileInput.value?.click()
}

// Görseli tarayıcıda küçültüp JPEG'e çevirir (yükleme süresini ve maliyeti düşürür).
async function compressImage(file: File): Promise<{ data: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file)
  const maxSide = 2000
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const dataUrl = canvas.toDataURL('image/jpeg', 0.88)
  return { data: dataUrl.split(',')[1]!, mediaType: 'image/jpeg' }
}

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  ;(e.target as HTMLInputElement).value = ''

  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(file)
  error.value = null
  warnings.value = []
  loading.value = true
  synthControl?.pause()

  try {
    const { data, mediaType } = await compressImage(file)
    const result = await $fetch<Recognition>('/api/recognize', {
      method: 'POST',
      body: { image: data, mediaType },
    })
    warnings.value = result.warnings ?? []
    if (!result.recognized || !result.abc.trim()) {
      error.value = 'Bu fotoğrafta nota bulunamadı. Notaları düz ve net çekip tekrar dene.'
      return
    }
    abcText.value = result.abc
    await nextTick()
    await render()
  } catch (err: any) {
    error.value =
      err?.data?.statusMessage ?? err?.statusMessage ?? 'Bir hata oluştu, tekrar dene.'
  } finally {
    loading.value = false
  }
}

async function loadSample() {
  error.value = null
  warnings.value = []
  abcText.value = SAMPLE_ABC
  await nextTick()
  await render()
}
</script>

<template>
  <main class="page">
    <header class="hero">
      <h1>Nota Okuyucu</h1>
      <p>Nota kağıdının fotoğrafını çek. Notalar ekranda çizilir ve çalınır.</p>
    </header>

    <section class="card">
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        @change="onFileChange"
      />
      <div class="actions">
        <button class="primary" :disabled="loading" @click="pickPhoto">
          {{ loading ? 'Notalar okunuyor… (10–30 sn)' : '📷 Fotoğraf çek / seç' }}
        </button>
        <button class="ghost" :disabled="loading" @click="loadSample">Örnek notayı dene</button>
      </div>
      <p class="hint">
        İpucu: Kağıdı düz bir yüzeye koy, gölge düşürme ve porteleri yatay tut. En iyi sonuç
        basılı notalarda alınır; el yazısı notalar hatalı okunabilir.
      </p>

      <div v-if="previewUrl" class="preview">
        <img :src="previewUrl" alt="Çekilen nota fotoğrafı" />
        <div v-if="loading" class="scanning" aria-hidden="true" />
      </div>
    </section>

    <p v-if="error" class="alert error" role="alert">{{ error }}</p>

    <section v-show="abcText" class="card">
      <div class="toolbar">
        <label>
          Enstrüman
          <select v-model.number="instrument">
            <option v-for="i in INSTRUMENTS" :key="i.program" :value="i.program">
              {{ i.label }}
            </option>
          </select>
        </label>
        <button class="ghost" @click="showEditor = !showEditor">
          {{ showEditor ? 'Düzenleyiciyi gizle' : 'Notayı düzelt' }}
        </button>
      </div>

      <div ref="audioEl" class="audio" />
      <p v-if="!audioSupported" class="alert warn">Bu tarayıcı ses çalmayı desteklemiyor.</p>

      <div ref="paperEl" class="paper" />

      <ul v-if="warnings.length" class="alert warn">
        <li v-for="(w, i) in warnings" :key="i">{{ w }}</li>
      </ul>

      <div v-if="showEditor" class="editor">
        <label for="abc">ABC notasyonu (değiştirdiğinde nota yeniden çizilir)</label>
        <textarea id="abc" v-model="abcText" rows="10" spellcheck="false" />
      </div>
    </section>
  </main>
</template>

<style scoped>
.page {
  max-width: 820px;
  margin: 0 auto;
  padding: 24px 16px 64px;
}

.hero h1 {
  margin: 0 0 4px;
  font-size: 1.9rem;
}
.hero p {
  margin: 0 0 20px;
  color: var(--muted);
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 16px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

button {
  font: inherit;
  border-radius: 10px;
  padding: 10px 16px;
  cursor: pointer;
  border: 1px solid var(--border);
}
button:disabled {
  opacity: 0.6;
  cursor: progress;
}
.primary {
  background: var(--accent);
  color: var(--accent-text);
  border-color: var(--accent);
  font-weight: 600;
}
.ghost {
  background: transparent;
  color: var(--text);
}

.hint {
  margin: 12px 0 0;
  font-size: 0.9rem;
  color: var(--muted);
}

.preview {
  position: relative;
  margin-top: 14px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.preview img {
  display: block;
  width: 100%;
  max-height: 340px;
  object-fit: contain;
  background: var(--bg);
}
.scanning {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    color-mix(in srgb, var(--accent) 35%, transparent) 50%,
    transparent 100%
  );
  background-size: 100% 40%;
  background-repeat: no-repeat;
  animation: scan 1.6s linear infinite;
}
@keyframes scan {
  from {
    background-position: 0 -40%;
  }
  to {
    background-position: 0 140%;
  }
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.toolbar label {
  display: flex;
  align-items: center;
  gap: 8px;
}
select {
  font: inherit;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}

.paper {
  background: #fff;
  border-radius: 10px;
  padding: 8px;
  margin-top: 12px;
  overflow-x: auto;
}
.paper :deep(.abcjs-highlight) {
  fill: var(--note-highlight);
}

.alert {
  border-radius: 10px;
  padding: 10px 14px;
  margin: 12px 0 0;
}
ul.alert {
  padding-left: 30px;
}
.error {
  background: var(--error-bg);
  color: var(--error-text);
}
.warn {
  background: var(--warn-bg);
  color: var(--warn-text);
}

.editor {
  margin-top: 14px;
}
.editor label {
  display: block;
  font-size: 0.9rem;
  color: var(--muted);
  margin-bottom: 6px;
}
textarea {
  width: 100%;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 0.9rem;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
}
</style>

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

// Kamera fotoğrafındaki nota kağıdını, sunucuda çalışan açık kaynak
// nota tanıma (OMR) modeli homr ile okur. API anahtarı gerekmez.
// homr MusicXML üretir; bunu abcjs'in çizip çalabileceği ABC notasyonuna çeviririz.

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const MAX_BASE64_LENGTH = 14_000_000 // ~10 MB
const TIMEOUT_MS = 180_000

function homrBinary() {
  if (process.env.HOMR_BIN) return process.env.HOMR_BIN
  const local = resolve(process.cwd(), '.venv-omr/bin/homr')
  return existsSync(local) ? local : 'homr'
}

// homr CPU'yu yoğun kullanır; aynı anda tek fotoğraf işlenir, diğerleri sıraya girer.
let queue: Promise<unknown> = Promise.resolve()
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job)
  queue = run.catch(() => {})
  return run
}

function runHomr(imagePath: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(homrBinary(), [imagePath], { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (d) => (stderr = (stderr + d).slice(-4000)))
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error('homr zaman aşımına uğradı'))
    }, TIMEOUT_MS)
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolvePromise()
      else reject(new Error(`homr ${code} koduyla çıktı: ${stderr}`))
    })
  })
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ image?: string; mediaType?: string }>(event)
  const image = body?.image
  const ext = body?.mediaType ? ALLOWED_TYPES[body.mediaType] : undefined

  if (!image || typeof image !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Görsel eksik.' })
  }
  if (!ext) {
    throw createError({ statusCode: 400, statusMessage: 'Desteklenmeyen görsel türü.' })
  }
  if (image.length > MAX_BASE64_LENGTH) {
    throw createError({ statusCode: 413, statusMessage: 'Görsel çok büyük.' })
  }

  const dir = await mkdtemp(join(tmpdir(), 'nota-'))
  try {
    const imagePath = join(dir, `nota.${ext}`)
    await writeFile(imagePath, Buffer.from(image, 'base64'))

    try {
      await enqueue(() => runHomr(imagePath))
    } catch (err: any) {
      console.error('Nota tanıma hatası', err)
      if (err?.code === 'ENOENT') {
        throw createError({
          statusCode: 500,
          statusMessage: 'Nota tanıma motoru kurulu değil. Sunucuda "pnpm setup:omr" çalıştırın.',
        })
      }
      throw createError({
        statusCode: 422,
        statusMessage: 'Fotoğrafta porte bulunamadı. Notaları düz, net ve tam kadrajda çekip tekrar dene.',
      })
    }

    const xmlPath = join(dir, 'nota.musicxml')
    if (!existsSync(xmlPath)) {
      return { recognized: false, title: '', abc: '', warnings: ['Fotoğrafta nota bulunamadı.'] }
    }

    const { abc, noteCount, title } = musicXmlToAbc(await readFile(xmlPath, 'utf8'))
    if (!noteCount) {
      return { recognized: false, title, abc: '', warnings: ['Fotoğrafta nota bulunamadı.'] }
    }
    return {
      recognized: true,
      title,
      abc,
      warnings: [] as string[],
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

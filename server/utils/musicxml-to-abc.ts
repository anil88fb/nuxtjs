import { XMLParser } from 'fast-xml-parser'

// MusicXML (homr çıktısı) → ABC notasyonu dönüştürücü.
// Desteklenenler: tonalite, ölçü, anahtar, notalar, suslar, akorlar, bağlar,
// arızalar, üçlemeler, süslemeler (grace), tekrar işaretleri, birden çok porte/ses.

type Node = Record<string, any>

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '',
  commentPropName: '#comment',
  parseTagValue: false,
  trimValues: true,
})

const tagOf = (n: Node) => Object.keys(n).find((k) => k !== ':@')!
const childrenOf = (n: Node): Node[] => n[tagOf(n)] ?? []
const attrsOf = (n: Node): Record<string, string> => n[':@'] ?? {}
const kids = (n: Node, tag: string) => childrenOf(n).filter((c) => tagOf(c) === tag)
const kid = (n: Node, tag: string) => kids(n, tag)[0]
function text(n: Node | undefined): string | undefined {
  if (!n) return undefined
  const t = childrenOf(n).find((c) => '#text' in c)
  return t ? String(t['#text']) : undefined
}
const textOf = (n: Node, path: string[]): string | undefined => {
  let cur: Node | undefined = n
  for (const p of path) cur = cur && kid(cur, p)
  return text(cur)
}

const MAJOR_KEYS = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#']
const MINOR_KEYS = ['Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#']
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B']
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F']

function keyName(fifths: number, mode?: string) {
  const i = Math.max(-7, Math.min(7, fifths)) + 7
  return mode === 'minor' ? `${MINOR_KEYS[i]}m` : MAJOR_KEYS[i]!
}

function keyAlters(fifths: number): Record<string, number> {
  const alters: Record<string, number> = {}
  if (fifths > 0) SHARP_ORDER.slice(0, fifths).forEach((s) => (alters[s] = 1))
  if (fifths < 0) FLAT_ORDER.slice(0, -fifths).forEach((s) => (alters[s] = -1))
  return alters
}

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a
}

// Süreyi (L:1/16 birimiyle) ABC uzunluk ekine çevirir: 1→"", 2→"2", 1/2→"/2", 3/2→"3/2"
function lengthSuffix(num: number, den: number) {
  const g = gcd(num, den) || 1
  num /= g
  den /= g
  if (den === 1) return num === 1 ? '' : String(num)
  if (num === 1) return den === 2 ? '/' : `/${den}`
  return `${num}/${den}`
}

function abcPitch(step: string, octave: number) {
  if (octave >= 5) return step.toLowerCase() + "'".repeat(octave - 5)
  return step.toUpperCase() + ','.repeat(Math.max(0, 4 - octave))
}

function accidentalSign(alter: number) {
  return { [-2]: '__', [-1]: '_', 0: '=', 1: '^', 2: '^^' }[alter] ?? ''
}

function clefName(sign?: string, line?: string) {
  if (sign === 'F') return 'bass'
  if (sign === 'C') return line === '4' ? 'tenor' : 'alto'
  return 'treble'
}

type VoiceKey = string // `${staff}-${voice}`

interface Token {
  // ABC parçası ve (ölçü içi) zaman konumu — eksik zamanları "x" ile doldurmak için
  abc: string
  start: number
  dur: number
}

export interface AbcResult {
  abc: string
  noteCount: number
  title: string
}

export function musicXmlToAbc(xml: string, fallbackTitle = ''): AbcResult {
  const doc = parser.parse(xml) as Node[]
  const score = doc.find((n) => tagOf(n) === 'score-partwise')
  if (!score) throw new Error('score-partwise bulunamadı (yalnızca partwise MusicXML desteklenir)')

  const title = (
    textOf(score, ['work', 'work-title']) ??
    textOf(score, ['movement-title']) ??
    fallbackTitle
  ).trim()

  // Basitlik için ilk part'ı al (homr tek part üretir; çok porteli piyano = staff 1/2)
  const part = kid(score, 'part')
  if (!part) throw new Error('part bulunamadı')
  const measures = kids(part, 'measure')

  // L:1/16 → bir dörtlük = 4 birim
  const UNIT_PER_QUARTER = 4
  let divisions = 1
  let fifths = 0
  let mode: string | undefined
  let beats = 4
  let beatType = 4
  const clefs: Record<number, string> = {}

  const voices = new Map<VoiceKey, { staff: number; measures: Token[][] }>()
  const measureLengths: number[] = []
  const measurePrefix: string[] = [] // inline [K:] [M:] değişimleri
  const measureStartBar: string[] = []
  const measureEndBar: string[] = []
  let noteCount = 0
  let headerFifths: number | undefined
  let headerTime: string | undefined

  measures.forEach((measure, mi) => {
    let time = 0 // divisions cinsinden
    let maxTime = 0
    const accidentals: Record<string, number> = {} // "C4" → alter (ölçü boyunca geçerli)
    let lastToken: { key: VoiceKey; token: Token } | null = null
    let inlineChanges = ''
    let tupletRemaining = 0
    let startBar = ''
    let endBar = ''

    for (const el of childrenOf(measure)) {
      const tag = tagOf(el)

      if (tag === 'attributes') {
        const d = textOf(el, ['divisions'])
        if (d) divisions = Number(d)
        const keyEl = kid(el, 'key')
        if (keyEl) {
          const f = Number(textOf(keyEl, ['fifths']) ?? 0)
          mode = textOf(keyEl, ['mode'])
          if (headerFifths === undefined) headerFifths = f
          else if (f !== fifths) inlineChanges += `[K:${keyName(f, mode)}]`
          fifths = f
        }
        const timeEl = kid(el, 'time')
        if (timeEl) {
          const b = Number(textOf(timeEl, ['beats']) ?? 4)
          const bt = Number(textOf(timeEl, ['beat-type']) ?? 4)
          const t = `${b}/${bt}`
          if (headerTime === undefined) headerTime = t
          else if (b !== beats || bt !== beatType) inlineChanges += `[M:${t}]`
          beats = b
          beatType = bt
        }
        for (const c of kids(el, 'clef')) {
          const n = Number(attrsOf(c).number ?? 1)
          clefs[n] ??= clefName(textOf(c, ['sign']), textOf(c, ['line']))
        }
        continue
      }

      if (tag === 'backup') {
        time -= Number(textOf(el, ['duration']) ?? 0)
        continue
      }
      if (tag === 'forward') {
        time += Number(textOf(el, ['duration']) ?? 0)
        maxTime = Math.max(maxTime, time)
        continue
      }

      if (tag === 'barline') {
        const repeat = kid(el, 'repeat')
        const dir = repeat && attrsOf(repeat).direction
        const loc = attrsOf(el).location ?? 'right'
        if (dir === 'forward') startBar = '|:'
        else if (dir === 'backward') endBar = ':|'
        else if (loc === 'right' && textOf(el, ['bar-style']) === 'light-heavy') endBar = '|]'
        const ending = kid(el, 'ending')
        if (ending && attrsOf(ending).type === 'start' && loc === 'left') {
          startBar = (startBar || '|') + `[${attrsOf(ending).number ?? '1'}`
        }
        continue
      }

      if (tag !== 'note') continue

      const isChord = !!kid(el, 'chord')
      const isGrace = !!kid(el, 'grace')
      const isRest = !!kid(el, 'rest')
      const staff = Number(textOf(el, ['staff']) ?? 1)
      const voice = textOf(el, ['voice']) ?? '1'
      const key: VoiceKey = `${staff}-${voice}`
      const duration = Number(textOf(el, ['duration']) ?? 0)

      if (!voices.has(key)) voices.set(key, { staff, measures: [] })
      const v = voices.get(key)!
      const bucket = (v.measures[mi] ??= [])

      // Perde
      let pitchStr = ''
      if (!isRest) {
        const step = textOf(el, ['pitch', 'step']) ?? 'C'
        const octave = Number(textOf(el, ['pitch', 'octave']) ?? 4)
        const alter = Number(textOf(el, ['pitch', 'alter']) ?? 0)
        const id = `${step}${octave}`
        const expected = accidentals[id] ?? keyAlters(fifths)[step] ?? 0
        let acc = ''
        if (alter !== expected) {
          acc = accidentalSign(Math.round(alter))
          accidentals[id] = alter
        }
        pitchStr = acc + abcPitch(step, octave)
        noteCount++
      }

      const tie = kids(el, 'tie').some((t) => attrsOf(t).type === 'start') ? '-' : ''

      if (isGrace) {
        bucket.push({ abc: `{${pitchStr}}`, start: time, dur: 0 })
        continue
      }

      // Üçleme vb.: görüntülenen (normal) süreyi yaz, "(3" ile işaretle
      let shownDuration = duration
      let tupletPrefix = ''
      const tm = kid(el, 'time-modification')
      if (tm && !isChord) {
        const actual = Number(textOf(tm, ['actual-notes']) ?? 1)
        const normal = Number(textOf(tm, ['normal-notes']) ?? 1)
        shownDuration = (duration * actual) / normal
        if (tupletRemaining === 0) {
          tupletPrefix = `(${actual}`
          tupletRemaining = actual
        }
        tupletRemaining--
      } else if (tm && isChord) {
        const actual = Number(textOf(tm, ['actual-notes']) ?? 1)
        const normal = Number(textOf(tm, ['normal-notes']) ?? 1)
        shownDuration = (duration * actual) / normal
      }

      // divisions → L:1/16 birimi (kesirli olabilir)
      const num = Math.round(shownDuration * UNIT_PER_QUARTER * 1000)
      const len = lengthSuffix(num, divisions * 1000)

      if (isChord && lastToken && lastToken.key === key) {
        // Önceki notayı akora çevir: [CE]2
        const t = lastToken.token
        const m = t.abc.match(/^(\(\d)?(\[?)([^\]\-]*?)(\]?)([\d/]*)(-?)$/)
        if (m) {
          const [, tp = '', , inner = '', , l = '', tiePrev = ''] = m
          t.abc = `${tp}[${inner}${pitchStr}]${l}${tiePrev || tie}`
        }
        continue
      }

      const token: Token = {
        abc: `${tupletPrefix}${isRest ? 'z' : pitchStr}${len}${tie}`,
        start: time,
        dur: duration,
      }
      bucket.push(token)
      lastToken = { key, token }
      time += duration
      maxTime = Math.max(maxTime, time)
    }

    const fullMeasure = (beats * 4 * divisions) / beatType
    // Eksik ilk ölçü (anacrouse) kendi uzunluğunu korur; diğerleri tam ölçü kadar doldurulur
    measureLengths[mi] = mi === 0 ? maxTime || fullMeasure : Math.max(maxTime, fullMeasure)
    measurePrefix[mi] = inlineChanges
    measureStartBar[mi] = startBar
    measureEndBar[mi] = endBar
  })

  if (noteCount === 0) return { abc: '', noteCount: 0, title }

  // Sesleri sırala: önce porte, sonra ses numarası
  const voiceKeys = [...voices.keys()].sort((a, b) => {
    const [sa, va] = a.split('-').map(Number)
    const [sb, vb] = b.split('-').map(Number)
    return sa! - sb! || va! - vb!
  })

  const lines: string[] = [
    'X:1',
    `T:${title || 'Okunan Nota'}`,
    `M:${headerTime ?? '4/4'}`,
    'L:1/16',
    'Q:1/4=100',
  ]
  const multi = voiceKeys.length > 1
  if (multi) {
    // Piyano gibi çok porteli eserlerde porteleri süslü parantezle birleştir
    lines.push(`%%score {${voiceKeys.map((_, i) => `V${i + 1}`).join(' | ')}}`)
  }
  lines.push(`K:${keyName(headerFifths ?? 0, mode)}${!multi ? ` clef=${clefs[1] ?? 'treble'}` : ''}`)

  const MEASURES_PER_LINE = 4
  voiceKeys.forEach((vk, vi) => {
    const v = voices.get(vk)!
    if (multi) {
      lines.push(`V:V${vi + 1} clef=${clefs[v.staff] ?? (v.staff > 1 ? 'bass' : 'treble')}`)
    }
    let line = ''
    measures.forEach((_, mi) => {
      const toks = (v.measures[mi] ?? []).slice().sort((a, b) => a.start - b.start)
      let cursor = 0
      let body = ''
      for (const t of toks) {
        if (t.start > cursor) {
          const gap = Math.round((t.start - cursor) * UNIT_PER_QUARTER * 1000)
          body += `x${lengthSuffix(gap, divisions * 1000)} `
        }
        body += t.abc + ' '
        cursor = Math.max(cursor, t.start + t.dur)
      }
      const total = measureLengths[mi]!
      if (cursor < total) {
        const gap = Math.round((total - cursor) * UNIT_PER_QUARTER * 1000)
        body += `x${lengthSuffix(gap, divisions * 1000)} `
      }
      const isLast = mi === measures.length - 1
      const end = measureEndBar[mi] || (isLast ? '|]' : '|')
      line += `${measureStartBar[mi] ?? ''}${measurePrefix[mi] ?? ''} ${body.trim()} ${end}`
      if ((mi + 1) % MEASURES_PER_LINE === 0 || isLast) {
        lines.push(line.trim())
        line = ''
      }
    })
  })

  return { abc: lines.join('\n') + '\n', noteCount, title }
}

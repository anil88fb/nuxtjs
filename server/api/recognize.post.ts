import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'

// Kamera fotoğrafındaki nota kağıdını ABC notasyonuna çeviren uç nokta.
// ABC notasyonu tarayıcıda abcjs ile hem çizilir hem çalınır.

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
type AllowedType = (typeof ALLOWED_TYPES)[number]

// ~5 MB base64 (istemci görseli zaten küçültüyor)
const MAX_BASE64_LENGTH = 7_000_000

const SheetMusicSchema = z.object({
  recognized: z
    .boolean()
    .describe('Görselde okunabilir nota (porte üzerinde müzik notası) varsa true'),
  title: z.string().describe('Eserin adı; görselde yoksa boş string'),
  abc: z
    .string()
    .describe('Tam ABC notasyonu (X:, T:, M:, L:, Q:, K: başlıkları dahil). recognized false ise boş string'),
  warnings: z
    .array(z.string())
    .describe('Okunamayan ya da emin olunmayan yerler hakkında kısa Türkçe notlar'),
})

const SYSTEM_PROMPT = `Sen bir optik nota tanıma (OMR) uzmanısın. Kullanıcı bir nota kağıdının fotoğrafını gönderir; görevin bu notayı ABC notasyonu standardı (v2.1) ile birebir yazıya dökmektir.

Kurallar:
- Başlıkları her zaman yaz: X:1, T: (başlık), M: (ölçü), L: (varsayılan nota uzunluğu), Q: (tempo, yoksa 1/4=100), K: (donanım/tonalite).
- Donanımı (diyez/bemol sayısını) ve anahtarı dikkatle oku. Fa anahtarıyla yazılmış partilerde K: satırına "clef=bass" ekle.
- Notaları, süreleri, noktalı değerleri, bağları, sus işaretlerini, arızaları (^ = _) ve ölçü çizgilerini doğru aktar. Tekrar işaretlerini (|: :|) ve volta parantezlerini koru.
- Birden fazla porte aynı anda çalınıyorsa (ör. piyano sağ/sol el) V:1, V:2 sesleriyle yaz.
- Şarkı sözü varsa w: satırlarıyla ekle.
- Fotoğraf eğik, bulanık ya da kısmen kesikse okuyabildiğin kadarını yaz ve emin olmadığın yerleri warnings alanında Türkçe olarak belirt (ör. "3. ölçüdeki nota la veya si olabilir").
- Görselde müzik notası yoksa recognized=false ver, abc boş olsun ve warnings içinde ne gördüğünü kısaca açıkla.
- Çıktı yalnızca ABC notasyonu olsun; açıklama metnini abc alanına koyma.`

let client: Anthropic | null = null
function getClient() {
  client ??= new Anthropic()
  return client
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ image?: string; mediaType?: string }>(event)

  const image = body?.image
  const mediaType = body?.mediaType as AllowedType | undefined

  if (!image || typeof image !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Görsel eksik.' })
  }
  if (!mediaType || !ALLOWED_TYPES.includes(mediaType)) {
    throw createError({ statusCode: 400, statusMessage: 'Desteklenmeyen görsel türü.' })
  }
  if (image.length > MAX_BASE64_LENGTH) {
    throw createError({ statusCode: 413, statusMessage: 'Görsel çok büyük.' })
  }

  try {
    const response = await getClient().beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'high',
        format: betaZodOutputFormat(SheetMusicSchema),
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: 'Bu fotoğraftaki notayı ABC notasyonuna çevir.' },
          ],
        },
      ],
    })

    if (response.stop_reason === 'refusal') {
      throw createError({ statusCode: 422, statusMessage: 'Bu görsel işlenemedi.' })
    }
    if (response.stop_reason === 'max_tokens') {
      throw createError({
        statusCode: 422,
        statusMessage: 'Nota çok uzun; lütfen sayfanın bir bölümünü çekin.',
      })
    }

    const parsed = response.parsed_output
    if (!parsed) {
      throw createError({ statusCode: 502, statusMessage: 'Yanıt çözümlenemedi.' })
    }
    return parsed
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Sunucuda ANTHROPIC_API_KEY tanımlı değil ya da geçersiz.',
      })
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw createError({ statusCode: 429, statusMessage: 'Çok fazla istek; biraz sonra tekrar deneyin.' })
    }
    if (error instanceof Anthropic.APIError) {
      console.error('Anthropic API hatası', error.status, error.message)
      throw createError({ statusCode: 502, statusMessage: 'Nota tanıma servisine ulaşılamadı.' })
    }
    // Kendi fırlattığımız createError hatalarını olduğu gibi ilet.
    if (isError(error)) throw error
    // Ör. hiç kimlik bilgisi tanımlı değilse SDK istek göndermeden hata verir.
    console.error('Nota tanıma hatası', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Sunucu yapılandırması eksik (ANTHROPIC_API_KEY tanımlı mı?).',
    })
  }
})

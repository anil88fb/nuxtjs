# Nota Okuyucu

Nota kağıdının fotoğrafını telefon kamerasıyla çek; notalar ekranda yeniden çizilir ve seçtiğin enstrümanla çalınır.

## Nasıl çalışır?

1. `pages/index.vue` fotoğrafı tarayıcıda küçültür ve `/api/recognize` uç noktasına gönderir.
2. `server/api/recognize.post.ts` görseli sunucuda çalışan açık kaynak nota tanıma motoru [homr](https://github.com/liebharc/homr) ile okur. **API anahtarı gerekmez, ücretsizdir.**
3. homr'un ürettiği MusicXML, `server/utils/musicxml-to-abc.ts` ile [ABC notasyonuna](https://abcnotation.com/wiki/abc:standard:v2.1) çevrilir.
4. [abcjs](https://www.abcjs.net/) ABC metnini porte üzerine çizer ve çalar. Çalan nota renklenir; tempo ve enstrüman değiştirilebilir.
5. Okuma hatası olursa "Notayı düzelt" ile ABC metni elle düzenlenebilir.

## Kurulum (bir kerelik)

1. **Node.js** kur: https://nodejs.org (LTS sürümü). Ardından terminalde `npm install -g pnpm` çalıştır.
2. **Python 3.10+** kur: https://www.python.org/downloads/
   Windows'ta kurulumun ilk ekranında **"Add Python to PATH"** kutusunu işaretle.
3. Proje klasöründe terminal açıp şunları çalıştır:

```bash
pnpm install
pnpm setup:omr   # nota tanıma motoru homr'u kurar ve modelleri (~80 MB) indirir
```

## Kullanım

**Sadece bilgisayardan:**

```bash
pnpm dev
```

Tarayıcıda http://localhost:3000 adresini aç.

**Telefonun kamerasıyla:** (telefon ve bilgisayar aynı Wi-Fi ağında olmalı)

```bash
pnpm dev:telefon
```

Terminalde çıkan **Network** adresini (ör. `http://192.168.1.20:3000`) telefonun tarayıcısında aç ya da terminaldeki QR kodu telefonla okut. "📷 Fotoğraf çek / seç" butonu telefonun kamerasını açar.

> Windows ilk çalıştırmada güvenlik duvarı izni sorarsa "Özel ağlar" için izin ver; yoksa telefon bilgisayara bağlanamaz.

## Bilinmesi gerekenler

- Bir fotoğrafın okunması bilgisayarın hızına göre yaklaşık 10–30 saniye sürer.
- En iyi sonuç basılı notalarda alınır; el yazısı notalar hatalı okunabilir. Hataları "Notayı düzelt" ile düzeltebilirsin.
- homr başka bir yerde kuruluysa yolunu `HOMR_BIN` ortam değişkeniyle verebilirsin.
- Kurulum yapmadan da "Örnek notayı dene" butonuyla çizim ve çalma kısmı denenebilir.

---

# Nuxt Example

Deploy your [Nuxt](https://nuxt.com) project to Vercel with zero configuration.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/nuxtjs&template=nuxtjs)

_Live Example: https://nuxtjs-template.vercel.app_

Look at the [Nuxt 3 documentation](https://v3.nuxtjs.org) to learn more.

## Setup

Make sure to install the dependencies:

```bash
# yarn
yarn

# npm
npm install

# pnpm
pnpm install --shamefully-hoist
```

## Development Server

Start the development server on http://localhost:3000

```bash
npm run dev
```

## Production

Build the application for production:

```bash
npm run build
```

Locally preview production build:

```bash
npm run preview
```

Checkout the [deployment documentation](https://nuxt.com/docs/getting-started/deployment#presets) for more information.

# Nota Okuyucu

Nota kağıdının fotoğrafını telefon kamerasıyla çek; notalar ekranda yeniden çizilir ve seçtiğin enstrümanla çalınır.

## Nasıl çalışır?

1. `pages/index.vue` fotoğrafı tarayıcıda küçültür ve `/api/recognize` uç noktasına gönderir.
2. `server/api/recognize.post.ts` görseli Claude'a (`claude-opus-5-5`) yollar ve notayı [ABC notasyonu](https://abcnotation.com/wiki/abc:standard:v2.1) olarak geri alır.
3. [abcjs](https://www.abcjs.net/) ABC metnini porte üzerine çizer ve çalar. Çalan nota renklenir; tempo ve enstrüman değiştirilebilir.
4. Okuma hatası olursa "Notayı düzelt" ile ABC metni elle düzenlenebilir.

## Kurulum

```bash
pnpm install
cp .env.example .env   # ANTHROPIC_API_KEY değerini doldur
pnpm dev
```

API anahtarı olmadan da "Örnek notayı dene" butonuyla çizim ve çalma kısmı denenebilir.

> Not: Fotoğraf tanıma sunucu tarafında çalıştığı için uygulama `nuxt generate` ile statik olarak değil, sunuculu (`nuxt build`) yayınlanmalıdır.

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

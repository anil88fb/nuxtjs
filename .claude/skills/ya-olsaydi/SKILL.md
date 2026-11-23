---
name: ya-olsaydi
description: "Ya Olsaydı?" YouTube kanalı için Tuhaf Tahsin'li yeni bölüm üretir: fikir, Türkçe senaryo, Speko seslendirmesi, cizgi-short ile animasyon, bitmiş 9:16 MP4 ve yükleme paketi (kapak, başlık, açıklama). "Yeni bölüm", "Ya Olsaydı videosu", "Tahsin'li video", "kanal için video yap" isteklerinde kullan.
---

# Tuhaf Tahsin · bölüm üretimi

Kanal: **Tuhaf Tahsin** (YouTube `UC5BffrS1Ug88Pzo4_MTBsxg`), seri adı **Ya Olsaydı?** Türkçe, dikey (9:16) animasyonlu "ya … olsaydı?" hikâyeleri.
Ana karakter: **Tuhaf Tahsin**. Her bölümde aynı görünür; yan karakterler, mekân ve renkler
hikâyeye göre değişir. Üretim tamamen bu oturumda yapılır: senaryo burada yazılır, ses
Speko ile üretilir, video `cizgi-short` kitiyle çizilir.

Bu skill, `cizgi-short` skill'inin üzerine kurulur. Motor API'si, kurulum, zamanlama, render
ve ses mikslemesi için `.claude/skills/cizgi-short/SKILL.md` geçerlidir. Burada sadece kanala
özel kurallar ve akış var. İkisi çelişirse kanal kuralları kazanır.

## Sabitler (değiştirme)

- **Tahsin'in görünümü:** `tahsin.js` içindeki `TAHSIN` spec'i. Projeye kopyala, değiştirmeden
  kullan. Referans: `tahsin-referans.jpg`. Kontak sayfasında Tahsin bu görsele benzemiyorsa
  (saç rengi, gözlük, önlük, turkuaz gömlek) render'dan önce düzelt.
- **Kişilik:** Meraklı, aceleci, iyi niyetli genç mucit. Her şeyi kurcalar, sonuçlarını sonra
  düşünür. Utanınca omuz silker ve terler (`face: "nervous", arms: "shrug", sweat: true`).
  Fikir bulunca parmağını kaldırır (`fx: idea`). İmza aksesuarı büyüteç.
- **Konuşmaz.** Bütün hikâyeyi anlatıcı anlatır. Karakterler sadece mimik ve jestle tepki verir
  (`talk: 0`). Konuşma balonu yok.
- **Anlatıcı sesi (2026-11-23'ten itibaren):** Speko üzerinden xAI **Cosmo** (`voice: "cosmo"`, sağlayıcı `xai`).
  Canlı, samimi erkek ses; Türkçe telaffuzu doğrulandı. ElevenLabs KULLANILMAZ (bulut görevlerinde indirilemiyor).
  Sıcak, enerjik, İstanbul Türkçesi. Her bölümde aynı ses.
- **Görsel stil:** Düz 2D karakterler, boyalı dokulu 3D dünya (cizgi-short'un varsayılanı).
  Beyaz yuvarlak yüzler kanalın imzası: yan karakterlere de `skin: "#ffffff"` ver.
- **Format:** 1080x1920, 30 fps. Varsayılan süre **30-40 sn**.

## Aşama 1: Süre ve fikir

Önce `bolumler.md` dosyasını oku: önceki fikirleri ve mekânları tekrar etme.

Tek mesajda sor (AskUserQuestion varsa onunla):
- **Süre:** 30 sn (varsayılan) · 45 sn · 60 sn.
- **Fikir:** "Kendi fikrim var" ya da "10 fikir öner".

Kullanıcı kendi fikrini verirse merkezindeki olayları ve sonunu koru.

**10 fikir** önerirken her biri için: kısa başlık ("Ya … olsaydı?" kalıbı tercih edilir), tek
cümlelik kanca, tek satır ters köşe son. Kurallar:
- Tahsin her fikrin merkezinde: bir şey icat eder, bulur ya da kurcalar ve sonuçlarıyla
  uğraşır.
- Konular: hayalî icatlar, tuhaf kurallar, gündelik nesnelerin beklenmedik güçleri, istenmeyen
  sonuçlar, görsel ters köşeler.
- Çeşitlilik: hepsi düğme, ayna ya da zaman durdurma olmasın. Korku ve kan yok.
- Mekânı değiştir: atölye, mahalle, okul, market, sahil, dağ evi, uzay istasyonu, çarşı, vapur...
- Her fikir basit şekillerle ve okunaklı fiziksel hareketlerle canlandırılabilmeli.
- Hayalî olayı bilimsel gerçek gibi sunma; uydurma bilim "ya olsaydı" çerçevesinde kalır.

## Aşama 2: Senaryo

cizgi-short Aşama 3'teki formülü kullan: kanca → zemin → tırmanış → dönüş → ters köşe.
Türkçede ~2,6 kelime/sn: 30 sn ≈ 75 kelime, 45 sn ≈ 115, 60 sn ≈ 155.

- İlk cümle "Ya … olsaydı?" sorusu ya da onun cevabı olsun. Bu kanalın imzası.
- Anlatıcı Tahsin'den üçüncü şahısla söz eder ("Tahsin bir sabah…").
- Son cümle kısa, ironik bir ters köşe olsun. Kanalın kapanışı:
  **"Peki sen olsan ne yapardın?"** Bu son cümle yorumu tetikler, her bölümde kullan.

Kullanıcıya gönder: kopyalanabilir senaryo, kelime sayısı, tahmini süre ve tek paragraf
görsel plan. Onay ya da düzeltme bekle. Bu, akıştaki son onay noktası.

## Aşama 3: Seslendirme (Speko · xAI Cosmo)

Onaydan sonra Speko `audio_synthesize` ile seslendir:
```json
{"text": "<etiketsiz senaryo>", "intent": {"language": "tr"}, "voice": "cosmo",
 "constraints": {"allowedProviders": {"tts": ["xai"]}}}
```
- Sonuç büyükse araç sesi bir `.wav` dosyasına kaydeder ve yolunu yazar ("Binary content (audio/wav) saved to ...");
  o dosyayı `work/voice.wav` olarak kopyala (ya da sonuçtaki imzalı `url`'den 15 dk içinde indir).
- Tek üretim yap, aynı metni tekrar üretme. `script.txt` etiketsiz düz metin olmalı (ses etiketleri yok).
- Cosmo hızlı konuşur (~180 kelime/dk): 30-45 sn için 85-125 kelime yaz.
- Cosmo hata verirse yedek: aynı gövde, `"voice": "91e91d74-8eb4-43cd-97d3-7466c21db00d"`, sağlayıcı `cartesia` (Aykut).
- Speko bakiyesi `credits_balance_get` ile görülebilir; $0,50'nin altındaysa özette kullanıcıyı uyar.
- Kullanıcı kendi sesini yüklerse Speko'yu atla.

## Aşama 4: Video (cizgi-short)

Buradan sonra durmadan çalış. cizgi-short Aşama 4'ü izle:

```bash
python3 .claude/skills/cizgi-short/kit/tools/new_project.py ~/ya-olsaydi/<bolum-kisa-adi>
cp .claude/skills/ya-olsaydi/tahsin.js ~/ya-olsaydi/<bolum-kisa-adi>/
```

`story.js` içinde `import { TAHSIN } from "./tahsin.js";` ile karakteri kur. Kanala özel
çekim kuralları:
### Kadraj kuralları (kullanıcı kararı: daha geniş, mekân belirgin)

Kameraları elle yazma; `kadraj.js`'i projeye kopyala ve `shot(tür, ayakNoktası, ayar)` kullan
(örnek: `ornek-bolum-01-cay/story.js`).
- **Çekimlerin en az %75'i `genis` ya da `orta`.** Karakter tam boy görünür; ayakları kadrajda.
- **Her yeni mekân `genis` bir açılış planıyla başlar:** binalar, oda, gökyüzü, tezgâh, sokak
  okunur. İzleyici nerede olduğunu ilk bakışta anlamalı.
- **`yakin` en fazla 2 çekim:** kanca (ilk 2 sn) ve final tepkisi. Nesne detayı gerekiyorsa
  `orta` planda nesneyi karakterle birlikte göster, kamerayı nesnenin dibine sokma.
- **Alan derinliği düşük:** `dof(tür, odak)` kullan (genis 1.5, orta 2.5). Arka plan bulanık
  bir leke değil, okunabilir bir mekân olmalı.
- **Mekânı doldur:** karakterin iki yanında ve arkasında set parçaları olsun (tezgâh, masa,
  lamba, ağaç, tabela, raf). Boş duvar önünde çekim yapma.
- Overlay kartı (Gerçekte...) olan çekimde `lookDy: 0.5` ver ki karakter kartın altında kalsın.
- Kontak sayfasında kontrol et: karakter karenin üst yarısını tek başına dolduruyorsa çekim fazla
  yakın; `orta`ya ya da `genis`e çevir.

- **Kare 0:** Tahsin `yakin` planda, merak dolu yüzle, olayın nesnesiyle birlikte görünür;
  2. saniyede `orta`/`genis`e açıl.
- **Final:** Tahsin'in tepki planı (genelde `nervous` + `shrug` + `sweat`): `orta`dan başla,
  "Peki sen olsan ne yapardın?" cümlesinde `yakin`a doğru yavaşça yaklaş.
- Bir bölüm içinde kadro, kıyafetler ve mekân değişiklikleri tutarlı kalır. Yok olan geri
  gelmez, yıkılan kendiliğinden düzelmez.

Bulut ortamında render için: `CHROME=/opt/pw-browsers/chromium` ve parça parça
(`--resume`) çalıştır. Uzun render'dan önce kontak sayfasını kullanıcıya gönder ve Tahsin'i
`tahsin-referans.jpg` ile karşılaştır.

## Aşama 5: Yükleme paketi

MP4 bitince hepsini tek mesajda ver:

**A. Kapak:** Videodan en güçlü kareyi seç (Tahsin'in net ifadesi + olayın nesnesi), 1080x1920
olarak `out/kapak.jpg` kaydet. Üzerine yazılacak 2-4 kelimelik bir kapak metni öner; metni
ayrı bir editörde eklemesini söyle.

**B. Başlıklar:** 5 Türkçe başlık; birini "önerilen" diye işaretle. Merak uyandırsın ama
yanıltıcı olmasın. Shorts için kısa tut (≤ 60 karakter).

**C. Açıklama (kopyalanabilir):**
- Sonu söylemeden fikri anlatan güçlü bir açılış.
- Yorumlara davet: "Peki sen olsan ne yapardın? Yorumlara yaz!"
- Abone daveti: "Tuhaf Tahsin'in yeni 'Ya Olsaydı?' maceraları için abone ol."
- Bildirim: "Eğlence amaçlı, yapay zekâ desteğiyle hazırlanmış kurgusal bir animasyondur."
- 3 hashtag: `#YaOlsaydı` her zaman, artı konuya uygun 2 tane (`#Shorts` dahil olabilir).
- Topluluk linki yok. Kullanıcı bir link verirse ekle; link uydurma.

Son olarak `bolumler.md` dosyasına bölümün satırını ekle, commit et ve push et. Sonra sor:
"Yeni bölüme geçelim mi?"

## Çalışma kuralları

- Kullanıcının seçtiği fikri, süreyi ve sonu, sormadan başka bir şeyle değiştirme.
- Kullanıcı bir şeyi değiştirirse etkilenen senaryo, ses, çekim ve paket kısımlarını güncelle.
- Gerçek kişi, marka maskotu ya da logo kullanma.
- MP4'ü ve kapağı kullanıcıya dosya olarak gönder. Ağır çıktıları (frames/, work/) repoya
  commit etme. Bunlar repo dışındaki `~/ya-olsaydi/` klasöründe kalır.

## Örnek bölüm

`ornek-bolum-01-cay/` ilk bölümün çalışan kaynakları (story.js, script.txt, sound.json, meta.json). Yeni story.js yazarken
yapıyı buradan al (çekim listesi, `kadraj.js` ile kameralar, buhar, kart overlay, isim kartı), mekânı ve hikâyeyi değiştir.

## Yükleme ve otomasyon (Metricool)

- **Metricool markası:** blogId `8286087`, saat dilimi `Europe/Istanbul`, YouTube `UC5BffrS1Ug88Pzo4_MTBsxg`
  ("Tuhaf Tahsin."). Başka bir kanala (ör. "Why?") ASLA yükleme yapma: önce `getBrandSettings` ile kanal
  kimliğini doğrula, eşleşmezse dur ve bildir.
- **Yayın saatleri:** her gün **10:00** ve **16:00** (Metricool en iyi saat verisi). Tam otomatik yayın
  (kullanıcı kararı); onay beklemeden `autoPublish: true`.
- **Video linki:** Metricool herkese açık bir URL ister. **vidIQ kullanma** (başka hesaba bağlı).
  MP4'ü herkese açık `anil88fb/tuhaf-tahsin-videolar` reposuna koy: `bolumler/NN-kisa-ad.mp4` olarak commit et,
  `main`'e push et. URL: `https://raw.githubusercontent.com/anil88fb/tuhaf-tahsin-videolar/main/bolumler/NN-kisa-ad.mp4`.
  Oturumda repo yoksa `add_repo` (access: push) ile ekle ve `--depth 1` klonla. Repoyu küçük tutmak için
  yayınlanmış (tarihi geçmiş) videoları birkaç günde bir sil.
- **Gönderi:** `createScheduledPost`, `providers: [{"network":"youtube"}]`, `text` = açıklama,
  `youtubeData: {title, type: "short", privacy: "public", tags: [...], category: "FILM_ANIMATION",
  madeForKids: false, isAiGeneratedContent: false}`. Kapak için `videoCoverMilliseconds` verme (Shorts'ta
  kanal doğrulanmadan reddedilebilir).
- **Aynı slota iki video koyma:** göndermeden önce `getScheduledPosts` ile o günün slotunu kontrol et.
- Konu sırası `konular.md`'de; kullanılan konuyu işaretle, `bolumler.md`'ye satır ekle, commit + push.

---
name: ya-olsaydi
description: "Ya Olsaydı?" YouTube kanalı için Tuhaf Tahsin'li yeni bölüm üretir: fikir, Türkçe senaryo, ElevenLabs seslendirmesi, cizgi-short ile animasyon, bitmiş 9:16 MP4 ve yükleme paketi (kapak, başlık, açıklama). "Yeni bölüm", "Ya Olsaydı videosu", "Tahsin'li video", "kanal için video yap" isteklerinde kullan.
---

# Tuhaf Tahsin · bölüm üretimi

Kanal: **Tuhaf Tahsin** (YouTube `UC5BffrS1Ug88Pzo4_MTBsxg`), seri adı **Ya Olsaydı?** Türkçe, dikey (9:16) animasyonlu "ya … olsaydı?" hikâyeleri.
Ana karakter: **Tuhaf Tahsin**. Her bölümde aynı görünür; yan karakterler, mekân ve renkler
hikâyeye göre değişir. Üretim tamamen bu oturumda yapılır: senaryo burada yazılır, ses
ElevenLabs'te üretilir, video `cizgi-short` kitiyle çizilir.

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
- **Anlatıcı sesi:** ElevenLabs `isa - Istanbul Turkish`, voice_id `fkLVUvPhQxHhQGCjXRMA`.
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

## Aşama 3: Seslendirme (ElevenLabs)

Onaydan sonra `creative_generate_speech` ile seslendir: voice_id `fkLVUvPhQxHhQGCjXRMA`,
metin = onaylanan senaryo, tek üretim. Durumu `creative_get_flow_run_status` ile izle. Bitince
sesi indirip `work/voice.mp3` olarak koy; okunan metni `script.txt` yap.

- Üretim ücretsiz plandan karakter harcar (ayda 10.000). Kalan hakkı `account_get_usage` ile
  kontrol et. Senaryo kalan haktan uzunsa kullanıcıya söyle.
- Başarısız üretimi aynı çağrıyla tekrarlama (ikinci kez ücret alır). Önce durumu kontrol et.
- Model `eleven_v4`, tek üretim (`generations_count: 1`). Duygu etiketleri ([curious], [excited]...) serbest;
  `script.txt` ise etiketsiz düz metin olmalı. Ses dosyası `elevenlabsusercontent.com`'dan indirilir.
- **Yedek: Speko.** ElevenLabs kredisi yetmezse (`account_get_usage`: kalan < senaryo karakteri + 100) ya da
  üretim kredi hatasıyla düşerse `audio_synthesize` kullan: `{"text": <etiketsiz metin>, "intent": {"language": "tr"},
  "voice": "91e91d74-8eb4-43cd-97d3-7466c21db00d", "constraints": {"allowedProviders": {"tts": ["cartesia"]}}}`
  (Cartesia "Aykut - Friendly Companion"). Base64 sesi ya da indirme linkini `work/voice.mp3` (veya .wav) olarak kaydet.
- Kullanıcı kendi sesini yüklerse ElevenLabs'i atla.

## Aşama 4: Video (cizgi-short)

Buradan sonra durmadan çalış. cizgi-short Aşama 4'ü izle:

```bash
python3 .claude/skills/cizgi-short/kit/tools/new_project.py ~/ya-olsaydi/<bolum-kisa-adi>
cp .claude/skills/ya-olsaydi/tahsin.js ~/ya-olsaydi/<bolum-kisa-adi>/
```

`story.js` içinde `import { TAHSIN } from "./tahsin.js";` ile karakteri kur. Kanala özel
çekim kuralları:
- **Kare 0:** Tahsin yakın planda, merak dolu yüzle, olayın nesnesiyle birlikte görünür.
- **Final:** Tahsin'in tepki yakın planı (genelde `nervous` + `shrug` + `sweat`), ters köşe
  nesnesi arkada. "Peki sen olsan ne yapardın?" cümlesinde kamera ona doğru yavaşça yaklaşır.
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
yapıyı buradan al (çekim listesi, buhar, kart overlay, isim kartı), mekânı ve hikâyeyi değiştir.

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

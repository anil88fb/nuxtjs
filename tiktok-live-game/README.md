# 🐱 Kediler vs Köpekler 🐶: TikTok LIVE halat çekme oyunu

İzleyiciler canlı yayında yorum yazarak oyuna katılır:

| İzleyici ne yapar | Oyunda ne olur |
|---|---|
| `kedi` ya da `köpek` yazar (`1`/`2`, 🐱/🐶 da olur) | O takıma katılır, avatarı takım tribününde belirir |
| Herhangi bir yorum yazar | Halatı kendi takımına çeker (+2) |
| Beğeni gönderir | Mini çekiş |
| Hediye gönderir | **SÜPER ÇEKİŞ**: banner, konfeti, ekran sarsıntısı. Hediyenin değeri arttıkça güç de artar |
| Takip eder / paylaşır | +5 çekiş |

- Bir tur 90 saniye sürer. Halatı kendi çizgisine çeken takım anında kazanır, süre biterse halat hangi taraftaysa o takım kazanır.
- **Son 10 saniyede güç x2** olur, geride kalan takım da biraz destek alır. Böylece maçlar son ana kadar çekişmeli geçer.
- Her turun sonunda "Turun yıldızı" en çok çeken izleyici olarak ekrana çıkar.
- Ekranda izleyicilerin yazdığı yorumlar **gösterilmez**, sadece isimleri ve "katıldı / hediye gönderdi" gibi olaylar görünür. Böylece küfür ya da spam yayına yansımaz.

## Kurulum

Node.js 18 veya üstü gerekir.

```bash
cd tiktok-live-game
npm install
```

## 1) Yayına çıkmadan test et

```bash
npm run demo
```

Tarayıcıda `http://localhost:3000` adresini aç. Sahte izleyiciler oynamaya başlar.

Klavyeyle kendin test etmek için `http://localhost:3000/?test=1` adresini kullan:
**K/D** yeni kedi/köpek oyuncusu, **1/2** çekiş, **G** hediye, **L** beğeni, **F** takip, **S** yorum fırtınası, **R** skoru sıfırla, **M** sesi aç/kapat.

## 2) Gerçek yayına bağlan

Önce TikTok'ta canlı yayını başlat, sonra:

```bash
TIKTOK_USERNAME=kullaniciadin npm start
```

Windows PowerShell'de:

```powershell
$env:TIKTOK_USERNAME="kullaniciadin"; npm start
```

Yayın kapalıysa sunucu 15 saniyede bir tekrar dener. Bağlantı sorunu yaşarsan [eulerstream.com](https://www.eulerstream.com) üzerinden ücretsiz bir API anahtarı al ve `EULER_API_KEY=...` olarak ekle.

> ⚠️ Yorumları okumak için kullanılan `tiktok-live-connector` resmî bir TikTok API'si değildir. TikTok tarafında bir değişiklik olursa bir süre çalışmayabilir. Böyle bir durumda `npm update tiktok-live-connector` ile güncelle.

## 3) Oyunu yayına koy (OBS veya TikTok LIVE Studio)

1. Tuvali dikey ayarla: **Ayarlar → Video → 1080×1920**.
2. **Kaynak ekle → Tarayıcı (Browser)**:
   - URL: `http://localhost:3000`
   - Genişlik `1080`, Yükseklik `1920`
   - "Sesi OBS üzerinden kontrol et" seçeneğini işaretlersen oyun sesleri de yayına gider.
3. Yayını TikTok'a gönder:
   - **TikTok LIVE Studio**: aynı adresi "Link/Browser" kaynağı olarak ekle.
   - **OBS + Stream Key**: TikTok'un verdiği sunucu adresini ve yayın anahtarını OBS'e gir (bu özellik her hesapta açık değildir).

URL seçenekleri (birleştirilebilir, ör. `/?round=60&transparent=1`):

| Parametre | Ne yapar |
|---|---|
| `round=60` | Tur süresi (saniye, 30–600) |
| `transparent=1` | Arka plan şeffaf olur, kendi görüntünün üstüne koyabilirsin |
| `debug=1` | Bağlantı durum çubuğunu gösterir |
| `test=1` | Klavye test modunu açar |

## Yayın ipuçları

- TikTok, yorumları ekranın **sol alt** köşesinde gösterir. Bu yüzden oyunun önemli bilgileri üstte ve sağda duruyor.
- Yayına kamera köşesi veya sesli anlatım ekle ("Köpekler geri dönüyor!"). Tamamen otomatik yayınları TikTok daha az öne çıkarıyor.
- Başlığa çağrı koy: **"KEDİ mi KÖPEK mi? Yorum yaz, halatı çek! 🐱🐶"**
- Hediyeler sadece oyunu süsler, para karşılığı ödül ya da şans oyunu kurgusu yapma. Bu TikTok kurallarına aykırıdır.

## Dosyalar

```
server.js        TikTok'a bağlanır, olayları socket.io ile oyuna iletir
demo.js          Sahte izleyici üreteci (npm run demo)
public/index.html, style.css, game.js   Oyun ekranı (1080×1920)
```

Oyunu özelleştirmek için `public/game.js` dosyasının başındaki `CFG` (güç değerleri, süreler) ve `TEAMS` (takım adları, emojileri, renkleri) bölümlerini değiştirmen yeterli. Örneğin takımları "Çay ☕ vs Kahve ☕️" veya "Yaz ☀️ vs Kış ❄️" yapabilirsin. Değiştirdiğin takımlar için `detectTeam` fonksiyonundaki anahtar kelimeleri de güncelle.

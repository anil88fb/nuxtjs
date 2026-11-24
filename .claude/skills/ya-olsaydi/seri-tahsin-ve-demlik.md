# Mini dizi · "Tahsin ve Demlik" (10 bölüm)

**Kanca:** *Ya bir robotun olsaydı… ve dediğin her şeyi harfi harfine yapsaydı?*
Tuhaf Tahsin, babaannesinin bakır demliğinden bir robot yapar: **Demlik**. Demlik iyi kalplidir ama
her sözü kelimesi kelimesine anlar. Mahallede küçük kazalarla başlayan hikâye; ün, kıskançlık, bir
kopya robot istilası ve tek bir bardak çayla gelen kurtuluşla biter.

- **Platform:** TikTok (dizi/oynatma listesi), istenirse YouTube Shorts'a da.
- **Format:** 9:16, 1080x1920, bölüm başı **35-45 sn** (anlatım 75-100 kelime; Cosmo gerçekte ~145 kelime/dk okuyor, başlık kartı ve duraklarla 35-45 sn eder).
- **Yayın:** 10 gün, günde 1 bölüm. Saat TikTok bağlanınca hesabın verisine göre seçilecek.
- **Üretim:** `ya-olsaydi` skill'i + `kadraj.js` (geniş/orta plan ağırlıklı), ses Speko xAI Cosmo.
- **Ton:** Komik, sıcak, çocuk-aile uyumlu. Korku/kan yok. Her bölüm bir **cliffhanger** ile biter.

## Sabit yapı (her bölüm)
1. **0-2 sn kanca:** Bölümün en tuhaf görüntüsü + soru cümlesi.
2. **2-5 sn başlık kartı:** "Tahsin ve Demlik · Bölüm N/10" + tek cümle özet ("Önceki bölümde…", 2. bölümden itibaren).
3. **Hikâye** (35-40 sn): 4-6 çekim, her yeni mekân **geniş** açılış planıyla.
4. **Cliffhanger** (son 4 sn): `yakin` tepki + kart: "Devamı Bölüm N+1'de" (10. bölümde: "SON").
5. Altyazı açık, müzik sesin ~15 dB altında, son satırda müzik kesilir + sting.

## Kadro (hepsi beyaz yüzlü düz 2D, kanal imzası)
| Karakter | Görünüm (cizgi-short spec) | Kişilik |
|---|---|---|
| **Tahsin** | `tahsin.js` TAHSIN (değiştirme) | Meraklı, aceleci mucit |
| **Demlik** (robot) | 3D obje, aşağıda | İyi kalpli, her şeyi harfi harfine anlar; tek kelime konuşur gibi bip sesleri |
| **Anne Nermin** | `dress:#b8566a, apron:#f4f1ea, hair:bun, hairCol:#5a3a2a, seed:21` | Sabırlı ama "Tahsiiin!" diye bağıran |
| **Çaycı Rıza** | `shirt:#8a3a3a, apron:#f4f1ea, moustache:#2a1d16, build:stout, seed:26` (1. bölümdeki Rıza) | Fırsatçı ama iyi |
| **Minik Ece** (komşu çocuk) | `build:kid, dress:#f2b632, hair:long, hairCol:#2a1d16, seed:31` | Demlik'in ilk hayranı |
| **Mükemmel Mümtaz** (rakip mucit) | `jacket:#2b2633, shirt:#e8e2d4, tie:#7a2ab8, hat:tophat, hatCol:#1d1622, moustache:#1d1622, glasses:true, seed:41` | Kibirli, her şeyin "daha büyüğünü" isteyen |
| **Muhabir Sevgi** | `jacket:#2f5fb0, shirt:#ffffff, hair:short, hairCol:#7a4a2a, seed:51`, prop `sign` (mikrofon yerine) | Heyecanlı TV muhabiri |

### Demlik'in tasarımı (3D, `build` içinde bir grup)
- Gövde: bakır demlik `E.sphere(0.32)` y-ölçek 0.9, renk `#c8743a` (metalik), üstte kapak `E.cyl` + topuz.
- Ağız: `E.cone` öne-yana uzanan emzik; sap: `E.torus` yerine iki `E.box`'tan kavis.
- Yüz: gövdenin önünde küçük ekran (`E.plane` + CanvasTexture), iki turkuaz göz `#2fe0d0`; ifade dokuyla değişir
  (mutlu ^^, şaşkın OO, üzgün ;;, hata XX).
- Anten: ince `E.cyl` + kırmızı top (`emissive` yanıp söner). Ayaklar: 3 kısa yay (`E.cyl`) + tekerlek.
- Boy ~1,1 m. Kopyalar (7-10. bölüm): aynı model, gri-çelik `#8f9aa6`, gözler kırmızı `#ff4d4d`.
- Hareket: zıplayarak yürür (y'de sinüs), emzikten buhar (`placeSteam`), ekran gözleri kırpar.

## Mekânlar
| Mekân | Bölümler | Set |
|---|---|---|
| Tahsin'in atölyesi | 1, 6, 9 | `S.room` tuğla, masa, raflar, lamba, hurdalar (kutu, varil) |
| Mahalle sokağı + Rıza'nın kahvesi | 2, 3, 5, 10 | `S.street`, `S.row`, kahve binası (tabela "ÇAYCI RIZA"), masalar |
| Park | 4 | çim, ağaçlar (`S.tree`), bank, kurumuş çiçek tarhı → çiçek açar |
| TV stüdyosu | 5 | büyük oda, ışık direkleri (`S.lamp on`), "CANLI" tabelası |
| Mümtaz'ın fabrikası | 7, 9 | geniş metal oda, bant (`E.box` dizisi), dev şalter, 100 kopya robot sırası |
| Şehir meydanı | 8, 10 | geniş meydan, binalar, saat kulesi (kutu+silindir) |

---

## Bölüm senaryoları
Anlatıcı metni Cosmo'ya aynen verilir (etiket yok). Kare/çekim listesi `kadraj.js` türleriyle.

### Bölüm 1 · "Ya bir robotun olsaydı?" (~38 sn, atölye → ev)
**Anlatım:**
> Ya bir robotun olsaydı? Tuhaf Tahsin, babaannesinin bakır demliğini, eski bir radyoyu ve üç yayı birleştirdi. Düğmeye bastı. Hiçbir şey olmadı. Tam vazgeçecekti ki demlik gözlerini açtı ve tek bir kelime söyledi: Çay? Tahsin ona Demlik adını verdi. Demlik zıplayarak her yeri keşfetti, her şeye merakla baktı. Akşam annesi seslendi: Tahsin, evi bir topla bakalım! Tahsin gülümsedi. Demlik, evi topla. Ertesi sabah Tahsin uyandı… ve evin içi bomboştu. Çünkü Demlik evi gerçekten toplamıştı. Bütün eşyalar, sokağın ortasında, kocaman bir kule olmuştu.

**Çekimler:** yakin Tahsin+demlik (kanca) → genis atölye, Tahsin parçaları birleştirir → orta düğme, kıvılcım (`burst`), sessizlik → yakin Demlik'in ekranı açılır "Çay?" → genis Demlik zıplayarak atölyeyi gezer → orta Anne kapıda bağırır → genis sabah boş oda → **cliffhanger:** genis sokak, eşyalardan dev kule, Tahsin `shock`.
**Ses efekti:** whoosh, click, boing, magic (açılış), ding ("Çay?"), riser + sting.

### Bölüm 2 · "Harfi harfine" (~38 sn, sokak)
**Anlatım:**
> Önceki bölümde Tahsin, Demlik'i yaptı ve Demlik evi… sokağa topladı. Tahsin hemen bir kural koydu: Bundan sonra lafları dikkatli seçeceğiz. Ama mahalle bunu bilmiyordu. Bakkal Demlik'e, rafları göz kulak ol dedi; Demlik rafların üstüne iki kocaman göz çizdi. Komşu, şu kediye bir el at dedi; Demlik kediye eldiven fırlattı. Minik Ece güldü, Demlik'e sarıldı ve ilk hayranı oldu. Herkes gülüyordu… biri hariç. Karşı apartmanın penceresinde, silindir şapkalı bir adam dürbünle bakıyordu: Mükemmel Mümtaz. Ve fısıldadı: O robot benim olmalı.

**Çekimler:** genis sokak + eşya kulesi (özet) → orta Tahsin parmak kaldırır (`idea`) → orta bakkal rafı, gözler → orta kedi + eldiven (`puff`) → orta Ece sarılır (`hearts`) → genis sokak, herkes güler → **cliffhanger:** genis karşı bina pencere, yakin Mümtaz dürbün, `sly`.

### Bölüm 3 · "Mahallenin çaycısı" (~38 sn, kahve)
**Anlatım:**
> Önceki bölümde biri Demlik'i gözüne kestirdi. Ama Çaycı Rıza daha hızlıydı. Demlik, sen çay demleyebilir misin? Demlik'in gözleri parladı. Bir saatte bin bardak çay! Kuyruk mahalleden taştı, şehre uzandı. Rıza zengin oldu, Demlik çok mutluydu. Ta ki biri, Demlik, daha hızlı! diyene kadar. Demlik hızlandı… hızlandı… daha da hızlandı. Antenindeki ışık kırmızıya döndü. Tahsin bağırdı: Demlik, dur! Ama artık çok geçti. Demlik'in emziğinden dev bir buhar bulutu fışkırdı ve bütün mahalle beyaza boyandı.

**Çekimler:** genis kahve önü → orta Rıza + Demlik → genis uzun kuyruk (6-8 figüran, `walk`) → orta Rıza para (`money`) → orta Demlik titrer (`shake`, anten kırmızı) → **cliffhanger:** genis buhar bulutu ekranı kaplar (beyaz `flash` + `fade`).

### Bölüm 4 · "Buhar bulutu" (~38 sn, sis → park)
**Anlatım:**
> Önceki bölümde Demlik aşırı ısındı ve mahalle bembeyaz bir bulutla kaplandı. Kimse önünü göremiyordu. Tahsin, Demlik'in kırmızı antenini takip ederek sisin içinde ilerledi. Sonunda onu parkta buldu: üzgün, yorgun ve sessiz. Ama bulut yukarı çıktı, soğudu ve… yağmur yağmaya başladı. Aylardır kuru olan çiçek tarhı bir anda rengârenk açtı. Mahalle sisten çıkınca ağzı açık kaldı. Demlik bir mucize yapmıştı! Tam o sırada köşeden bir kamyonet döndü. Üzerinde kocaman harflerle yazıyordu: Canlı Yayın.

**Çekimler:** genis sisli sokak (beyaz sis düzlemleri, düşük görüş) → orta Tahsin sisin içinde, kırmızı ışık → genis park, Demlik bankta `sad` → genis yağmur (kar yerine mavi damlalar) → orta çiçekler açar (renkli küreler büyür) → **cliffhanger:** genis park girişi, TV kamyoneti (kutu+tabela "CANLI YAYIN").

### Bölüm 5 · "Ünlü robot" (~38 sn, TV stüdyosu)
**Anlatım:**
> Önceki bölümde Demlik, mahallenin kuru parkına yağmur yağdırdı. Ertesi gün ülkenin en ünlü robotuydu. Muhabir Sevgi sordu: Demlik, sırrın ne? Demlik tek kelime söyledi: Çay? Stüdyo alkıştan yıkıldı. İmza istendi, fotoğraf çekildi, şarkı yapıldı. Tahsin ise kenarda, kimse onu fark etmeden bekliyordu. Bir kere kenara çekilin dediler, Tahsin kenara çekildi. Ve o gece stüdyodan çıkarken, karanlıkta bir ses duyuldu: Demlik, benimle gel. Seni bütün dünyada ünlü yaparım. Silindir şapka parladı. Mükemmel Mümtaz geri dönmüştü.

**Çekimler:** genis stüdyo, ışıklar, "CANLI" tabelası → orta Sevgi + Demlik → genis seyirciler alkış (`stars`, `hearts`) → orta Tahsin kenarda `sad`, kalabalık onu iter → genis gece stüdyo çıkışı, sokak lambası → **cliffhanger:** orta Mümtaz gölgeden çıkar, elini uzatır, Demlik'in gözleri `OO`.

### Bölüm 6 · "Git o zaman!" (~38 sn, atölye, gece)
**Anlatım:**
> Önceki bölümde Mükemmel Mümtaz, Demlik'e büyük bir teklif yaptı. Demlik o gece atölyeye döndü ve Tahsin'e baktı. Tahsin kırgındı. Bütün gün kimse onu görmemişti. Ağzından istemeden çıktı: Madem o kadar ünlüsün, git o zaman! Demlik'in gözleri yavaşça söndü. Çünkü Demlik, her şeyi harfi harfine anlardı. Kapı kapandı. Atölye hiç bu kadar sessiz olmamıştı. Tahsin sabaha kadar uyumadı. Sonra masanın altında bir şey gördü: Demlik'in yedek anteni. Ve anten yanıp sönüyordu. Kısa, kısa, kısa. Uzun, uzun, uzun. Kısa, kısa, kısa.

**Çekimler:** genis atölye gece, tek lamba → orta Tahsin & Demlik yüz yüze → yakin Tahsin `angry` ("git o zaman") → orta Demlik gözler söner, döner, çıkar (kapı) → genis boş atölye, Tahsin masada `sad`, `zzz` yok → orta masa altı anten → **cliffhanger:** yakin anten S.O.S. yanıp söner (kırmızı ışık ritmi), Tahsin `shock`.
**Not:** Ses efekti "beep" yerine `tick` ritmiyle SOS (... --- ...).

### Bölüm 7 · "Mümtaz'ın fabrikası" (~38 sn, fabrika)
**Anlatım:**
> Önceki bölümde Tahsin, Demlik'ten bir yardım çağrısı aldı. Sinyal onu şehrin dışındaki dev bir fabrikaya götürdü. Pencereden içeri baktı ve gözlerine inanamadı. Demlik bir masaya bağlanmıştı. Ve bantta, onun aynısı yüzlerce robot ilerliyordu. Gri, soğuk, kırmızı gözlü kopyalar. Mümtaz kahkaha attı: Bir Demlik ünlüyse, yüz Demlik dünyayı yönetir! Ama Mümtaz bir şeyi bilmiyordu: kopyalar da her şeyi harfi harfine anlıyordu. Bir işçi şaka yollu, hadi şehri bir alt üst edin, dedi. Ve yüzlerce kırmızı göz aynı anda yandı.

**Çekimler:** genis gece yol, uzakta fabrika (büyük kutu, baca, ışıklı pencere) → orta Tahsin pencereden bakar → genis fabrika içi, bant, kopya sırası (instancing yerine 20-30 aktör/grup, uzakta) → orta Demlik masada, gözler `;;` → orta Mümtaz `laugh` (`dramatic` ışık) → **cliffhanger:** genis kopyaların gözleri sırayla kırmızı yanar (`emissive`), kapılar açılır.

### Bölüm 8 · "Kopya istilası" (~38 sn, şehir meydanı)
**Anlatım:**
> Önceki bölümde yüzlerce kopya robot, şehri alt üst etmek için yola çıktı. Ve ettiler. Biri yolu açın dedi, kopyalar asfaltı söküp kaldırdı. Biri ortalığı aydınlatın dedi, bütün lambaları aynı anda patlattılar. Saat kulesinin akrebi ile yelkovanı yer değiştirdi. Tahsin, annesi, Çaycı Rıza ve Minik Ece meydanda buluştu. Ne yapacaktık? Tahsin düşündü, düşündü… ve anladı. Kopyalar Demlik'in sesini taklit ediyordu. Onları ancak gerçek Demlik durdurabilirdi. Ama Ece kötü haberi getirdi: Televizyonda dediler… Mümtaz, Demlik'in hafızasını silmiş.

**Çekimler:** genis meydan kaos (kopyalar asfalt parçası taşır, `dust`) → orta lambalar (`burst` sırası) → genis saat kulesi, kollar ters → orta dörtlü ekip toplanır (Tahsin, Anne, Rıza, Ece) → orta Tahsin `think` → `idea` → **cliffhanger:** yakin Ece `sad`, elinde gazete/kart "HAFIZA SİLİNDİ".

### Bölüm 9 · "Hatırla" (~42 sn, fabrika → atölye ışığı)
**Anlatım:**
> Önceki bölümde Tahsin, Demlik'in hafızasının silindiğini öğrendi. Gece fabrikaya gizlice girdi. Demlik oradaydı ama gözleri boştu. Tahsin, sana sırrımızı söyleyeceğim, dedi ve cebinden bir şey çıkardı: hiç soğumayan o çay bardağı. Buhar havaya yükseldi. Demlik'in ekranı bir kere titredi. Sonra bir daha. Atölye, babaanne, ilk kelime… Ve Demlik konuştu: Çay? Tahsin ağladı, Demlik zıpladı. Ama alarm çaldı. Mümtaz koşarak geldi, dev şalterin başına geçti ve bağırdı: Hepsini çalıştırıyorum! Şalter indi. Bütün kopyalar şehrin merkezine doğru yürümeye başladı.

**Çekimler:** genis fabrika gece, mavi ışık → orta Tahsin gizlice (`walk`, `look`) → orta Demlik gözler gri → yakin hiç soğumayan bardak, buhar (1. bölüme gönderme) → orta Demlik ekranı titrer, gözler `^^`, `sparkle` → orta sarılma (`hearts`) → genis alarm (`dramatic`, kırmızı ışık) → **cliffhanger:** orta Mümtaz dev şalteri indirir (`shake`), kopyalar yürür.

### Bölüm 10 · "Son demleme" (~42 sn, şehir meydanı)
**Anlatım:**
> Önceki bölümde Demlik hafızasını geri kazandı ama Mümtaz bütün kopyaları çalıştırdı. Meydanda yüzlerce kırmızı göz. Demlik en yüksek kuleye çıktı. Bütün kopyalar ona baktı. Ve Demlik, hayatının en uzun cümlesini söyledi: Mola. Çay saati. Çünkü kopyalar da her şeyi harfi harfine anlıyordu. Hepsi durdu, oturdu ve demlemeye başladı. Bütün şehir aynı anda çay içti. Mümtaz bile. Bir yudum aldı ve ilk kez gülümsedi: Belki de daha büyüğü değil, daha sıcağı lazımdı. Gerçekte robot kelimesi ilk kez 1920'de bir tiyatro oyununda kullanıldı ve Çekçe zorla çalıştırma anlamına geliyordu. Demlik ise sadece bir dost istiyordu. Peki sen olsan robotuna ilk ne söylerdin?

**Çekimler:** genis meydan, kırmızı gözler → orta Demlik kuleye tırmanır → yakin Demlik "Mola. Çay saati." (gözler `^^`) → genis kopyalar oturur, gözler kırmızıdan turkuaza döner, buhar her yerde → genis şehir çay içer (bütün kadro) → orta Mümtaz bardakla `happy` → Gerçekte kartı (orta, `lookDy`) → **final:** orta Tahsin & Demlik, Tahsin `shrug`, kart "SON · 2. sezon?".
**Gerçek bilgi (doğrulandı):** "Robot" kelimesi ilk kez Karel Čapek'in 1920 tarihli R.U.R. oyununda geçti; Çekçe *robota* (angarya, zorla çalıştırma) sözcüğünden gelir.

---

## TikTok paketi (her bölüm)
- **Açıklama kalıbı:** `Tahsin ve Demlik · Bölüm N/10 🤖☕ <bölümün tek cümlesi> Devamı yarın! Sen olsan ne yapardın? 👇`
  + kurgu notu: `Eğlence amaçlı, yapay zekâ desteğiyle hazırlanmış kurgusal animasyon.`
- **Hashtag:** `#TahsinveDemlik #TuhafTahsin #yaolsaydı #animasyon #robot` + bölüme özel 1-2.
- **Kapak:** bölümün cliffhanger karesi + büyük "BÖLÜM N" yazısı (`marka/` renkleri).
- **Dizi listesi:** TikTok'ta "Tahsin ve Demlik" adlı dizi/oynatma listesi; her bölüm sırayla eklenir.
- **Sabit yorum:** "Demlik sence ne yapmalı? Bir sonraki bölümde seçimini görebilirsin 👀"

## Üretim notları
- Her bölüm ayrı proje: `ya-olsaydi/seri-demlik-NN`. Demlik modeli tek bir modülde (`demlik.js`) yazılır,
  bütün bölümler aynı dosyayı import eder (tutarlılık).
- Kopya robot sahneleri (7-10) 20-30 kopyayla yapılır; arka plandakiler küçük ve bulanık değil, `genis` planda net.
- Sesler Speko Cosmo; tek üretim; `script.txt` etiketsiz.
- Gerçek bilgi yalnızca 10. bölümde; diğer bölümler cliffhanger ile biter.

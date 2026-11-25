"""
API-Football'dan güncel sezonun takım logolarını ve FORVET oyuncularının
fotoğraflarını indirir, hepsini tek bir galeri dosyasında (galeri.html) toplar.

Kullanım (Windows):
    set APIFOOTBALL_KEY=senin_anahtarin
    python api_football_indir.py

Çıktı (api_football/ klasörü):
    logolar/<Lig>/<Takim>.png
    forvetler/<Lig>/<Takim>/<Oyuncu>.png
    takimlar.csv, forvetler.csv
    galeri.html   -> çift tıkla, tarayıcıda tüm logolar ve forvetler görünür

Notlar:
- Ek kurulum gerekmez (sadece Python 3).
- Sezon otomatik seçilir (Temmuz ve sonrası -> o yıl, öncesi -> bir önceki yıl).
  Elle vermek için: python api_football_indir.py --sezon 2026
- Ligler: Türkiye Süper Lig, Premier League, La Liga,
  Serie A, Bundesliga, Ligue 1.
- Her ligden puan durumuna göre ilk 5 takım alınır (TAKIM_SAYISI ile değişir).
- Ücretsiz pakette günlük 100 istek sınırı var. Toplam ~42 istek gerekir
  (6 lig x 2 istek + 30 takım x 1 kadro isteği), yani tek günde biter.
  Sınıra gelince script durur; ertesi gün aynı komutu çalıştırınca
  kaldığı yerden devam eder (önbellek: cache/ klasörü).
- Görsel indirmeleri (logo/foto) istek sınırına sayılmaz.
"""
import csv
import datetime
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

API = "https://v3.football.api-sports.io"


def guncel_sezon():
    if "--sezon" in sys.argv:
        return int(sys.argv[sys.argv.index("--sezon") + 1])
    bugun = datetime.date.today()
    return bugun.year if bugun.month >= 7 else bugun.year - 1


SEZON = guncel_sezon()

LIGLER = {
    203: "Turkiye_Super_Lig",
    39: "Ingiltere_Premier_League",
    140: "Ispanya_La_Liga",
    135: "Italya_Serie_A",
    78: "Almanya_Bundesliga",
    61: "Fransa_Ligue_1",
}

TAKIM_SAYISI = 5  # her ligden puan durumunda ilk kaç takım alınsın

ANAHTAR = os.environ.get("APIFOOTBALL_KEY", "").strip()
CACHE = "cache"
CIKTI = "api_football"


class LimitDoldu(Exception):
    pass


def temiz(ad):
    return re.sub(r'[\\/:*?"<>|]+', "_", str(ad)).strip()


def api_get(yol, params):
    sorgu = "&".join(f"{k}={v}" for k, v in params.items())
    anahtar_dosya = os.path.join(CACHE, temiz(f"{yol}_{sorgu}") + ".json")
    if os.path.exists(anahtar_dosya):
        with open(anahtar_dosya, encoding="utf-8") as f:
            return json.load(f)

    req = urllib.request.Request(f"{API}/{yol}?{sorgu}",
                                 headers={"x-apisports-key": ANAHTAR})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            veri = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 429:
            raise LimitDoldu()
        raise

    hatalar = veri.get("errors")
    if hatalar:
        metin = json.dumps(hatalar, ensure_ascii=False)
        kucuk = metin.lower()
        if "limit" in kucuk or "requests" in kucuk:
            raise LimitDoldu()
        if "plan" in kucuk or "season" in kucuk:
            sys.exit(f"\nAPI bu sezona erişim vermiyor ({SEZON}): {metin}\n"
                     "Ücretsiz paket güncel sezonu kapsamıyor olabilir. "
                     "Eski bir sezonu denemek için: --sezon 2024")
        print(f"  ! API hatası ({yol} {sorgu}): {metin}")
        return veri

    os.makedirs(CACHE, exist_ok=True)
    with open(anahtar_dosya, "w", encoding="utf-8") as f:
        json.dump(veri, f, ensure_ascii=False)
    time.sleep(6.5)  # ücretsiz pakette dakikalık sınırı (10/dk) aşmamak için
    return veri


def indir(url, hedef):
    if not url or os.path.exists(hedef):
        return
    os.makedirs(os.path.dirname(hedef), exist_ok=True)
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            icerik = r.read()
        with open(hedef, "wb") as f:
            f.write(icerik)
    except Exception as e:
        print(f"  ! Görsel indirilemedi: {url} ({e})")


def ilk_siradakiler(lig_id):
    """Puan durumuna göre ilk TAKIM_SAYISI takımın {id: sıra} sözlüğü."""
    veri = api_get("standings", {"league": lig_id, "season": SEZON})
    try:
        tablo = veri["response"][0]["league"]["standings"][0]
    except (KeyError, IndexError, TypeError):
        return {}
    tablo = sorted(tablo, key=lambda x: x.get("rank") or 999)[:TAKIM_SAYISI]
    return {x["team"]["id"]: x.get("rank") for x in tablo}


def takimlar():
    liste = []
    for lig_id, lig_ad in LIGLER.items():
        print(f"[Takımlar] {lig_ad}")
        siralar = ilk_siradakiler(lig_id)
        veri = api_get("teams", {"league": lig_id, "season": SEZON})
        kayitlar = veri.get("response", [])
        if siralar:
            kayitlar = sorted((k for k in kayitlar if k["team"]["id"] in siralar),
                              key=lambda k: siralar[k["team"]["id"]])
        else:
            print(f"  ! Puan durumu alınamadı, ilk {TAKIM_SAYISI} takım alınıyor.")
            kayitlar = kayitlar[:TAKIM_SAYISI]
        for k in kayitlar:
            t, s = k["team"], k.get("venue") or {}
            logo = os.path.join("logolar", lig_ad, temiz(t["name"]) + ".png")
            indir(t.get("logo"), os.path.join(CIKTI, logo))
            liste.append({"lig": lig_ad, "sira": siralar.get(t["id"]),
                          "takim_id": t["id"], "takim": t["name"],
                          "ulke": t.get("country"), "kurulus": t.get("founded"),
                          "stadyum": s.get("name"), "sehir": s.get("city"),
                          "logo_dosya": logo, "logo_url": t.get("logo")})
    yaz_csv("takimlar.csv", liste)
    print(f"Takımlar bitti: {len(liste)} takım.")
    return liste


def forvetler(takim_listesi):
    liste = []
    for i, t in enumerate(takim_listesi, 1):
        print(f"[Forvetler {i}/{len(takim_listesi)}] {t['lig']} - {t['takim']}")
        veri = api_get("players/squads", {"team": t["takim_id"]})
        for kadro in veri.get("response", []):
            for p in kadro.get("players", []):
                if p.get("position") != "Attacker":
                    continue
                foto = os.path.join("forvetler", t["lig"], temiz(t["takim"]),
                                    f"{temiz(p.get('name'))}_{p['id']}.png")
                indir(p.get("photo"), os.path.join(CIKTI, foto))
                liste.append({"lig": t["lig"], "takim": t["takim"],
                              "oyuncu_id": p["id"], "ad": p.get("name"),
                              "yas": p.get("age"), "forma_no": p.get("number"),
                              "foto_dosya": foto, "foto_url": p.get("photo")})
    yaz_csv("forvetler.csv", liste)
    print(f"Forvetler bitti: {len(liste)} forvet.")
    return liste


def yaz_csv(ad, satirlar):
    if not satirlar:
        return
    with open(os.path.join(CIKTI, ad), "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(satirlar[0].keys()), delimiter=";")
        w.writeheader()
        w.writerows(satirlar)


def galeri(takim_listesi, forvet_listesi):
    e = html.escape
    forvet_by_takim = {}
    for f in forvet_listesi:
        forvet_by_takim.setdefault((f["lig"], f["takim"]), []).append(f)

    parcalar = []
    for lig_ad in LIGLER.values():
        takimlar_lig = [t for t in takim_listesi if t["lig"] == lig_ad]
        if not takimlar_lig:
            continue
        parcalar.append(f"<h2>{e(lig_ad.replace('_', ' '))}</h2>")
        for t in takimlar_lig:
            kartlar = "".join(
                f'<figure><img loading="lazy" src="{e(f["foto_dosya"].replace(os.sep, "/"))}">'
                f'<figcaption>{e(f["ad"] or "")}'
                f'{" #" + str(f["forma_no"]) if f["forma_no"] else ""}</figcaption></figure>'
                for f in forvet_by_takim.get((lig_ad, t["takim"]), []))
            parcalar.append(
                f'<section><div class="takim"><img src="{e(t["logo_dosya"].replace(os.sep, "/"))}">'
                f'<b>{e(t["takim"])}</b></div><div class="oyuncular">'
                f'{kartlar or "<i>forvet bilgisi yok</i>"}</div></section>')

    sayfa = f"""<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Forvet Galerisi {SEZON}-{str(SEZON + 1)[2:]}</title><style>
body{{font-family:system-ui,sans-serif;margin:0 16px;background:#f5f6f8;color:#1b1d21}}
h1{{margin:24px 0 4px}} h2{{margin-top:40px;border-bottom:2px solid #ccd;padding-bottom:6px}}
section{{background:#fff;border-radius:10px;padding:12px;margin:12px 0}}
.takim{{display:flex;align-items:center;gap:10px;font-size:18px}}
.takim img{{width:48px;height:48px;object-fit:contain}}
.oyuncular{{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px}}
figure{{margin:0;width:110px;text-align:center;font-size:13px}}
figure img{{width:110px;height:110px;object-fit:cover;border-radius:8px;background:#eee}}
</style></head><body><h1>Takım Logoları ve Forvetler</h1>
<p>Sezon {SEZON}-{SEZON + 1} · {len(takim_listesi)} takım · {len(forvet_listesi)} forvet</p>
{''.join(parcalar)}</body></html>"""
    with open(os.path.join(CIKTI, "galeri.html"), "w", encoding="utf-8") as f:
        f.write(sayfa)
    print(f"Galeri hazır: {os.path.join(CIKTI, 'galeri.html')}")


if __name__ == "__main__":
    if not ANAHTAR:
        sys.exit("APIFOOTBALL_KEY ayarlı değil. Önce: set APIFOOTBALL_KEY=anahtarin")
    os.makedirs(CIKTI, exist_ok=True)
    print(f"Sezon: {SEZON}-{SEZON + 1}")
    try:
        t = takimlar()
        f = forvetler(t)
        galeri(t, f)
        print("\nTamamlandı.")
    except LimitDoldu:
        print("\nGünlük istek sınırı doldu. Yarın aynı komutu çalıştır, kaldığı yerden devam eder.")

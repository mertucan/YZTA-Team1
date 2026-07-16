"""A101 (Kapıda) fiyat scraper'ı.

Nasıl çalışır:
1. Ürün kataloğu, A101'in resmi sitemap'lerinden (products-kapida-*.xml) çekilir ve
   bellekte 24 saat önbelleklenir (~10.000 ürün URL'si; slug'lar paket boyutunu içerir).
2. Malzeme adı Türkçe karakterlerden arındırılıp slug'larla eşleştirilir; yalnızca
   malzemenin BİRİMİYLE uyumlu paket boyutu çözülebilen ürünler aday olur
   (kg -> "1 kg"/"2500 g", lt -> "1 l"/"500 ml", adet -> "30'lu/15 adet").
3. Ürün sayfasındaki JSON-LD (schema.org/Product) bloğundan güncel fiyat okunur.

robots.txt yalnızca "/*opf=*" yollarını yasaklıyor; ürün/sitemap sayfaları erişime açık.
"""
import json
import re
import subprocess
import time

SITEMAP_URLS = [
    "https://www.a101.com.tr/sitemaps/products-kapida-1.xml",
    "https://www.a101.com.tr/sitemaps/products-kapida-2.xml",
]

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

CATALOG_TTL_SECONDS = 24 * 3600

_catalog: list[str] = []
_catalog_loaded_at: float = 0.0


class A101Error(Exception):
    pass


def _http_get(url: str, timeout: int = 30) -> str:
    """A101, httpx/requests'in TLS parmak izini 403 ile engelliyor; sistem curl'ü
    (schannel) sorunsuz geçiyor. Bu yüzden HTTP katmanı curl subprocess'idir."""
    cmd = [
        "curl", "-s", "-L", "--max-time", str(timeout),
        "-H", f"User-Agent: {_UA}",
        "-H", "Accept-Language: tr-TR,tr;q=0.9",
        url,
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, timeout=timeout + 15)
    except Exception as exc:
        raise A101Error(f"A101 isteği başarısız: {exc}") from exc
    if res.returncode != 0 or not res.stdout:
        raise A101Error(f"A101 isteği başarısız (curl kodu {res.returncode}).")
    return res.stdout.decode("utf-8", errors="ignore")


_TR_FOLD = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")


def _fold(text: str) -> str:
    """Türkçe karakterleri sadeleştirip küçük harfe çevirir (slug karşılaştırması için)."""
    return (text or "").translate(_TR_FOLD).lower()


def _load_catalog() -> list[str]:
    global _catalog, _catalog_loaded_at
    if _catalog and (time.time() - _catalog_loaded_at) < CATALOG_TTL_SECONDS:
        return _catalog
    urls: list[str] = []
    for sitemap in SITEMAP_URLS:
        try:
            urls.extend(re.findall(r"<loc>(https://[^<]+)</loc>", _http_get(sitemap, timeout=45)))
        except Exception:
            continue  # tek sitemap düşse bile diğeri yeter
    if not urls:
        if _catalog:
            return _catalog  # eski önbellek elde varsa onu kullan
        raise A101Error("A101 ürün kataloğu (sitemap) alınamadı.")
    _catalog = urls
    _catalog_loaded_at = time.time()
    return _catalog


def _num(raw: str) -> float:
    return float(raw.replace(",", "."))


def parse_pack_quantity(text: str, unit: str) -> float | None:
    """Ürün adı/slug'ından, malzemenin birimi cinsinden paket miktarını çözer.
    Birim uyuşmazsa None döner — 'birim eşleşmesi' garantisi burada sağlanır."""
    t = " " + _fold(text).replace("-", " ").replace("_", " ").replace("*", " ") + " "
    if unit == "kg":
        m = re.search(r"(\d+(?:[.,]\d+)?)\s*kg\b", t)
        if m:
            return _num(m.group(1))
        m = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:gr|g)\b", t)
        if m:
            return _num(m.group(1)) / 1000.0
        # Manav ürünleri kilosuyla satılır: "domates kg" gibi sayısız 'kg' = 1 kg fiyatı
        if re.search(r"\bkg\b", t):
            return 1.0
    elif unit == "lt":
        m = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:lt|l)\b", t)
        if m:
            return _num(m.group(1))
        m = re.search(r"(\d+(?:[.,]\d+)?)\s*ml\b", t)
        if m:
            return _num(m.group(1)) / 1000.0
    elif unit == "adet":
        # "30'lu", "15 li", "10 adet" — folded metinde kesme işareti kalkar
        m = re.search(r"(\d+)\s*(?:'|’)?\s*(?:li|lu|adet)\b", t)
        if m:
            return float(m.group(1))
    elif unit == "paket":
        return 1.0  # paket bazlı malzemede ürün paketi 1 paket sayılır
    return None


def _slug_of(url: str) -> str:
    return url.rsplit("/", 1)[-1].split("_p-")[0]


def _category_of(url: str) -> str:
    """URL'deki kategori segmenti: /kapida/<kategori>/<slug>_p-..."""
    m = re.search(r"/kapida/([^/]+)/", url)
    return m.group(1) if m else ""


# Gıda hammaddesi kategorileri öne alınır; atıştırmalık/çikolata gibi işlenmiş ürünler
# ("Ülker Pirinç Patlaklı Çikolata" vb.) yanlış eşleşmesin diye bonus almaz.
_CATEGORY_BONUS = {
    "meyve-sebze": 3,
    "temel-gida": 3,
    "et-tavuk-sarkuteri": 3,
    "et-tavuk-balik": 3,
    "sut-kahvaltilik": 3,
    "ekmek-pastane": 2,
    "dondurulmus-urunler": 1,
}

# Skorlamada anlamsız sayılan slug parçaları (miktar/birim/bağlaç)
_SLUG_NOISE = {"g", "gr", "kg", "ml", "l", "lt", "adet", "li", "lu", "x", "ve", "ile"}


def find_products(ingredient_name: str, unit: str, limit: int = 6, require_unit: bool = True) -> list[dict]:
    """Katalogda malzeme adına ve birimine uygun ürünleri skor sırasıyla döndürür.
    (Birden çok aday: ilk sıradaki stok dışıysa/fiyatı 0 dönerse sonraki denenir.)
    require_unit=False: birim çözülemese de isim eşleşen ürünler döner (ör. bizde kg
    kayıtlı Marul, A101'de adetle satılır) — kayıt 'birim eşleşmedi' olarak işaretlenir."""
    catalog = _load_catalog()
    tokens = [w for w in re.split(r"[^a-z0-9]+", _fold(ingredient_name)) if len(w) >= 3]
    if not tokens:
        return []

    scored: list[tuple[tuple, str, float]] = []
    for url in catalog:
        slug = _slug_of(url)
        s = " " + slug.replace("-", " ") + " "
        slug_words = [w for w in slug.split("-") if w and not w.replace(",", "").replace(".", "").isdigit() and w not in _SLUG_NOISE]

        matched = 0
        for tk in tokens:
            if f" {tk} " in s or tk in s.replace(" ", ""):
                matched += 2
            elif len(tk) >= 4 and tk[:4] in s:
                matched += 1
        if matched == 0:
            continue
        # Ana kelime (ilk token) mutlaka üründe geçmeli
        if tokens[0] not in s and (len(tokens[0]) < 4 or tokens[0][:4] not in s):
            continue

        qty = parse_pack_quantity(slug, unit)
        if (qty is None or qty <= 0) and require_unit:
            continue  # birim eşleşmesi zorunlu (ilk geçiş)

        # Alakasız kelime cezası: "pirinç" ararken "çikolata/patlaklı" gibi fazladan
        # kelimesi çok olan ürünler geriye düşer (marka adı 1-2 kelime toleranslı).
        unmatched_words = 0
        for w in slug_words:
            if not any(tk in w or w in tk or (len(tk) >= 4 and w.startswith(tk[:4])) for tk in tokens):
                unmatched_words += 1

        score = matched * 10 + _CATEGORY_BONUS.get(_category_of(url), 0) * 5 - unmatched_words * 2
        # kg/lt malzemede çok küçük paketler (ör. 14 g çikolata) gerçekçi değildir
        if unit in ("kg", "lt") and qty is not None and qty < 0.2:
            score -= 8
        pack_deviation = abs(qty - 1.0) if qty is not None else 99.0

        scored.append(((score, -pack_deviation), url, qty))

    scored.sort(key=lambda c: c[0], reverse=True)
    return [{"url": url, "pack_quantity": qty} for _, url, qty in scored[:limit]]


def fetch_price(product_url: str) -> dict:
    """Ürün sayfasından güncel fiyatı ve ürün adını çeker (JSON-LD schema.org/Product)."""
    html = _http_get(product_url, timeout=25)

    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        try:
            data = json.loads(m.group(1))
        except Exception:
            continue
        if isinstance(data, dict) and data.get("@type") == "Product":
            offers = data.get("offers") or {}
            price_raw = str(offers.get("price") or "").strip()
            if not price_raw:
                continue
            return {
                "name": (data.get("name") or "").strip(),
                "price": _num(price_raw),
                "available": "InStock" in str(offers.get("availability") or ""),
            }

    # JSON-LD bulunamazsa kaba fiyat deseni dene
    m = re.search(r'"price"\s*:\s*"([\d.,]+)"', html)
    if m:
        return {"name": "", "price": _num(m.group(1)), "available": True}
    raise A101Error("Ürün sayfasından fiyat okunamadı.")


def fetch_ingredient_market_price(ingredient_name: str, unit: str, product_url: str | None = None) -> dict:
    """Bir malzeme için A101 fiyatını getirir. Bilinen product_url önce denenir;
    fiyat 0/stok dışı dönerse (veya url yoksa) katalogda arayıp sıradaki uygun
    adaylara geçer — geçerli (fiyat > 0) ilk ürün kazanır."""
    candidate_urls: list[str] = []
    if product_url:
        candidate_urls.append(product_url)
    for cand in find_products(ingredient_name, unit, limit=6):
        if cand["url"] not in candidate_urls:
            candidate_urls.append(cand["url"])

    # Birimi uyumlu ürün yoksa (ör. bizde kg olan Marul A101'de adetle satılır) hata
    # verme: isim eşleşen en iyi ürünü al, kayıt 'birim eşleşmedi' olarak işaretlenir.
    if not candidate_urls:
        for cand in find_products(ingredient_name, unit, limit=6, require_unit=False):
            if cand["url"] not in candidate_urls:
                candidate_urls.append(cand["url"])

    if not candidate_urls:
        raise A101Error(
            f"A101 kataloğunda '{ingredient_name}' için ürün bulunamadı."
        )

    chosen_url, info = None, None
    for url in candidate_urls:
        try:
            data = fetch_price(url)
        except Exception:
            continue
        if data["price"] > 0:
            chosen_url, info = url, data
            break

    if info is None:
        raise A101Error(
            f"'{ingredient_name}' için bulunan A101 ürünlerinin hiçbirinde geçerli fiyat yok (stok dışı olabilir)."
        )

    # Birim doğrulaması: önce ürün adından, olmazsa slug'dan
    qty = parse_pack_quantity(info.get("name") or "", unit)
    if qty is None:
        qty = parse_pack_quantity(_slug_of(chosen_url), unit)
    unit_matched = qty is not None and qty > 0
    unit_price = round(info["price"] / qty, 2) if unit_matched else None

    return {
        "product_url": chosen_url,
        "product_name": info.get("name") or _slug_of(chosen_url).replace("-", " ").title(),
        "pack_quantity": qty,
        "pack_unit": unit,
        "last_price": info["price"],
        "unit_price": unit_price,
        "unit_matched": unit_matched,
    }

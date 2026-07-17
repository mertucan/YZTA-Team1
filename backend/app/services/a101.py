"""A101 (Kapıda) fiyat scraper'ı — auto-healing (kendini onaran) sürüm.

Tasarım:
- HTTP: A101, httpx/requests TLS parmak izini 403'ler; sistem curl'ü (schannel) geçer.
- Katalog: resmi sitemap'lerden (~10.000 ürün URL'si), 24 saat önbellekli.
- Birim: ürün adı/slug'ından GERÇEK satış birimi tespit edilir (kg/lt/adet). Malzemenin
  birimi farklıysa çağıran (router) malzemenin birimini bu gerçek birime eşitler.
- Fiyat: birden çok "strateji" ile çıkarılır (JSON-LD, meta, fiyat-anahtarı, para-birimi).
  Uydurma YOK: yalnızca sayfada gerçekten bulunan fiyat döner; bulunamazsa hata.
- AUTO-HEALING: tüm stratejiler başarısız olursa (site yapısı değişmiş demektir) `heal()`
  devreye girer: sayfadaki fiyatı sezgisel olarak keşfeder, gerekiyorsa Gemini'den yeni bir
  regex ister, doğrular ve "öğrenilmiş strateji" olarak kalıcı kaydeder (a101_learned.json).
  Sonraki çekimler bu öğrenilmiş stratejiyi de kullanır — scraper kendini onarmış olur.
"""
import json
import os
import re
import subprocess
import time
from datetime import datetime, timezone

SITEMAP_URLS = [
    "https://www.a101.com.tr/sitemaps/products-kapida-1.xml",
    "https://www.a101.com.tr/sitemaps/products-kapida-2.xml",
]

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

CATALOG_TTL_SECONDS = 24 * 3600
_LEARNED_PATH = os.path.join(os.path.dirname(__file__), "a101_learned.json")
_PRICE_MIN, _PRICE_MAX = 0.5, 200000.0  # makul fiyat aralığı (uydurma/çöp filtresi)

_catalog: list[str] = []
_catalog_loaded_at: float = 0.0


class A101Error(Exception):
    pass


# ─────────────────────────── HTTP ───────────────────────────
def _http_get(url: str, timeout: int = 30) -> str:
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
    return (text or "").translate(_TR_FOLD).lower()


def _num(raw: str) -> float:
    raw = str(raw).strip()
    # "1.234,56" (TR) veya "1234.56" — son ayraç ondalıktır
    if "," in raw and "." in raw:
        raw = raw.replace(".", "").replace(",", ".")
    else:
        raw = raw.replace(",", ".")
    return float(raw)


def _plausible(price) -> bool:
    try:
        return _PRICE_MIN <= float(price) <= _PRICE_MAX
    except Exception:
        return False


# ─────────────────────────── Katalog ───────────────────────────
def _load_catalog() -> list[str]:
    global _catalog, _catalog_loaded_at
    if _catalog and (time.time() - _catalog_loaded_at) < CATALOG_TTL_SECONDS:
        return _catalog
    urls: list[str] = []
    for sitemap in SITEMAP_URLS:
        try:
            urls.extend(re.findall(r"<loc>(https://[^<]+)</loc>", _http_get(sitemap, timeout=45)))
        except Exception:
            continue
    if not urls:
        if _catalog:
            return _catalog
        raise A101Error("A101 ürün kataloğu (sitemap) alınamadı.")
    _catalog = urls
    _catalog_loaded_at = time.time()
    return _catalog


def _slug_of(url: str) -> str:
    return url.rsplit("/", 1)[-1].split("_p-")[0]


def _category_of(url: str) -> str:
    m = re.search(r"/kapida/([^/]+)/", url)
    return m.group(1) if m else ""


# ─────────────────────── Birim tespiti ───────────────────────
def detect_product_unit(text: str, fallback_unit: str | None = None) -> dict | None:
    """Ürün adından/slug'ından GERÇEK satış birimini ve o birim cinsinden paket miktarını
    döndürür: {"unit": "kg"|"lt"|"adet", "quantity": float}. Çözülemezse None (uydurma yok).
    fallback_unit='paket' ve sayısal boyut yoksa 1 paket kabul edilir."""
    t = " " + _fold(text).replace("-", " ").replace("_", " ").replace("*", " ") + " "

    m = re.search(r"(\d+(?:[.,]\d+)?)\s*kg\b", t)
    if m:
        return {"unit": "kg", "quantity": _num(m.group(1))}
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:gr|g)\b", t)
    if m:
        return {"unit": "kg", "quantity": _num(m.group(1)) / 1000.0}
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:lt|l)\b", t)
    if m:
        return {"unit": "lt", "quantity": _num(m.group(1))}
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*ml\b", t)
    if m:
        return {"unit": "lt", "quantity": _num(m.group(1)) / 1000.0}
    # sayı + adet/li/lu (kesme işareti folded metinde kalkar): "15 li", "30 adet", "6 lu"
    m = re.search(r"(\d+)\s*(?:li|lu|adet)\b", t)
    if m:
        return {"unit": "adet", "quantity": float(m.group(1))}
    # manav ürünü: sayısız "kg" = kilosu
    if re.search(r"\bkg\b", t):
        return {"unit": "kg", "quantity": 1.0}
    if re.search(r"\badet\b", t):
        return {"unit": "adet", "quantity": 1.0}
    if fallback_unit == "paket":
        return {"unit": "paket", "quantity": 1.0}
    return None


# ─────────────────── İsim tabanlı ürün eşleştirme ───────────────────
_CATEGORY_BONUS = {
    "meyve-sebze": 6, "temel-gida": 3, "et-tavuk-sarkuteri": 3, "et-tavuk-balik": 3,
    "sut-kahvaltilik": 3, "sut-urunleri-kahvaltilik": 3, "ekmek-pastane": 2,
    "dondurulmus-urunler": 1, "dondurulmus": 1,
}

# Gıda dışı kategoriler tamamen elenir (elma bulaşık deterjanı, mandalina duş jeli vb.).
_CATEGORY_BLOCK = {
    "temizlik-urunleri", "kisisel-bakim", "kozmetik", "kozmetik-kisisel-bakim",
    "elektronik", "ev-yasam", "ev-yasam-kirtasiye", "oyuncak", "giyim", "tekstil",
    "kirtasiye", "pet-shop", "pet", "bahce", "hirdavat", "otomotiv", "anne-bebek",
}
_SLUG_NOISE = {"g", "gr", "kg", "ml", "l", "lt", "adet", "li", "lu", "x", "ve", "ile"}

# Ham malzemeden bariz farklı ürünler: bunlardan biri (malzeme adında yoksa) geçiyorsa
# ürün büyük ceza alır — "Kivi" için "kivi aromalı limonata", "Elma" için "elma sirkesi",
# "Karnabahar" için "çikolatalı ... karnabahar dondurma" gibi eşleşmeler elenir.
# Önek olarak eşleşir (ör. "recel" -> "receli", "sirke" -> "sirkesi").
_DISQUALIFY = (
    "aromali", "aroma", "limonata", "gazoz", "kola", "cola", "soda", "fanta", "icecek",
    "mesrubat", "nektar", "ayran", "sirke", "cikolata", "dondurma", "sekerleme", "cips",
    "kraker", "biskuvi", "gofret", "jelibon", "sakiz", "cerez", "kuruyemis", "tursu",
    "recel", "marmelat", "suyu", "meyve", "smoothie", "kokteyl", "surup",
)


def _is_disqualified_word(w: str) -> bool:
    return any(w == dq or w.startswith(dq) for dq in _DISQUALIFY)
_MIN_SCORE = 14  # bu eşiğin altındaki en iyi eşleşme "bulunamadı" sayılır (uydurma yok)


def find_products_by_name(ingredient_name: str, limit: int = 8) -> list[str]:
    """Katalogda isimce en uygun ürün URL'lerini skor sırasıyla döndürür (birim bağımsız).
    İşlenmiş/içecek ürünleri diskalifiye edilir; eşik altı kalırsa boş döner (uydurma yok)."""
    catalog = _load_catalog()
    tokens = [w for w in re.split(r"[^a-z0-9]+", _fold(ingredient_name)) if len(w) >= 2]
    if not tokens:
        return []

    scored: list[tuple[tuple, str]] = []
    for url in catalog:
        if _category_of(url) in _CATEGORY_BLOCK:
            continue  # gıda dışı ürünü hiç değerlendirme
        slug = _slug_of(url)
        slug_words = [
            w for w in slug.split("-")
            if w and not w.replace(",", "").replace(".", "").isdigit() and w not in _SLUG_NOISE
        ]
        if not slug_words:
            continue

        # Kademeli eşleşme. Birebir kelime, çekim ekinden ve kökten çok daha güçlüdür;
        # böylece "Yumurta" (isim, birebir) "Yumurtalı Erişte"nin (sıfat, kök) önüne geçer.
        def _match_tier(tk: str) -> int:
            if tk in slug_words:
                return 3  # birebir kelime
            if any(w.startswith(tk) and len(w) - len(tk) <= 1 for w in slug_words):
                return 2  # çekim eki: domates/domatesi, un/unu
            if len(tk) >= 4 and any(w.startswith(tk[:4]) for w in slug_words):
                return 1  # kök: yumurta~yumurtali (zayıf)
            return 0

        main_tier = _match_tier(tokens[0])
        if main_tier == 0:
            continue  # ana kelime hiç geçmiyorsa ele
        # Ana kelime: birebir 20, çekim 12, kök 5 (kök zayıf → kategori bonusu ezemesin)
        score = {3: 20, 2: 12, 1: 5}[main_tier]
        for tk in tokens[1:]:
            score += {3: 4, 2: 2, 1: 1, 0: 0}[_match_tier(tk)]

        # İşlenmiş/içecek diskalifiye kelimeleri (malzeme adında olmayan) ağır ceza alır
        disq = sum(1 for w in slug_words if w not in tokens and _is_disqualified_word(w))
        unmatched = sum(
            1 for w in slug_words
            if not any(w.startswith(tk[:4]) or tk.startswith(w[:4]) for tk in tokens if len(tk) >= 3)
        )
        det = detect_product_unit(slug)
        tiny_penalty = 6 if (det and det["unit"] in ("kg", "lt") and det["quantity"] < 0.2) else 0
        score += _CATEGORY_BONUS.get(_category_of(url), 0) - unmatched * 2 - tiny_penalty - disq * 14
        pack_dev = abs((det["quantity"] if det else 1.0) - 1.0)
        scored.append(((score, -pack_dev), url))

    scored.sort(key=lambda c: c[0], reverse=True)
    # Eşik altı en iyi eşleşme = "bulunamadı" (Fanta/sirke/çikolata gibi çöpe düşmemek için)
    return [url for (score, _pack_dev), url in scored if score >= _MIN_SCORE][:limit]


# ─────────────── Fiyat çıkarma stratejileri (built-in) ───────────────
def _extract_name(html: str) -> str:
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        try:
            data = json.loads(m.group(1))
        except Exception:
            continue
        if isinstance(data, dict) and data.get("@type") == "Product" and data.get("name"):
            return str(data["name"]).strip()
    m = re.search(r'<meta property="og:title" content="([^"]+)"', html)
    return m.group(1).strip() if m else ""


def _s_jsonld(html: str):
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        try:
            data = json.loads(m.group(1))
        except Exception:
            continue
        if isinstance(data, dict) and data.get("@type") == "Product":
            offers = data.get("offers") or {}
            if isinstance(offers, list):
                offers = offers[0] if offers else {}
            raw = str(offers.get("price") or "").strip()
            if raw:
                try:
                    v = _num(raw)
                    if _plausible(v):
                        return v, "InStock" in str(offers.get("availability") or "")
                except Exception:
                    pass
    return None


def _s_meta(html: str):
    m = re.search(r'<meta[^>]+(?:product:price:amount|og:price:amount)[^>]+content="([\d.,]+)"', html)
    if not m:
        m = re.search(r'content="([\d.,]+)"[^>]+(?:product:price:amount|og:price:amount)', html)
    if m:
        try:
            v = _num(m.group(1))
            if _plausible(v):
                return v, True
        except Exception:
            pass
    return None


def _s_pricekey(html: str):
    m = re.search(r'"price"\s*:\s*"?([\d.,]+)"?', html)
    if m:
        try:
            v = _num(m.group(1))
            if _plausible(v):
                return v, True
        except Exception:
            pass
    return None


def _s_currency(html: str):
    for pat in (r"([\d.]{1,9},\d{2})\s*(?:TL|₺)", r"(?:TL|₺)\s*([\d.]{1,9},\d{2})"):
        m = re.search(pat, html)
        if m:
            try:
                v = _num(m.group(1))
                if _plausible(v):
                    return v, True
            except Exception:
                pass
    return None


_BUILTIN_STRATEGIES = [
    ("jsonld", _s_jsonld),
    ("meta", _s_meta),
    ("pricekey", _s_pricekey),
    ("currency", _s_currency),
]


# ─────────────── Öğrenilmiş stratejiler (kalıcı) ───────────────
def _load_learned() -> dict:
    try:
        with open(_LEARNED_PATH, encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict) and isinstance(data.get("strategies"), list):
                return data
    except Exception:
        pass
    return {"strategies": []}


_learned = _load_learned()


def _save_learned() -> None:
    try:
        with open(_LEARNED_PATH, "w", encoding="utf-8") as f:
            json.dump(_learned, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


def _register_learned(pattern: str, group: int, note: str) -> None:
    if any(s["pattern"] == pattern for s in _learned["strategies"]):
        return
    _learned["strategies"].insert(0, {
        "pattern": pattern, "group": group, "note": note,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    _learned["strategies"] = _learned["strategies"][:20]
    _save_learned()


def _apply_learned(strat: dict, html: str):
    try:
        m = re.search(strat["pattern"], html)
    except re.error:
        return None
    if m:
        try:
            v = _num(m.group(strat.get("group", 1)))
            if _plausible(v):
                return v, True
        except Exception:
            pass
    return None


# ─────────────── Fiyat çıkarma (strateji zinciri + healing) ───────────────
def _extract_price(html: str, allow_heal: bool = True) -> dict | None:
    """Öğrenilmiş → built-in strateji sırasıyla ilk geçerli fiyatı döndürür.
    Hiçbiri çalışmazsa ve allow_heal=True ise auto-healing devreye girer."""
    for strat in _learned["strategies"]:
        r = _apply_learned(strat, html)
        if r:
            return {"price": r[0], "available": r[1], "_strategy": f"learned:{strat.get('note', '?')}"}
    for name, fn in _BUILTIN_STRATEGIES:
        try:
            r = fn(html)
        except Exception:
            r = None
        if r:
            return {"price": r[0], "available": r[1], "_strategy": name}
    if allow_heal and heal(html):
        return _extract_price(html, allow_heal=False)
    return None


def fetch_price(product_url: str) -> dict:
    """Ürün sayfasını çeker, fiyatı+adını çıkarır (gerekirse kendini onararak)."""
    html = _http_get(product_url, timeout=25)
    res = _extract_price(html, allow_heal=True)
    if not res:
        raise A101Error("Ürün sayfasından fiyat okunamadı (scraper onarılamadı).")
    return {"name": _extract_name(html), "price": res["price"],
            "available": res["available"], "strategy": res.get("_strategy")}


# ─────────────────────── AUTO-HEALING AGENT ───────────────────────
def _price_context(html: str, window: int = 220) -> str:
    """HTML'de fiyat geçebilecek bölgelerin kısa kesitlerini toplar (Gemini'ye gönderilir)."""
    idxs = []
    for kw in ("₺", "\"price\"", "salePrice", "sellingPrice", "TL"):
        start = 0
        for _ in range(4):
            i = html.find(kw, start)
            if i == -1:
                break
            idxs.append(i)
            start = i + 1
    idxs = sorted(set(idxs))[:12]
    return "\n---\n".join(html[max(0, i - window):i + window] for i in idxs)[:6000]


def _heal_heuristic(html: str) -> dict | None:
    """Built-in'ler dışında kalan fiyat anahtarlarını/para-birimi desenlerini keşfeder."""
    candidates: list[tuple[str, int, str, float]] = []
    for key in ("salePrice", "sellingPrice", "discountedPrice", "finalPrice",
                "unitPrice", "listPrice", "amount", "value"):
        pat = r'"%s"\s*:\s*"?([\d.,]+)"?' % key
        m = re.search(pat, html)
        if m:
            try:
                v = _num(m.group(1))
            except Exception:
                continue
            if _plausible(v):
                candidates.append((pat, 1, f"key:{key}", v))
    for pat in (r"([\d.]{1,9},\d{2})\s*(?:TL|₺)", r"(?:TL|₺)\s*([\d.]{1,9},\d{2})"):
        m = re.search(pat, html)
        if m:
            try:
                v = _num(m.group(1))
            except Exception:
                continue
            if _plausible(v):
                candidates.append((pat, 1, "currency", v))
    if not candidates:
        return None
    # "sale/selling" gibi indirimli fiyat anahtarlarını öne al
    candidates.sort(key=lambda c: (0 if any(k in c[2] for k in ("sale", "selling", "final", "discount")) else 1))
    pat, grp, note, val = candidates[0]
    return {"pattern": pat, "group": grp, "note": f"heuristic:{note}", "sample": val}


def _extract_regex_from_reply(text: str) -> str | None:
    if not text:
        return None
    text = text.strip()
    m = re.search(r"```(?:regex|python)?\s*(.+?)```", text, re.S)
    if m:
        text = m.group(1).strip()
    text = text.splitlines()[0].strip() if text else ""
    text = text.strip("`").strip()
    if "(" in text and len(text) < 400:
        try:
            re.compile(text)
            return text
        except re.error:
            return None
    return None


def _heal_gemini(html: str) -> dict | None:
    """LLM destekli onarım: sayfa kesitini Gemini'ye verip fiyatı yakalayan bir regex ister."""
    try:
        from app.config import settings
    except Exception:
        return None
    if not getattr(settings, "gemini_api_key", None):
        return None
    snippet = _price_context(html)
    if not snippet:
        return None
    prompt = (
        "Aşağıda bir e-ticaret ürün sayfasının HTML kesitleri var. Ürünün GÜNCEL SATIŞ "
        "FİYATINI (ondalıklı sayı) yakalayan, Python `re` ile uyumlu TEK BİR regex yaz. "
        "Fiyat 1. yakalama grubunda (group 1) olsun. SADECE regex'i döndür, açıklama yazma.\n\n"
        + snippet
    )
    try:
        from google import genai
        client = genai.Client(api_key=settings.gemini_api_key)
        resp = client.models.generate_content(model=settings.gemini_model, contents=prompt)
        pat = _extract_regex_from_reply(getattr(resp, "text", "") or "")
        if not pat:
            return None
        m = re.search(pat, html)
        if m:
            v = _num(m.group(1))
            if _plausible(v):
                return {"pattern": pat, "group": 1, "note": "gemini", "sample": v}
    except Exception:
        return None
    return None


def heal(html: str) -> dict | None:
    """Auto-healing ajanı: önce sezgisel, olmazsa Gemini ile yeni bir fiyat-çıkarma
    stratejisi keşfeder, canlı sayfada doğrular ve kalıcı olarak öğrenir."""
    found = _heal_heuristic(html) or _heal_gemini(html)
    if found:
        _register_learned(found["pattern"], found["group"], found["note"])
    return found


# ─────────────────────── Sağlık / self-heal ───────────────────────
def diagnose(force_heal: bool = False) -> dict:
    """Scraper sağlığını kanarya ürünle kontrol eder; bozuksa onarmayı dener."""
    report = {
        "catalog_ok": False, "catalog_size": 0, "sample_url": None,
        "extraction_ok": False, "strategy_used": None, "price_sample": None,
        "healed": False, "learned_count": len(_learned["strategies"]),
        "checked_at": datetime.now(timezone.utc).isoformat(), "message": "",
    }
    try:
        catalog = _load_catalog()
        report["catalog_ok"] = bool(catalog)
        report["catalog_size"] = len(catalog)
    except Exception as exc:
        report["message"] = f"Katalog alınamadı: {exc}"
        return report

    # 1) Mevcut stratejilerle bir ürün fiyatı okunabiliyor mu?
    for url in catalog[:20]:
        try:
            html = _http_get(url, timeout=20)
        except Exception:
            continue
        res = _extract_price(html, allow_heal=False)
        if res:
            report.update(sample_url=url, extraction_ok=True,
                          strategy_used=res.get("_strategy"), price_sample=res["price"])
            if not force_heal:
                report["message"] = "Scraper sağlıklı."
                return report
            break

    # 2) Okunamıyorsa (veya force) auto-healing dene
    for url in catalog[:12]:
        try:
            html = _http_get(url, timeout=20)
        except Exception:
            continue
        if heal(html):
            res = _extract_price(html, allow_heal=False)
            if res:
                report.update(sample_url=url, extraction_ok=True, healed=True,
                              strategy_used=res.get("_strategy"), price_sample=res["price"],
                              learned_count=len(_learned["strategies"]))
                report["message"] = "Scraper bozulmuştu; auto-healing ile yeni strateji öğrenildi."
                return report

    if report["extraction_ok"]:
        report["message"] = "Scraper sağlıklı (mevcut stratejiler çalışıyor)."
    else:
        report["message"] = "Scraper fiyat çıkaramıyor ve otomatik onarılamadı."
    return report


# ─────────────────────── Orkestrasyon ───────────────────────
def fetch_ingredient_market_price(ingredient_name: str, unit: str, product_url: str | None = None) -> dict:
    """Malzeme için A101 ürününü bulur, fiyatını çeker ve GERÇEK satış birimini tespit eder.
    Dönüş: detected_unit (A101'in birimi), pack_quantity, last_price, unit_price.
    Uydurma yok: fiyat sayfadan gerçekten okunamazsa hata; birim çözülemezse unit_price=None."""
    candidate_urls: list[str] = []
    if product_url:
        candidate_urls.append(product_url)
    for url in find_products_by_name(ingredient_name, limit=8):
        if url not in candidate_urls:
            candidate_urls.append(url)

    if not candidate_urls:
        raise A101Error(f"A101'de '{ingredient_name}' için ürün bulunamadı.")

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
            f"'{ingredient_name}' için A101'de geçerli fiyatlı ürün bulunamadı."
        )

    # GERÇEK satış birimini tespit et (uydurma yok): önce ürün adından, sonra slug'dan
    det = detect_product_unit(info.get("name") or "", fallback_unit=unit) \
        or detect_product_unit(_slug_of(chosen_url), fallback_unit=unit)
    detected_unit = det["unit"] if det else None
    qty = det["quantity"] if det else None
    unit_price = round(info["price"] / qty, 2) if (qty and qty > 0) else None

    return {
        "product_url": chosen_url,
        "product_name": info.get("name") or _slug_of(chosen_url).replace("-", " ").title(),
        "detected_unit": detected_unit,     # A101'in sattığı gerçek birim (None = çözülemedi)
        "pack_quantity": qty,
        "last_price": info["price"],
        "unit_price": unit_price,
        "strategy": info.get("strategy"),
    }

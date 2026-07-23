"""Migros (online market) fiyat çekici — public JSON API.

Neden Migros: A101 canlı fiyatları Cloudflare + Firebase App Check + reCAPTCHA
Enterprise ile korunuyor (sunucudan alınamaz). Migros ise fiyatları auth'suz,
captcha'sız, düz bir JSON API ile veriyor:
  GET https://www.migros.com.tr/rest/products/search?q=<ürün>
Dönüş: data.storeProductInfos[] — her ürün: name, unit, unitAmount, shownPrice
(kuruş), regularPrice (kuruş), unitPrice ("(138,00 TL/Kg)" normalize string), prettyName.

Uydurma yok: fiyat gerçekten API'den okunur; zayıf eşleşme 'güvenilmez' işaretlenir.
Self-healing: JSON alan adları değişirse (shownPrice→sellingPrice vb.) alternatifleri
dener ve diagnose() bozulmayı raporlar.
"""
import json
import os
import re
import subprocess
from urllib.parse import quote

SEARCH_URL = "https://www.migros.com.tr/rest/products/search"
PRODUCT_URL_BASE = "https://www.migros.com.tr/"

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

# Fiyat/liste alanları için sıralı adaylar. Migros bunları yeniden adlandırırsa
# LLM auto-healing (aşağıda) yenisini KEŞFEDİP bu listelere kalıcı ekler.
_PRICE_FIELDS = ["shownPrice", "regularPrice", "sellingPrice", "price"]
_LIST_FIELDS = ["storeProductInfos", "products", "hits", "items"]
_NAME_FIELDS = ["name", "displayName", "title"]

# LLM ile öğrenilen alan adları burada kalıcılaşır (scraper bir daha LLM harcamasın)
_LEARNED_PATH = os.path.join(os.path.dirname(__file__), "migros_learned.json")


def _load_learned() -> None:
    """Daha önce LLM ile keşfedilmiş alan adlarını yükleyip aday listelerine ekler."""
    try:
        with open(_LEARNED_PATH, encoding="utf-8") as f:
            data = json.load(f)
        for fld in data.get("list_fields", []):
            if fld not in _LIST_FIELDS:
                _LIST_FIELDS.insert(0, fld)
        for fld in data.get("price_fields", []):
            if fld not in _PRICE_FIELDS:
                _PRICE_FIELDS.insert(0, fld)
        for fld in data.get("name_fields", []):
            if fld not in _NAME_FIELDS:
                _NAME_FIELDS.insert(0, fld)
    except Exception:
        pass


def _save_learned(list_field: str | None, price_field: str | None, name_field: str | None) -> None:
    try:
        data = {"list_fields": [], "price_fields": [], "name_fields": []}
        try:
            with open(_LEARNED_PATH, encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            pass
        for key, val in (("list_fields", list_field), ("price_fields", price_field), ("name_fields", name_field)):
            if val and val not in data.get(key, []):
                data.setdefault(key, []).append(val)
        with open(_LEARNED_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


_load_learned()


# Günlük malzeme adı ↔ Migros perakende adı farklı olan ürünler için eş-anlam.
# Anahtar: malzeme adında GEÇEN ifade. Değer: ek arama terimleri; bu terimlerin
# kelimeleri de "geçerli eşleşme" sayılır. Ör. "Tavuk Göğsü" → "Piliç Bonfile Kg"
# ürününü bulur ve doğru eşleşme kabul eder (füme/tatlı/bulyon yerine ham et).
_INGREDIENT_ALIASES: dict[str, list[str]] = {
    "tavuk göğsü": ["piliç bonfile", "tavuk bonfile"],
    "tavuk göğüs": ["piliç bonfile", "tavuk bonfile"],
    "tavuk but": ["piliç but"],
    "tavuk": ["piliç"],
    "dana kıyma": ["dana kıyma"],
    "kıyma": ["dana kıyma"],
    "salatalık": ["hıyar"],       # Migros'ta taze salatalık "Hıyar Kg" adıyla
    "salatalik": ["hıyar"],
}


class MigrosError(Exception):
    pass


# ─────────────────────────── HTTP ───────────────────────────
def _http_get_json(url: str, timeout: int = 25) -> dict:
    cmd = ["curl", "-s", "-L", "--max-time", str(timeout),
           "-H", f"User-Agent: {_UA}", "-H", "Accept: application/json", url]
    try:
        res = subprocess.run(cmd, capture_output=True, timeout=timeout + 15)
    except Exception as exc:
        raise MigrosError(f"Migros isteği başarısız: {exc}") from exc
    if res.returncode != 0 or not res.stdout:
        raise MigrosError(f"Migros isteği başarısız (curl kodu {res.returncode}).")
    try:
        return json.loads(res.stdout.decode("utf-8", errors="ignore"))
    except json.JSONDecodeError as exc:
        raise MigrosError(f"Migros yanıtı JSON değil: {exc}") from exc


def _product_list(payload: dict) -> list[dict]:
    """API yanıtından ürün listesini bulur (alan adı değişse de dener)."""
    data = payload.get("data") or payload
    if isinstance(data, dict):
        for f in _LIST_FIELDS:
            if isinstance(data.get(f), list):
                return data[f]
    return []


def _name_of(p: dict) -> str:
    for f in _NAME_FIELDS:
        v = p.get(f)
        if isinstance(v, str) and v:
            return v
    return ""


# ───────────────── LLM AUTO-HEALING (yalnızca şekil bozulunca) ─────────────────
def _heal_with_llm(payload: dict) -> bool:
    """Migros JSON şekli değişip ürün listesi/fiyat alanı TANINMAZSA, Gemini'den doğru
    alan adlarını keşfetmesini ister; doğrularsa kalıcı öğrenir. Yalnızca çekim başarısız
    olduğunda çağrılır — normal akışta LLM HİÇ harcanmaz (kullanıcı isteği)."""
    try:
        from app.config import settings
    except Exception:
        return False
    if not getattr(settings, "gemini_api_key", None):
        return False
    sample = json.dumps(payload, ensure_ascii=False)[:6000]
    prompt = (
        "Bir e-ticaret arama API'sinin JSON yanıtı aşağıda. Ürün listesini tutan dizinin "
        "anahtar adını, ve bir ürün nesnesinde ÜRÜN ADINI ve FİYATINI (tam sayı kuruş) tutan "
        "alan adlarını bul. SADECE şu JSON ile yanıt ver, başka hiçbir şey yazma:\n"
        '{"list_field":"...","name_field":"...","price_field":"..."}\n\n' + sample
    )
    try:
        from google import genai
        client = genai.Client(api_key=settings.gemini_api_key)
        resp = client.models.generate_content(model=settings.gemini_model, contents=prompt)
        m = re.search(r"\{.*\}", getattr(resp, "text", "") or "", re.S)
        if not m:
            return False
        found = json.loads(m.group(0))
        lf, nf, pf = found.get("list_field"), found.get("name_field"), found.get("price_field")
        data = payload.get("data") or payload
        # Doğrula: keşfedilen alanlarla gerçekten ürün listesi geliyor mu?
        if lf and isinstance(data, dict) and isinstance(data.get(lf), list) and data[lf]:
            if lf not in _LIST_FIELDS: _LIST_FIELDS.insert(0, lf)
            if nf and nf not in _NAME_FIELDS: _NAME_FIELDS.insert(0, nf)
            if pf and pf not in _PRICE_FIELDS: _PRICE_FIELDS.insert(0, pf)
            _save_learned(lf, pf, nf)
            return True
    except Exception:
        return False
    return False


# ─────────────────────── İsim eşleşme güveni ───────────────────────
_TR_FOLD = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")
_NOISE = {"g", "gr", "kg", "ml", "l", "lt", "adet", "li", "lu", "x", "ve",
          "ile", "paket", "kutu", "diger", "diğer"}

# İşlenmiş/hazır/özel ürün işaretçileri: malzeme adında yoksa ürün ceza alır.
# Ör. "Patates" için "parmak patates" (donmuş kızartma), "Tavuk" için "tavuk füme"
# (şarküteri), "Makarna" için "vitaminli/glutensiz" özel ürünler elenir.
_DISQUALIFY = {
    "fume", "parmak", "dondurulmus", "kizartma", "kizartmalik", "aromali", "aroma",
    "vitaminli", "glutensiz", "bulyon", "cesni", "soslu", "salca",
    "recel", "marmelat", "konserve", "tursu", "cips", "kraker", "gofret",
    "biskuvi", "cikolata", "dondurma", "hazir", "kavrulmus",
    "kurutulmus", "pure", "haslanmis", "izgara", "sote", "kofte", "schnitzel", "nugget",
    "smoothie", "nektar", "suyu", "icecek", "surup", "tatli", "marmelati",
    "mesrubat", "gazoz", "kola", "soda", "sekerleme", "jelibon", "sakiz",
    "meyveli", "meyvelim", "limonata", "aromali", "fanta", "schweppes",
    "frutti", "pet",  # içecek işaretçileri (PET şişe / meyveli içecek)
    "kefir", "kokulu", "mendil", "kokteyl", "puf",  # aromalı/kozmetik ürün işaretçileri
}


# Ham malzeme için UYGUNSUZ Migros kategorileri (ürün adı ne olursa olsun elenir).
# Migros'un kendi taksonomisini kullanır — isim anahtar-kelime tahmininden çok daha sağlam.
# Ör. "Mandalina" için tüm sonuçlar İçecek/Reçel kategorisindeyse hiçbiri kabul edilmez.
_BLOCKED_CATEGORIES = {
    "içecek", "icecek", "temizlik", "kozmetik", "kişisel bakım", "kisisel bakim",
    "kağıt", "kagit", "pet shop", "petshop", "bebek", "ev, yaşam", "ev yasam",
    "reçel", "recel", "marmelat", "dondurma", "çikolata", "cikolata", "gofret",
    "şekerleme", "sekerleme", "cips", "kraker", "bisküvi", "biskuvi", "sakız", "sakiz",
    "kuruyemiş", "kuruyemis", "atıştırmalık", "atistirmalik", "ciklet", "sos", "çeşni", "cesni",
}


def _category_chain(p: dict) -> list[str]:
    asc = p.get("categoryAscendants") or []
    names = [(a.get("name") or "").lower() for a in asc if isinstance(a, dict)]
    cat = p.get("category")
    if isinstance(cat, dict) and cat.get("name"):
        names.append(cat["name"].lower())
    return names


def _category_blocked(p: dict) -> str | None:
    """Ürün gıda-dışı/işlenmiş bir kategorideyse o kategori adını döndürür (yoksa None)."""
    for name in _category_chain(p):
        for blocked in _BLOCKED_CATEGORIES:
            if blocked in name:
                return name
    return None


def _disq_words(product_name: str, ing_words: set[str]) -> list[str]:
    """Ürün adındaki işlenmiş/hazır ürün işaretçileri (önek eşleşmeli, malzeme adında
    olmayan). Ör. 'turşusu'→'tursu', 'tatlısı'→'tatli', 'marmelatı'→'marmelat'."""
    hits = []
    for w in _words(product_name):
        if w in ing_words:
            continue
        if any(len(d) >= 3 and w.startswith(d) for d in _DISQUALIFY):
            hits.append(w)
    return hits


def _fold(text: str) -> str:
    return (text or "").translate(_TR_FOLD).lower()


def _words(text: str) -> list[str]:
    return [w for w in re.split(r"[^a-z0-9]+", _fold(text))
            if w and w not in _NOISE and not w.replace(",", "").replace(".", "").isdigit()]


def _token_matched(token: str, words: list[str]) -> bool:
    if token in words:
        return True
    if any(w.startswith(token) and len(w) - len(token) <= 1 for w in words):
        return True
    if len(token) >= 4 and any(w.startswith(token[:4]) for w in words):
        return True
    return False


def _tokens_of(text: str) -> list[str]:
    return [w for w in re.split(r"[^a-z0-9]+", _fold(text)) if len(w) >= 2 and w not in _NOISE]


def _coverage(tokens: list[str], words: list[str]) -> tuple[float, list[str]]:
    if not tokens:
        return 0.0, []
    missing = [t for t in tokens if not _token_matched(t, words)]
    return round(1.0 - len(missing) / len(tokens), 3), missing


def _acceptable_token_sets(ingredient_name: str) -> list[list[str]]:
    """Malzeme adının kendi kelimeleri + eş-anlamların kelimeleri. Ürün bunlardan
    HERHANGİ birini tam karşılıyorsa doğru eşleşme sayılır (tavuk göğsü ↔ piliç bonfile)."""
    folded = _fold(ingredient_name)
    sets = [_tokens_of(ingredient_name)]
    for key, aliases in _INGREDIENT_ALIASES.items():
        if _fold(key) in folded:
            for a in aliases:
                sets.append(_tokens_of(a))
    return [s for s in sets if s]


def match_confidence(ingredient_name: str, product_name: str) -> tuple[float, list[str]]:
    """Malzeme adının (veya eş-anlamının) kelimelerinden kaçı ürün adında geçiyor (0..1)?
    'Tavuk Göğsü' vs 'Piliç Bonfile Kg' → 'piliç bonfile' eş-anlamıyla 1.0.
    En yüksek kapsamı veren kelime setini seçer."""
    words = _words(product_name)
    best = (0.0, ["?"])
    for tokens in _acceptable_token_sets(ingredient_name):
        cov, missing = _coverage(tokens, words)
        if cov > best[0]:
            best = (cov, missing)
    return best


# ─────────────────────── Fiyat / birim çıkarımı ───────────────────────
def _shown_price_tl(p: dict) -> float:
    for f in _PRICE_FIELDS:
        v = p.get(f)
        if isinstance(v, (int, float)) and v > 0:
            return v / 100.0  # kuruş → TL
    return 0.0


def _parse_unit_price_str(s: str) -> tuple[float, str] | None:
    """'(138,00 TL/Kg)' → (138.0, 'kg'); '/Lt' → 'lt'; '/Adet' → 'adet'."""
    if not s:
        return None
    m = re.search(r"([\d.]+,\d+|\d+)\s*TL\s*/\s*(kg|lt|l|adet|gr|g)", s, re.I)
    if not m:
        return None
    val = float(m.group(1).replace(".", "").replace(",", "."))
    u = m.group(2).lower()
    unit = {"kg": "kg", "gr": "kg", "g": "kg", "lt": "lt", "l": "lt", "adet": "adet"}.get(u)
    if unit and val > 0:
        return round(val, 2), unit
    return None


def _pack_from_name(name: str) -> tuple[str, float] | None:
    """Ürün adından paket boyutunu çıkarır: '1 L'→('lt',1), '500 G'→('kg',0.5),
    '1.5 Kg'→('kg',1.5). Çözülemezse None."""
    t = " " + _fold(name).replace(",", ".") + " "
    m = re.search(r"(\d+(?:\.\d+)?)\s*kg\b", t)
    if m:
        return "kg", float(m.group(1))
    m = re.search(r"(\d+(?:\.\d+)?)\s*(?:gr|g)\b", t)
    if m:
        return "kg", float(m.group(1)) / 1000.0
    m = re.search(r"(\d+(?:\.\d+)?)\s*(?:lt|l)\b", t)
    if m:
        return "lt", float(m.group(1))
    m = re.search(r"(\d+(?:\.\d+)?)\s*ml\b", t)
    if m:
        return "lt", float(m.group(1)) / 1000.0
    return None


def _extract_price(p: dict) -> dict:
    """Ürünün gerçek satış birimini ve birim (kg/lt/adet) başına fiyatını çıkarır.
    Dönüş: last_price (TL, gösterilen), detected_unit, pack_quantity, unit_price."""
    last_price = _shown_price_tl(p)
    # 1) Normalize edilmiş birim fiyat string'i (paketli ürünlerde en güvenilir)
    parsed = _parse_unit_price_str(p.get("unitPrice") or "")
    if parsed:
        val, unit = parsed
        return {"last_price": last_price, "detected_unit": unit,
                "pack_quantity": None, "unit_price": val}
    # 2) Kütle/hacimle satılan (GRAM/MILLILITER): shownPrice, unitAmount kadar içindir
    unit_raw = (p.get("unit") or "").upper()
    amount = float(p.get("unitAmount") or 0)
    if unit_raw in ("GRAM", "KILOGRAM") and amount > 0:
        per_kg = round(last_price / (amount / 1000.0), 2)
        return {"last_price": last_price, "detected_unit": "kg",
                "pack_quantity": round(amount / 1000.0, 3), "unit_price": per_kg}
    if unit_raw in ("MILLILITER", "MILLILITRE", "LITER", "LITRE") and amount > 0:
        per_lt = round(last_price / (amount / 1000.0), 2)
        return {"last_price": last_price, "detected_unit": "lt",
                "pack_quantity": round(amount / 1000.0, 3), "unit_price": per_lt}
    # 3) PIECE (adet ile satılan): isimden paket boyutunu çöz ('1 L', '500 G')
    pack = _pack_from_name(_name_of(p))
    if pack and pack[1] > 0:
        unit, qty = pack
        return {"last_price": last_price, "detected_unit": unit,
                "pack_quantity": round(qty, 3), "unit_price": round(last_price / qty, 2)}
    # 4) Gerçek adet ürünü
    return {"last_price": last_price, "detected_unit": "adet",
            "pack_quantity": 1.0, "unit_price": last_price if last_price > 0 else None}


# ─────────────────────── Orkestrasyon ───────────────────────
def search_products(query: str, limit: int = 15) -> list[dict]:
    payload = _http_get_json(f"{SEARCH_URL}?q={quote(query)}")
    products = _product_list(payload)
    # Şekil bozuk mu? (yanıt dolu ama liste/fiyat tanınmadı) → yalnızca o zaman LLM ile onar
    body_nonempty = bool(payload.get("data") or payload)
    price_broken = bool(products) and all(_shown_price_tl(p) <= 0 for p in products)
    if body_nonempty and (not products or price_broken):
        if _heal_with_llm(payload):
            products = _product_list(payload)
    return products[:limit]


def _query_variants(ingredient_name: str) -> list[str]:
    """Aranacak terimler: isim + 'isim kg' (ham/kilolu ürünü öne çıkarır) + eş-anlamlar.
    Ör. 'Patates' → ['patates','patates kg']; 'Tavuk Göğsü' → [...,'piliç bonfile',...]."""
    variants = [ingredient_name, f"{ingredient_name} kg"]
    folded = _fold(ingredient_name)
    for key, aliases in _INGREDIENT_ALIASES.items():
        if _fold(key) in folded:
            variants.extend(aliases)
    # tekilleştir (sıra korunur)
    seen, out = set(), []
    for v in variants:
        k = _fold(v)
        if k not in seen:
            seen.add(k); out.append(v)
    return out


def _starts_with_ingredient(ingredient_name: str, product: dict) -> bool:
    """Ürün adının İLK anlamlı kelimesi malzemenin (veya eş-anlamının) ilk kelimesiyle
    eşleşiyor mu? Ham ürün deseni: 'Patates Yeni Mahsul Kg', 'Domates Kg', 'Soğan Kuru Kg'.
    'Semizotu Yoğurtlu' (başka ürün + sıfat) veya 'Torpat ...' (marka) bu testi geçemez."""
    words = _words(_name_of(product))
    if not words:
        return False
    head = words[0]
    for tokens in _acceptable_token_sets(ingredient_name):
        if tokens and _token_matched(tokens[0], [head]):
            return True
    return False


def _pick_best(ingredient_name: str, products: list[dict]) -> tuple | None:
    """Ürün havuzundan en iyi eşleşmeyi seçer. Sıralama: isim/eş-anlam kelime kapsaması,
    sonra TOPLU/kiloyla satılan ürün tercihi (temsili ürün), sonra Migros alaka sırası.
    Dönüş: (product, confidence, unmatched, price, disq_hits, reliable) veya None."""
    ing_words = set(_words(ingredient_name))
    priced = [p for p in products if _shown_price_tl(p) > 0]
    if not priced:
        return None

    def _bulk_score(p: dict) -> int:
        name = _fold(_name_of(p))
        unit_raw = (p.get("unit") or "").upper()
        amount = float(p.get("unitAmount") or 0)
        s = 0
        if re.search(r"\bkg\b\s*$", name) or name.endswith(" kg"):
            s += 3                                   # kiloyla satılan (loose)
        if unit_raw in ("GRAM", "MILLILITER", "MILLILITRE") and amount >= 900:
            s += 2                                   # ~1kg/1L baz
        if unit_raw == "PIECE" and amount and amount < 1:
            s -= 1
        pack = _pack_from_name(_name_of(p))
        if pack and pack[0] in ("kg", "lt") and pack[1] < 0.2:
            s -= 3                                   # çok küçük paket cezası
        s -= len(_disq_words(_name_of(p), ing_words)) * 5   # işlenmiş/hazır ürün cezası
        if _category_blocked(p):
            s -= 20                                   # gıda-dışı/işlenmiş kategori (içecek, reçel, mendil...)
        return s

    scored = []
    for idx, p in enumerate(priced):
        conf, missing = match_confidence(ingredient_name, _name_of(p))
        scored.append((conf, _bulk_score(p), -idx, p, conf, missing))
    scored.sort(key=lambda t: (t[0], t[1], t[2]), reverse=True)
    _, _, _, best, confidence, unmatched = scored[0]

    price = _extract_price(best)
    disq_hits = _disq_words(_name_of(best), ing_words)
    blocked_cat = _category_blocked(best)
    if blocked_cat:
        disq_hits = disq_hits + [f"kategori:{blocked_cat}"]   # yanlış kategori → güvenilmez
    reliable = confidence >= 0.999 and price["unit_price"] is not None and not disq_hits
    return best, confidence, unmatched, price, disq_hits, reliable


def fetch_ingredient_market_price(ingredient_name: str, unit: str, product_url: str | None = None) -> dict:
    """Malzeme için Migros'ta en iyi eşleşen ürünü bulur, gerçek fiyatını ve birim
    fiyatını çıkarır. ÖNCE ana isimle arar; en iyi sonuç güvenilirse onu kullanır.
    Güvenilmezse (ör. 'tavuk göğsü'→füme, 'patates'→parmak patates) 'isim kg' ve
    eş-anlam (piliç bonfile) sorgularıyla havuzu genişletip kurtarmayı dener.
    Zayıf/işlenmiş eşleşme güvenilmez işaretlenir (menü planlayıcıya girmez)."""
    try:
        primary = search_products(ingredient_name)
    except MigrosError:
        primary = []
    result = _pick_best(ingredient_name, primary)

    # Kurtarma gerekli mi? (a) sonuç yok/güvenilmez (füme, bulyon...) VEYA
    # (b) güvenilir ama PAKETLİ (PIECE) — ham kiloyla-satılan bir alternatif olabilir
    primary_piece = result is not None and (result[0].get("unit") or "").upper() == "PIECE"
    if result is None or not result[5] or primary_piece:
        pooled = {p.get("id"): p for p in primary if p.get("id") is not None}
        for q in _query_variants(ingredient_name)[1:]:  # [0]=isim zaten arandı
            try:
                for p in search_products(q):
                    if p.get("id") is not None:
                        pooled.setdefault(p["id"], p)
            except MigrosError:
                continue
        rescued = _pick_best(ingredient_name, list(pooled.values()))
        if rescued and rescued[5]:
            r_prod = rescued[0]
            r_loose = (r_prod.get("unit") or "").upper() in ("GRAM", "MILLILITER", "MILLILITRE")
            r_head = _starts_with_ingredient(ingredient_name, r_prod)
            if result is None or not result[5]:
                result = rescued                       # güvenilmezi güvenilirle değiştir
            elif primary_piece and r_loose and r_head:
                result = rescued                       # paketliyi HAM kiloyla-satılanla değiştir

    if result is None:
        raise MigrosError(f"Migros'ta '{ingredient_name}' için fiyatlı ürün bulunamadı.")

    best, confidence, unmatched, price, disq_hits, reliable = result
    warnings: list[str] = []
    if unmatched and unmatched != ["?"]:
        warnings.append("Eşleşme zayıf: '" + ", ".join(unmatched) +
                        "' ürün adında yok — yanlış ürün eşleşmiş olabilir.")
    if disq_hits:
        warnings.append("İşlenmiş/hazır ürün eşleşti ('" + ", ".join(disq_hits) +
                        "') — ham malzeme fiyatı olmayabilir, doğrulayın.")
    if price["unit_price"] is None:
        warnings.append("Birim fiyat hesaplanamadı.")

    pretty = best.get("prettyName") or ""
    return {
        "product_url": (PRODUCT_URL_BASE + pretty) if pretty else PRODUCT_URL_BASE,
        "product_name": _name_of(best),
        "detected_unit": price["detected_unit"],
        "pack_quantity": price["pack_quantity"],
        "last_price": price["last_price"],
        "unit_price": price["unit_price"],
        "strategy": "migros-api",
        "confidence": confidence,
        "reliable": reliable,
        "warning": " ".join(warnings) or None,
    }


def diagnose(force_heal: bool = False) -> dict:
    """Migros API sağlık kontrolü (kanarya sorgu 'domates'). Beklenen JSON şekli ve
    fiyat alanı geliyor mu? Alan adları değişmişse (self-healing) hangisi çalışıyor raporlar."""
    from datetime import datetime, timezone
    report = {
        "source": "migros", "api_ok": False, "product_count": 0,
        "price_field": None, "sample": None,
        "checked_at": datetime.now(timezone.utc).isoformat(), "message": "",
    }
    try:
        products = search_products("domates")
    except MigrosError as exc:
        report["message"] = f"Migros API'ye ulaşılamadı: {exc}"
        return report
    report["api_ok"] = True
    report["product_count"] = len(products)
    if not products:
        report["message"] = "API çalışıyor ama ürün dönmedi (yanıt şekli değişmiş olabilir)."
        return report
    # Hangi fiyat alanı dolu?
    for p in products:
        for f in _PRICE_FIELDS:
            if isinstance(p.get(f), (int, float)) and p[f] > 0:
                report["price_field"] = f
                r = fetch_ingredient_market_price("Domates", "kg")
                report["sample"] = {"name": r["product_name"], "unit_price": r["unit_price"],
                                    "unit": r["detected_unit"]}
                report["message"] = "Migros fiyat servisi sağlıklı."
                return report
    report["message"] = "Fiyat alanı bulunamadı; Migros alan adlarını değiştirmiş olabilir (self-heal gerek)."
    return report

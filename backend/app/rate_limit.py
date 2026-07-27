"""Hafif, bağımlılıksız (in-memory) hız sınırlayıcı.

Pahalı uçlar (Gemini/LLM üretimi ve harici scraper çağrıları) kimlik doğrulaması
olmadığından, kötüye kullanıma (maliyet patlaması / DoS) karşı IP başına basit bir
kayan pencere sınırı uygular. Tek süreç içinde çalışır; birden çok worker/instance
varsa kesin (global) değildir — temel bir koruma katmanıdır, tam çözüm değil.
"""

import threading
import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, Request, status

_lock = threading.Lock()
_hits: dict[tuple[str, str], deque] = defaultdict(deque)


def rate_limit(bucket: str, max_calls: int, window_seconds: int = 60):
    """Bir uca eklenebilir FastAPI bağımlılığı döndürür.

    Kullanım:
        @router.post("/generate", dependencies=[rate_limit("menu-generate", 15)])
    """

    def dependency(request: Request) -> None:
        client = request.client.host if request.client else "unknown"
        key = (bucket, client)
        now = time.monotonic()
        cutoff = now - window_seconds
        with _lock:
            hits = _hits[key]
            while hits and hits[0] < cutoff:
                hits.popleft()
            if len(hits) >= max_calls:
                retry_after = int(hits[0] + window_seconds - now) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Çok fazla istek gönderildi. Lütfen biraz bekleyip tekrar deneyin.",
                    headers={"Retry-After": str(max(retry_after, 1))},
                )
            hits.append(now)

    return Depends(dependency)

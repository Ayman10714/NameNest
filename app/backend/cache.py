from __future__ import annotations
import time
from threading import Lock
from typing import Any, Optional

_DEFAULT_TTL_SECONDS = 60 * 30

class TTLCache:
    def __init__(self, ttl_seconds: int = _DEFAULT_TTL_SECONDS) -> None:
        self._ttl = ttl_seconds
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = Lock()
    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            item = self._store.get(key)
            if not item: return None
            expires_at, value = item
            if expires_at < time.time():
                self._store.pop(key, None); return None
            return value
    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._store[key] = (time.time() + self._ttl, value)
    def clear(self) -> None:
        with self._lock:
            self._store.clear()

cache = TTLCache()

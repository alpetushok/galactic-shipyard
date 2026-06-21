# ═══════════════════════════════════════
#  REDIS CLIENT — Cache & Sessions
# ═══════════════════════════════════════

import redis.asyncio as aioredis
import json
import os
from typing import Any, Optional

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

_redis: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(REDIS_URL, decode_responses=True)
    return _redis


# ── CACHE HELPERS ──
async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    """Set a JSON-serialisable value with TTL (seconds)."""
    r = await get_redis()
    await r.setex(key, ttl, json.dumps(value))


async def cache_get(key: str) -> Optional[Any]:
    """Return cached value or None."""
    r = await get_redis()
    raw = await r.get(key)
    return json.loads(raw) if raw else None


async def cache_delete(key: str) -> None:
    r = await get_redis()
    await r.delete(key)


async def cache_delete_pattern(pattern: str) -> None:
    r = await get_redis()
    keys = await r.keys(pattern)
    if keys:
        await r.delete(*keys)

import os
import asyncio
import logging

from fastapi import FastAPI
from fastapi.routing import APIRouter
from starlette.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from core.config import db
from core.hadith_data import _ensure_all_books_loaded, _hadith_v2_cache
from routes import ai, quran, hadith, duas

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app = FastAPI(title="DeenGuide API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"name": "DeenGuide API", "status": "ok"}


api.include_router(ai.router)
api.include_router(quran.router)
api.include_router(hadith.router)
api.include_router(duas.router)

app.include_router(api)


@app.on_event("startup")
async def warmup_hadith_corpus():
    async def _bg():
        try:
            await _ensure_all_books_loaded()
            total = sum(len(v) for v in _hadith_v2_cache.values())
            logging.info("Hadith v2 corpus pre-warmed: %d hadiths across %d books", total, len(_hadith_v2_cache))
        except Exception:
            logging.exception("Pre-warm failed (will retry lazily on first request)")
    asyncio.create_task(_bg())


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)

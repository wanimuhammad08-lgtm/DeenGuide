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
async def startup():
    logging.info("DeenGuide API started — Hadith powered by Kalimat API")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)

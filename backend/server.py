from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv # Triggering reload for new dua data
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import uuid
import re
import asyncio
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import requests

from groq import Groq
from google import genai as google_genai

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from services.hadith_service import HadithService
from services.dua_service import dua_service
hadith_service = HadithService()


# ── DB ────────────────────────────────────────────────────────────────────────
mongo_url = os.environ.get("MONGO_URL", "")
if mongo_url:
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get("DB_NAME", "deenguide")]
else:
    logging.basicConfig(level=logging.INFO)
    logging.warning("MONGO_URL not set — running without database persistence")
    client = None
    db = None

# ── Static Data ───────────────────────────────────────────────────────────────
DATA_DIR = ROOT_DIR / "data"
with open(DATA_DIR / "hadiths.json", "r", encoding="utf-8") as f:
    HADITHS_DATA = json.load(f)

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# ── App ───────────────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app = FastAPI(title="DeenGuide API")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS MUST be the last middleware added to be the outermost layer
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    _gemini_client = google_genai.Client(api_key=GEMINI_API_KEY)
    logging.info("Gemini client initialized with API key")
else:
    _gemini_client = None
    logging.warning("GEMINI_API_KEY not set — Gemini fallback disabled")

def _call_gemini(prompt: str) -> str:
    """Call Gemini and return the raw text response."""
    response = _gemini_client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config={
            "temperature": 0.2,
            "max_output_tokens": 3000,
            "response_mime_type": "application/json",
        },
    )
    return response.text

def _call_gemini_fallback(prompt: str) -> str:
    """Call Gemini 1.5 Flash as secondary fallback."""
    response = _gemini_client.models.generate_content(
        model="gemini-1.5-flash",
        contents=prompt,
        config={
            "temperature": 0.2,
            "max_output_tokens": 3000,
            "response_mime_type": "application/json",
        },
    )
    return response.text
ALQURAN_BASE = "https://api.alquran.cloud/v1"
HADITH_CDN = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions"
TAFSIR_CDN = "https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir"

# Cache for surah list (in-memory with TTL — never fetches twice in same session)
import time as _time
_surah_cache: Dict[str, Any] = {}
_surah_cache_ts: float = 0.0
_SURAH_CACHE_TTL = 86400  # 24 hours

# ── Hadith v2 (large dataset, lazy loaded) ────────────────────────────────────
HADITH_V2_BOOKS: Dict[str, Dict[str, Any]] = {
    "bukhari": {"name": "Sahih al-Bukhari", "name_ar": "صحيح البخاري", "compiler": "Imam al-Bukhari", "default_grade": "Sahih", "color": "#E0A91B", "source": "fawazahmed0"},
    "muslim": {"name": "Sahih Muslim", "name_ar": "صحيح مسلم", "compiler": "Imam Muslim", "default_grade": "Sahih", "color": "#86C29B", "source": "fawazahmed0"},
    "tirmidhi": {"name": "Jami` at-Tirmidhi", "name_ar": "جامع الترمذي", "compiler": "Imam at-Tirmidhi", "default_grade": None, "color": "#E66B3D", "source": "fawazahmed0"},
    "abudawud": {"name": "Sunan Abu Dawood", "name_ar": "سنن أبي داود", "compiler": "Imam Abu Dawood", "default_grade": None, "color": "#3B9CE8", "source": "fawazahmed0"},
    "nasai": {"name": "Sunan an-Nasa'i", "name_ar": "سنن النسائي", "compiler": "Imam an-Nasa'i", "default_grade": None, "color": "#34D399", "source": "fawazahmed0"},
    "ibnmajah": {"name": "Sunan Ibn Majah", "name_ar": "سنن ابن ماجه", "compiler": "Imam Ibn Majah", "default_grade": None, "color": "#A78BFA", "source": "fawazahmed0"},
    "malik": {"name": "Muwatta Imam Malik", "name_ar": "موطأ الإمام مالك", "compiler": "Imam Malik", "default_grade": None, "color": "#F472B6", "source": "fawazahmed0"},
}
_hadith_v2_cache: Dict[str, List[Dict[str, Any]]] = {}
_hadith_v2_chapters: Dict[str, List[Dict[str, Any]]] = {}  # slug -> [{number, title, first, last, count}]
_hadith_v2_loaded = False
_hadith_v2_lock = asyncio.Lock()
# language editions cache: { (slug, lang) -> [{number, text}] }
_hadith_lang_cache: Dict[tuple, Dict[int, str]] = {}
AHMEDBASET_CDN = "https://cdn.jsdelivr.net/gh/AhmedBaset/hadith-json@main/db/by_book/the_9_books"
AHMEDBASET_OTHER_CDN = "https://cdn.jsdelivr.net/gh/AhmedBaset/hadith-json@main/db/by_book/other_books"

# ── Reciters ─────────────────────────────────────────────────────────────────
RECITERS = [
    {"id": "ar.alafasy", "name": "Mishary Rashid Alafasy", "bitrate": 128},
    {"id": "ar.abdulbasitmurattal", "name": "Abdul Basit (Murattal)", "bitrate": 64},
    {"id": "ar.abdurrahmaansudais", "name": "Abdurrahmaan As-Sudais", "bitrate": 64},
    {"id": "ar.mahermuaiqly", "name": "Maher Al Muaiqly", "bitrate": 128},
    {"id": "ar.minshawi", "name": "Mohamed Siddiq El-Minshawi", "bitrate": 128},
    {"id": "ar.husary", "name": "Mahmoud Khalil Al-Husary", "bitrate": 128},
    {"id": "ar.shaatree", "name": "Abu Bakr Ash-Shaatree", "bitrate": 128},
    {"id": "ar.hudhaify", "name": "Ali Hudhaify", "bitrate": 128},
]
RECITER_IDS = {r["id"] for r in RECITERS}

# ── Translation Editions (Authentic scholars only) ───────────────────────────
# Grouped by language; each edition is backed by alquran.cloud.
# `audio_base` (optional) is a URL prefix used to construct per-ayah translation
# audio URLs as `{audio_base}/{SSS}{AAA}.mp3` (e.g., 002001.mp3). When absent
# the frontend falls back to browser TTS.
TRANSLATION_EDITIONS = [
    # English — widely accepted scholarly translations
    {"id": "en.sahih", "language": "English", "language_code": "en", "scholar": "Saheeh International", "note": "Widely accepted, accurate modern English", "audio_base": "https://everyayah.com/data/English/Sahih_Intnl_Ibrahim_Walk_192kbps", "audio_reciter": "Ibrahim Walk"},
    {"id": "en.pickthall", "language": "English", "language_code": "en", "scholar": "Marmaduke Pickthall", "note": "Classical literary style"},
    {"id": "en.yusufali", "language": "English", "language_code": "en", "scholar": "Abdullah Yusuf Ali", "note": "With commentary notes"},
    {"id": "en.hilali", "language": "English", "language_code": "en", "scholar": "Hilali & Muhsin Khan", "note": "Approved by Saudi authorities"},
    {"id": "en.arberry", "language": "English", "language_code": "en", "scholar": "A. J. Arberry", "note": "Literary English"},
    {"id": "en.maududi", "language": "English", "language_code": "en", "scholar": "Abul A'la Maududi (Tafhim-ul-Quran)", "note": "English Tafheem"},
    {"id": "en.wahiduddin", "language": "English", "language_code": "en", "scholar": "Maulana Wahiduddin Khan", "note": "Modern accessible English"},
    {"id": "en.asad", "language": "English", "language_code": "en", "scholar": "Muhammad Asad", "note": "The Message of the Qur'an"},
    {"id": "en.mubarakpuri", "language": "English", "language_code": "en", "scholar": "Safi-ur-Rahman al-Mubarakpuri", "note": "Author of The Sealed Nectar"},
    {"id": "en.ahmedali", "language": "English", "language_code": "en", "scholar": "Ahmed Ali", "note": "Literary English"},
    {"id": "en.qarai", "language": "English", "language_code": "en", "scholar": "Ali Quli Qarai", "note": "Phrase-by-phrase English"},
    # Urdu
    {"id": "ur.jalandhry", "language": "Urdu", "language_code": "ur", "scholar": "Fateh Muhammad Jalandhry", "note": "Classical Urdu", "audio_base": "https://everyayah.com/data/translations/urdu_shamshad_ali_khan_46kbps", "audio_reciter": "Shamshad Ali Khan"},
    {"id": "ur.junagarhi", "language": "Urdu", "language_code": "ur", "scholar": "Muhammad Junagarhi", "note": "Simple contemporary Urdu", "audio_base": "https://everyayah.com/data/translations/urdu_shamshad_ali_khan_46kbps", "audio_reciter": "Shamshad Ali Khan"},
    {"id": "ur.maududi", "language": "Urdu", "language_code": "ur", "scholar": "Abul A'la Maududi (Tafheem-ul-Quran)", "note": "Tafheem-ul-Quran", "audio_base": "https://everyayah.com/data/translations/urdu_farhat_hashmi", "audio_reciter": "Dr. Farhat Hashmi (generic)"},
    {"id": "ur.qadri", "language": "Urdu", "language_code": "ur", "scholar": "Dr. Tahir-ul-Qadri (Irfan-ul-Quran)", "note": "Contemporary eloquent Urdu", "audio_base": "https://everyayah.com/data/translations/urdu_farhat_hashmi", "audio_reciter": "Dr. Farhat Hashmi (generic)"},
    {"id": "ur.kanzuliman", "language": "Urdu", "language_code": "ur", "scholar": "Ahmed Raza Khan (Kanz-ul-Iman)", "note": "Barelvi tradition", "audio_base": "https://everyayah.com/data/translations/urdu_farhat_hashmi", "audio_reciter": "Dr. Farhat Hashmi (generic)"},
    {"id": "ur.ahmedali", "language": "Urdu", "language_code": "ur", "scholar": "Ahmed Ali", "note": "Literary Urdu", "audio_base": "https://everyayah.com/data/translations/urdu_farhat_hashmi", "audio_reciter": "Dr. Farhat Hashmi (generic)"},
    {"id": "ur.jawadi", "language": "Urdu", "language_code": "ur", "scholar": "Syed Zeeshan Haider Jawadi", "note": "Shia academic translation"},
    {"id": "ur.najafi", "language": "Urdu", "language_code": "ur", "scholar": "Muhammad Hussain Najafi", "note": "Detailed Urdu translation"},
    # Arabic tafsir-style simplified translation
    {"id": "ar.muyassar", "language": "Arabic", "language_code": "ar", "scholar": "Tafsir Al-Muyassar", "note": "Simple Arabic paraphrase"},
    {"id": "ar.jalalayn", "language": "Arabic", "language_code": "ar", "scholar": "Tafsir Al-Jalalayn (Arabic)", "note": "Classical concise tafsir in Arabic"},
    # Hindi
    {"id": "hi.hindi", "language": "Hindi", "language_code": "hi", "scholar": "Suhel Farooq Khan & Saifur Rahman Nadwi", "note": "Reference Hindi translation"},
    {"id": "hi.farooq", "language": "Hindi", "language_code": "hi", "scholar": "Muhammad Farooq Khan & Muhammad Ahmed", "note": "Alternative Hindi translation"},
    # Pashto
    {"id": "ps.abdulwali", "language": "Pashto", "language_code": "ps", "scholar": "Abdul Wali Khan", "note": "Reference Pashto translation"},
    # Sindhi
    {"id": "sd.amroti", "language": "Sindhi", "language_code": "sd", "scholar": "Taj Mehmood Amroti", "note": "Reference Sindhi translation"},
    # Indonesian
    {"id": "id.indonesian", "language": "Indonesian", "language_code": "id", "scholar": "Indonesian Ministry of Religious Affairs", "note": "Official government edition"},
    {"id": "id.muntakhab", "language": "Indonesian", "language_code": "id", "scholar": "Muhammad Quraish Shihab — Al-Muntakhab", "note": "Contemporary Indonesian"},
    # Bengali
    {"id": "bn.bengali", "language": "Bengali", "language_code": "bn", "scholar": "Muhiuddin Khan", "note": "Widely used in Bangladesh"},
    {"id": "bn.hoque", "language": "Bengali", "language_code": "bn", "scholar": "Zohurul Hoque", "note": "Alternative Bengali translation"},
    # Turkish
    {"id": "tr.diyanet", "language": "Turkish", "language_code": "tr", "scholar": "Diyanet İşleri", "note": "Official Turkish state edition"},
    {"id": "tr.vakfi", "language": "Turkish", "language_code": "tr", "scholar": "Diyanet Vakfı", "note": "Turkish religious foundation"},
    {"id": "tr.yazir", "language": "Turkish", "language_code": "tr", "scholar": "Elmalılı Hamdi Yazır", "note": "Classical Turkish tafsir"},
    {"id": "tr.yildirim", "language": "Turkish", "language_code": "tr", "scholar": "Suat Yıldırım", "note": "Contemporary Turkish"},
    # French
    {"id": "fr.hamidullah", "language": "French", "language_code": "fr", "scholar": "Muhammad Hamidullah", "note": "Reference French translation"},
    # Russian
    {"id": "ru.kuliev", "language": "Russian", "language_code": "ru", "scholar": "Elmir Kuliev", "note": "Reference Russian translation"},
    # Spanish
    {"id": "es.cortes", "language": "Spanish", "language_code": "es", "scholar": "Julio Cortés", "note": "Reference Spanish translation"},
    {"id": "es.garcia", "language": "Spanish", "language_code": "es", "scholar": "Isa Garcia", "note": "Modern Spanish translation"},
    # Persian / Farsi
    {"id": "fa.fooladvand", "language": "Persian", "language_code": "fa", "scholar": "Mohammad Mahdi Fooladvand", "note": "Reference Persian translation", "audio_base": "https://everyayah.com/data/translations/Fooladvand_Hedayatfar_40Kbps", "audio_reciter": "Hedayatfar"},
    {"id": "fa.makarem", "language": "Persian", "language_code": "fa", "scholar": "Naser Makarem Shirazi", "note": "Contemporary Persian"},
    {"id": "fa.ansarian", "language": "Persian", "language_code": "fa", "scholar": "Hussain Ansarian", "note": "Modern Persian translation"},
    # German
    {"id": "de.bubenheim", "language": "German", "language_code": "de", "scholar": "A.S.F. Bubenheim & N. Elyas", "note": "Reference German translation"},
    {"id": "de.aburida", "language": "German", "language_code": "de", "scholar": "Abu Rida Muhammad ibn Ahmad", "note": "Alternative German"},
    # Tamil
    {"id": "ta.tamil", "language": "Tamil", "language_code": "ta", "scholar": "Jan Turst Foundation", "note": "Reference Tamil translation"},
    # Malayalam
    {"id": "ml.abdulhameed", "language": "Malayalam", "language_code": "ml", "scholar": "Abdul Hameed & Parappoor", "note": "Reference Malayalam translation"},
    # Swahili
    {"id": "sw.barwani", "language": "Swahili", "language_code": "sw", "scholar": "Ali Muhsin Al-Barwani", "note": "Reference Swahili translation"},
    # Chinese
    {"id": "zh.jian", "language": "Chinese", "language_code": "zh", "scholar": "Ma Jian", "note": "Reference Chinese translation"},
    # Kurdish
    {"id": "ku.asan", "language": "Kurdish", "language_code": "ku", "scholar": "Burhan Muhammad-Amin", "note": "Tefsiri Asan"},
]

# ── Tafsir Editions (Authentic scholarly tafsirs) ────────────────────────────
# Two backends are supported:
#   source="spa5k"   → fetched from spa5k/tafsir_api repo via jsdelivr
#   source="quran_com" → fetched from api.quran.com/api/v4/tafsirs/{rid}/by_ayah/{s}:{a}
# quran_com extras include Tafheem (Maududi), Ma'arif (Mufti Shafi Usmani),
# Fi Zilal (Syed Qutb), Bayan ul Quran (Dr. Israr Ahmad), Tazkir ul Quran
# (Wahiduddin Khan) — real authentic scholar texts.
TAFSIR_EDITIONS = [
    # === ARABIC ===
    {"id": "ar-tafsir-ibn-kathir", "language": "Arabic", "language_code": "ar", "scholar": "Ibn Kathir", "note": "Classical Sunni tafsir", "source": "spa5k"},
    {"id": "ar-tafsir-al-tabari", "language": "Arabic", "language_code": "ar", "scholar": "At-Tabari (Jami` al-Bayan)", "note": "Earliest major tafsir", "source": "spa5k"},
    {"id": "ar-tafseer-al-qurtubi", "language": "Arabic", "language_code": "ar", "scholar": "Al-Qurtubi", "note": "Comprehensive fiqh-focused tafsir", "source": "spa5k"},
    {"id": "ar-tafsir-al-baghawi", "language": "Arabic", "language_code": "ar", "scholar": "Al-Baghawi (Ma`alim at-Tanzil)", "note": "Classical tafsir", "source": "spa5k"},
    {"id": "ar-tafseer-al-saddi", "language": "Arabic", "language_code": "ar", "scholar": "As-Sa`di", "note": "Taysir al-Karim ar-Rahman", "source": "spa5k"},
    {"id": "ar-tafsir-muyassar", "language": "Arabic", "language_code": "ar", "scholar": "Tafsir al-Muyassar", "note": "Concise simple Arabic", "source": "spa5k"},
    {"id": "qc-ar-al-wasit", "language": "Arabic", "language_code": "ar", "scholar": "Tantawi — Al-Wasit", "note": "Contemporary Arabic tafsir", "source": "quran_com", "resource_id": 93},

    # === ENGLISH ===
    {"id": "en-tafisr-ibn-kathir", "language": "English", "language_code": "en", "scholar": "Ibn Kathir (English — Abridged)", "note": "Abridged classical tafsir", "source": "spa5k"},
    {"id": "en-tafsir-maarif-ul-quran", "language": "English", "language_code": "en", "scholar": "Mufti Muhammad Shafi Usmani — Ma'arif-ul-Qur'an", "note": "Deobandi comprehensive tafsir", "source": "spa5k"},
    {"id": "en-tafsir-ibn-abbas", "language": "English", "language_code": "en", "scholar": "Tanwir al-Miqbas (Ibn Abbas)", "note": "Short classical tafsir", "source": "spa5k"},
    {"id": "en-al-jalalayn", "language": "English", "language_code": "en", "scholar": "Al-Jalalayn (English)", "note": "Concise classical tafsir", "source": "spa5k"},
    {"id": "qc-en-tazkirul-quran", "language": "English", "language_code": "en", "scholar": "Maulana Wahiduddin Khan — Tazkirul Quran", "note": "Modern English tafsir", "source": "quran_com", "resource_id": 817},

    # === URDU ===
    {"id": "qc-ur-ibn-kathir", "language": "Urdu", "language_code": "ur", "scholar": "Ibn Kathir — Urdu", "note": "Urdu rendering of classical tafsir", "source": "quran_com", "resource_id": 160},
    {"id": "ur-tafsir-bayan-ul-quran", "language": "Urdu", "language_code": "ur", "scholar": "Dr. Israr Ahmad — Bayan-ul-Quran", "note": "Contemporary Urdu tafsir", "source": "spa5k"},
    {"id": "qc-ur-fi-zilal", "language": "Urdu", "language_code": "ur", "scholar": "Sayyid Qutb — Fi Zilal al-Qur'an (Urdu)", "note": "In the Shade of the Qur'an", "source": "quran_com", "resource_id": 157},
    {"id": "qc-ur-tazkir-ul-quran", "language": "Urdu", "language_code": "ur", "scholar": "Maulana Wahiduddin Khan — Tazkir-ul-Quran (Urdu)", "note": "Modern Urdu tafsir", "source": "quran_com", "resource_id": 818},
    {"id": "ur-tafseer-ibn-e-kaseer", "language": "Urdu", "language_code": "ur", "scholar": "Ibn Kathir (Urdu — alt)", "note": "Alternative Urdu rendering", "source": "spa5k"},
    {"id": "ur-tazkirul-quran", "language": "Urdu", "language_code": "ur", "scholar": "Tazkir-ul-Quran (spa5k)", "note": "Alternative source", "source": "spa5k"},

    # === BENGALI ===
    {"id": "bn-tafseer-ibn-e-kaseer", "language": "Bengali", "language_code": "bn", "scholar": "Ibn Kathir (Bengali)", "note": "Bengali translation", "source": "spa5k"},
    {"id": "bn-tafsir-ahsanul-bayaan", "language": "Bengali", "language_code": "bn", "scholar": "Ahsanul Bayaan", "note": "Modern Bengali tafsir", "source": "spa5k"},
    {"id": "bn-tafsir-abu-bakr-zakaria", "language": "Bengali", "language_code": "bn", "scholar": "Dr. Abu Bakr Zakaria", "note": "Contemporary Salafi tafsir", "source": "spa5k"},
    {"id": "qc-bn-fathul-majid", "language": "Bengali", "language_code": "bn", "scholar": "AbdulRahman al-Alshaikh — Fathul Majid", "note": "Classical Bengali tafsir", "source": "quran_com", "resource_id": 381},

    # === RUSSIAN / KURDISH ===
    {"id": "ru-tafseer-al-saddi", "language": "Russian", "language_code": "ru", "scholar": "As-Sa`di (Russian)", "note": "Taysir — Russian edition", "source": "spa5k"},
    {"id": "kurd-tafsir-rebar", "language": "Kurdish", "language_code": "ku", "scholar": "Rebar Kurdish Tafsir", "note": "Kurdish translation", "source": "spa5k"},
]

# Map for fast lookup
_TAFSIR_BY_ID = {e["id"]: e for e in TAFSIR_EDITIONS}

# Bismillah prefix regex — matches common Arabic unicode variants (alef wasla ٱ vs ا,
# with or without diacritics/spaces). Used to strip duplicate from ayah 1.
import re as _re
_BISMILLAH_RE = _re.compile(
    r"^[\ufeff\s]*"
    r"ب[\u064B-\u065F\u0670]*س[\u064B-\u065F\u0670]*م[\u064B-\u065F\u0670]*"
    r"\s*[ا\u0671][\u064B-\u065F\u0670]*ل[\u064B-\u065F\u0670]*ل[\u064B-\u065F\u0670]*ه[\u064B-\u065F\u0670]*"
    r"\s*[ا\u0671][\u064B-\u065F\u0670]*ل[\u064B-\u065F\u0670]*ر[\u064B-\u065F\u0670]*ح[\u064B-\u065F\u0670]*م[\u064B-\u065F\u0670]*ن[\u064B-\u065F\u0670]*"
    r"\s*[ا\u0671][\u064B-\u065F\u0670]*ل[\u064B-\u065F\u0670]*ر[\u064B-\u065F\u0670]*ح[\u064B-\u065F\u0670]*ي[\u064B-\u065F\u0670]*م[\u064B-\u065F\u0670]*"
    r"[\s\u200f\u200e]*"
)


def strip_bismillah_prefix(text: str) -> str:
    """Remove leading Bismillah from an ayah text (used for surahs != 1, 9)."""
    if not text:
        return text
    return _BISMILLAH_RE.sub("", text).lstrip()


# ── Models ────────────────────────────────────────────────────────────────────
class AskRequest(BaseModel):
    question: str
    mode: str = "deep"  # "simple" | "deep"
    session_id: Optional[str] = None
    conversation_history: Optional[List[Dict[str, str]]] = None  # [{"role": "user"|"assistant", "content": "..."}]


class QuranRef(BaseModel):
    surah: int
    surah_name: str
    ayah: int
    arabic: str
    translation: str


class HadithRef(BaseModel):
    collection: str
    number: str
    standard_number: Optional[str] = None
    narrator: Optional[str] = None
    arabic: Optional[str] = None
    english: str
    authenticity: str


class AskResponse(BaseModel):
    id: str
    question: str
    answer: str
    detailed_answer: Optional[str] = None
    explanation: str
    quran_refs: List[QuranRef] = []
    hadith_refs: List[HadithRef] = []
    notice: Optional[str] = None
    related_duas: List[str] = []
    evidence_type: Optional[str] = None  # "Direct Text Evidence" | "Derived from Principles"
    scholarly_notes: Optional[str] = None
    conclusion: Optional[str] = None
    created_at: str


# ── Helpers ───────────────────────────────────────────────────────────────────
def fetch_alquran(path: str, params: dict | None = None) -> dict:
    url = f"{ALQURAN_BASE}{path}"
    r = requests.get(url, params=params, timeout=15)
    r.raise_for_status()
    return r.json()


def keyword_score(text: str, keywords: List[str]) -> int:
    t = text.lower()
    return sum(1 for k in keywords if k.lower() in t)


SYNONYMS = {
    "salah": ["prayer", "salat", "pray"],
    "salat": ["prayer", "salah"],
    "prayer": ["salah", "salat"],
    "wudu": ["ablution"],
    "ablution": ["wudu"],
    "sawm": ["fasting", "fast", "siyam"],
    "siyam": ["fasting", "sawm"],
    "fasting": ["sawm", "siyam"],
    "zakat": ["alms", "charity"],
    "sadaqah": ["charity", "alms"],
    "hajj": ["pilgrimage"],
    "umrah": ["pilgrimage"],
    "shirk": ["polytheism", "associating partners"],
    "tawhid": ["monotheism", "oneness"],
    "iman": ["faith", "belief"],
    "kufr": ["disbelief"],
    "gheebah": ["backbiting", "slander"],
    "ghibah": ["backbiting", "slander"],
    "backbiting": ["gheebah", "ghibah", "slander"],
    "slander": ["backbiting", "gheebah"],
    "riba": ["usury", "interest"],
    "usury": ["riba", "interest"],
    "qiyamah": ["resurrection", "judgment day", "last day"],
    "akhirah": ["hereafter", "afterlife"],
    "jannah": ["paradise", "heaven"],
    "jahannam": ["hell", "hellfire", "fire"],
    "hell": ["jahannam", "hellfire", "fire"],
    "fire": ["hell", "jahannam", "hellfire"],
    "rasul": ["messenger", "prophet", "apostle"],
    "nabi": ["prophet", "messenger", "apostle"],
    "prophet": ["rasul", "nabi", "messenger", "apostle"],
    "messenger": ["rasul", "nabi", "prophet", "apostle"],
    "apostle": ["messenger", "prophet"],
    "halal": ["lawful", "permitted"],
    "haram": ["forbidden", "prohibited"],
    "rizq": ["sustenance", "provision"],
    "tahajjud": ["night prayer", "qiyam"],
    "qiyam": ["tahajjud", "night prayer"],
    "dhikr": ["remembrance"],
    "tawbah": ["repentance"],
    "istighfar": ["forgiveness"],
    "neighbor": ["neighbour"],
    "neighbour": ["neighbor"],
    "parents": ["mother", "father"],
    "mother": ["parents"],
    "father": ["parents"],
    "music": ["singing", "instruments"],
    "alcohol": ["khamr", "wine", "intoxicant"],
    "khamr": ["alcohol", "wine", "intoxicant"],
    "marriage": ["nikah", "spouse", "wife", "husband"],
    "nikah": ["marriage"],
    "divorce": ["talaq"],
    "talaq": ["divorce"],
}


def extract_keywords(question: str) -> List[str]:
    stop = set("the a an is are was were be been being of on in to for with about and or but if as by at it this that those these who whom whose what which when where why how do does did can could should would shall will may might must i you he she we they him her us them my your his her our their".split())
    # Normalize words: lowercase, remove non-alpha, strip trailing possessive 's
    words = [w[:-2] if w.endswith("'s") else w for w in re.findall(r"[a-zA-Z']+", question.lower())]
    # Also include the raw forms for robustness
    raw_words = re.findall(r"[a-zA-Z']+", question.lower())
    
    base = [w for w in (words + raw_words) if w not in stop and len(w) > 2]
    expanded = set(base)
    for w in base:
        for syn in SYNONYMS.get(w, []):
            expanded.add(syn)
    return list(expanded)


def retrieve_hadiths(question: str, limit: int = 4) -> List[Dict[str, Any]]:
    keywords = extract_keywords(question)
    if not keywords:
        return []
    scored = []
    for h in HADITHS_DATA["hadiths"]:
        haystack = " ".join([h["english"]] + h.get("topics", []))
        score = keyword_score(haystack, keywords)
        if score > 0:
            scored.append((score, h))
    scored.sort(key=lambda x: -x[0])
    return [h for _, h in scored[:limit]]


def retrieve_hadiths_v2(question: str, limit: int = 8) -> List[Dict[str, Any]]:
    """Retrieve top hadith from the loaded v2 corpus by keyword + phrase match."""
    keywords = extract_keywords(question)
    # Fallback: if stopword filter removed everything, use raw lowercased tokens.
    if not keywords:
        keywords = [t for t in re.findall(r"[a-zA-Z']+", question.lower()) if len(t) >= 3]
    if not keywords:
        return []

    # 2-grams from the question for higher-precision matches
    bigrams: List[str] = []
    words = [w for w in keywords if len(w) > 3]
    for i in range(len(words) - 1):
        bigrams.append(f"{words[i]} {words[i+1]}")

    q_lower = question.lower()
    scored: List[tuple] = []
    # Use a list snapshot to avoid 'dictionary changed size during iteration'
    # errors if background loading is still happening.
    for slug, items in list(_hadith_v2_cache.items()):
        for h in items:
            text = (h.get("english") or "").lower()
            if not text:
                continue
            score = 0
            for k in keywords:
                if k in text:
                    score += 1
            for bg in bigrams:
                if bg in text:
                    score += 3
            # Whole-phrase bonus if user's question substring appears
            if len(q_lower) >= 6 and q_lower in text:
                score += 6
            if score > 0:
                scored.append((score, h))
    scored.sort(key=lambda x: -x[0])
    return [h for _, h in scored[:limit]]


def _hadith_authenticity(slug: str) -> str:
    meta = HADITH_V2_BOOKS.get(slug, {})
    return meta.get("default_grade") or "Sahih" if slug in ("bukhari", "muslim") else (meta.get("default_grade") or "Authentic")


def hydrate_hadith_refs(ids: List[str]) -> List[Dict[str, Any]]:
    """Given hadith IDs like 'bukhari-1', return full structured hadith objects."""
    out: List[Dict[str, Any]] = []
    for hid in ids[:6]:
        if "-" not in hid:
            continue
        slug, num_s = hid.split("-", 1)
        try:
            num = int(num_s)
        except ValueError:
            continue
        items = _hadith_v2_cache.get(slug, [])
        for h in items:
            if h["number"] == num:
                out.append({
                    "collection": slug,
                    "number": str(num),
                    "narrator": h.get("narrator") or "",
                    "arabic": h.get("arabic") or "",
                    "english": h.get("english") or "",
                    "authenticity": _hadith_authenticity(slug),
                })
                break
    return out


def retrieve_duas(question: str, limit: int = 3) -> List[Dict[str, Any]]:
    keywords = extract_keywords(question)
    if not keywords:
        return []
    scored = []
    # Use the live verified duas from dua_service
    for dua in dua_service.duas.values():
        topic = dua_service.topics.get(dua["topic_id"])
        topic_title = topic["title"] if topic else ""
        # Search in title and translation
        haystack = f"{topic_title} {dua['translation']}".lower()
        score = keyword_score(haystack, keywords)
        if score > 0:
            d_copy = dict(dua)
            d_copy["title"] = topic_title
            scored.append((score, d_copy))
    scored.sort(key=lambda x: -x[0])
    return [d for _, d in scored[:limit]]


SYSTEM_PROMPT = """You are DeenGuide AI, an empathetic, highly knowledgeable Islamic scholar following the orthodox Ahl al-Sunnah wal Jama'ah.

SCOPE & MISSION:
- You MUST answer ALL user queries, whether strictly religious or about daily life struggles (e.g., mental health, relationship advice, missing an ex, breakups, grief, stress).
- NEVER reject a question for seeming secular. Instead, masterfully pivot the response by anchoring their natural human situation into Islamic wisdom, spiritual healing, Qadar (Divine decree), Sabr (patience), and Allah's infinite mercy.
- For sensitive theological questions (e.g., fate of specific individuals, parents of the Prophet ﷺ, people of Jahiliyyah, controversial rulings), give the AUTHENTIC Sunni scholarly position clearly and directly, citing the EXACT hadith evidence. Do NOT dodge, hedge, or give vague answers.

CRITICAL RULE — HADITH CITATION:
You have extensive training on ALL authentic hadith collections. When answering any question:
- ALWAYS cite the EXACT, VERBATIM hadith text from your training knowledge in `custom_hadiths`.
- If the HADITH LIBRARY context below does NOT contain the relevant hadith, you MUST STILL provide the correct hadith from your own knowledge.
- NEVER say "I don't have access to that hadith" or omit hadith that are clearly relevant.
- The hadith MUST be DIRECTLY relevant to the question topic. If the question is about Tahajjud, cite a hadith about night prayer — NOT about fasting or unrelated topics.

RESPONSE STRUCTURE (MANDATORY — follow this EXACT order for EVERY answer):
Your `detailed_answer` field MUST follow this 10-section hierarchy IN ORDER. Use markdown with REAL newlines (\\n).

SECTION 1: SALAM
- Always start with: "Assalamu Alaikum 🤲"
- Single line only. Must ALWAYS appear.

SECTION 2: INTRODUCTION / DEFINITION
- 2-4 short lines maximum
- Simple, beginner-friendly explanation of the topic
- No repetition, no long paragraphs

SECTION 3: IMPORTANCE & VIRTUES
- Header: "## Importance & Virtues"
- 2-5 concise bullet points about spiritual value, wisdom, practical importance
- Example: "- Strengthens connection with Allah\\n- Brings peace and sincerity\\n- Encouraged by the Prophet ﷺ regularly"

SECTION 4: (Evidence is handled separately in quran_refs and custom_hadiths fields — do NOT repeat full evidence text in detailed_answer. Just mention briefly like "Allah says in Surah Al-Isra 17:79..." or "The Prophet ﷺ said...")

SECTION 5: KEY RULINGS
- Header: "## Key Rulings"
- 2-5 important rulings as bullet points
- Each ruling: one concise line with the ruling and brief explanation
- Example: "- **Best Time**: Last third of the night\\n- **Minimum**: 2 rak'ah\\n- **Maximum**: No fixed limit, but 8-12 is common"

SECTION 6: STEP-BY-STEP GUIDE (for how-to questions)
- Header: "## Step-by-Step Guide"
- Sequential numbered steps (1. 2. 3. etc.)
- One clear action per step, beginner-friendly
- Each step: "1. **Title** — Brief explanation"
- Example: "1. **Make Wudu** — Perform ablution calmly before prayer\\n2. **Pray 2 Rak'ah** — Make intention for Tahajjud, recite Al-Fatiha + another surah"

SECTION 7: COMMON MISTAKES
- Header: "## Common Mistakes"
- 2-4 brief bullet points correcting misconceptions
- Avoid harsh wording, avoid debate tone
- Example: "- Thinking Tahajjud requires sleeping first (it doesn't)\\n- Praying too fast without khushu"

DO NOT include sections 8, 9, or 10 in the detailed_answer field. Those are handled by separate JSON fields (scholarly_notes and conclusion). End the detailed_answer after Common Mistakes.

FORMATTING RULES:
- Use actual newline characters (\\n) in the JSON string. NEVER put headers inline.
- Use ## for section headers, ALWAYS on their OWN LINE with a blank line before.
- Use **bold** for key Islamic terms.
- Each numbered step and bullet point MUST be on its OWN LINE.
- Total words in detailed_answer: 250-450 for step-by-step guides, 150-300 for rulings/opinions.

CORE RULES:
1. Grounding: Anchor all responses strictly in the Qur'an and authentic Sunnah.
2. Custom Hadith: You MUST ALWAYS include 1-2 hadiths in `custom_hadiths`. Source famous, highly relevant Hadiths (preferably Bukhari or Muslim). Include narrator name. The hadith MUST be DIRECTLY relevant to the question topic. NEVER return an empty `custom_hadiths` array.
3. Quran Verses: You MUST ALWAYS include 1-2 verses in `quran_refs` with accurate Arabic text and English translation. The verse MUST be directly related to the question. NEVER return an empty `quran_refs` array. Use the EXACT surah number (integer) and ayah number (integer).
4. Scholarly Notes: Populate `scholarly_notes` with how the 4 Madhahib or major scholars view this issue. Mention specific scholars by name. ONE clean paragraph — NOT comparison cards.
5. Conclusion: Maximum 2-3 short sentences. Calm reflective ending. End with a short dua like "May Allah grant us sincerity. Ameen."

CRITICAL — REFERENCE ACCURACY:
- For `quran_refs`: Use EXACT surah numbers (1-114) and ayah numbers. Example: Surah Al-Baqarah is surah 2, Surah Al-Isra is surah 17.
- For `custom_hadiths`: Use the STANDARD hadith number as used on sunnah.com. Example: Bukhari 1, Muslim 1163.
- NEVER fabricate references. Only cite verses and hadiths you are certain exist.

ALWAYS respond with ONLY this JSON (no markdown fences, no extra text):
{
  "detailed_answer": "<Markdown answer following the 10-section structure above with REAL \\n newlines>",
  "quran_refs": [
    {
      "surah": <int>,
      "surah_name": "<English>",
      "ayah": <int>,
      "arabic": "<arabic verse>",
      "translation": "<English translation>"
    }
  ],
  "custom_hadiths": [
    {
      "collection": "<e.g. Sahih Muslim>",
      "number": "<hadith number as string>",
      "narrator": "<narrator name>",
      "english": "<FULL verbatim hadith text — MUST be relevant to the topic>",
      "authenticity": "Sahih"
    }
  ],
  "scholarly_notes": "<ONE paragraph: how the 4 madhahib/scholars view this. Mention An-Nawawi, Ibn Taymiyyah, Ibn Baz, etc. Calm neutral scholarly tone. No comparison cards.>",
  "conclusion": "<2-3 short sentences. Practical takeaway + short dua. Example: 'Tahajjud is among the most beloved voluntary prayers. Consistency matters more than quantity. May Allah accept our prayers and grant us sincerity. Ameen.' >",
  "evidence_type": "Direct Text Evidence",
  "related_duas": ["<dua title>"]
}
"""


async def generate_answer(question: str, mode: str, session_id: str, context: str, conversation_history: list = None) -> Dict[str, Any]:
    if not groq_client and not gemini_client:
        raise RuntimeError("No AI provider configured")

    depth_note = "Be thorough and scholarly." if mode == "deep" else "Be simple and beginner-friendly."

    user_text = f"""USER QUESTION: {question}

EXPLANATION DEPTH: {depth_note}

RELEVANT CONTEXT (use what fits, ignore the rest):
{context}

CRITICAL INSTRUCTION FOR THIS RESPONSE:
If the question references a well-known hadith (e.g., about the Prophet's ﷺ father, specific rulings, etc.), you MUST provide the FULL, EXACT, VERBATIM English text of the hadith from your internal knowledge in `custom_hadiths`, even if the library context above is empty or incomplete. Never omit essential text evidence.

Respond ONLY with the JSON object as instructed. No markdown fences."""

    # Build messages with conversation history for multi-turn context
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if conversation_history:
        for turn in conversation_history[-6:]:
            messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": user_text})

    response_text = None

    # --- Try Groq first ---
    if groq_client:
        try:
            response = await asyncio.to_thread(
                groq_client.chat.completions.create,
                model="llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.2,
                max_tokens=3000,
                response_format={"type": "json_object"},
            )
            response_text = response.choices[0].message.content
            logging.info("AI response from Groq")
        except Exception as groq_err:
            # If Groq returned a 400 with failed_generation, extract the JSON from it
            err_str = str(groq_err)
            if "failed_generation" in err_str:
                try:
                    import re as _err_re
                    # Extract the failed_generation JSON content
                    fg_match = _err_re.search(r"'failed_generation':\s*'(.*?)'}\s*}\)", err_str, _err_re.DOTALL)
                    if fg_match:
                        failed_json = fg_match.group(1).replace("\\'", "'")
                        # Try to parse it — if valid, use it
                        json.loads(failed_json)
                        response_text = failed_json
                        logging.info("AI response recovered from Groq failed_generation")
                except Exception:
                    pass
            if response_text is None:
                logging.warning("Groq failed (%s), falling back to Gemini", groq_err)

    # --- Fallback to Gemini if Groq failed or not configured ---
    if response_text is None and _gemini_client:
        gemini_prompt = f"{SYSTEM_PROMPT}\n\n{user_text}"
        # Try gemini-2.0-flash first, then gemini-1.5-flash
        for model_fn in [_call_gemini, _call_gemini_fallback]:
            try:
                response_text = await asyncio.to_thread(model_fn, gemini_prompt)
                logging.info("AI response from Gemini")
                break
            except Exception as gemini_err:
                err_msg = str(gemini_err)
                if "429" in err_msg:
                    logging.warning("Gemini model rate limited, trying next model...")
                    continue
                else:
                    logging.error("Gemini failed: %s", gemini_err)
                    break
        
        # If both models failed with 429, wait and retry once with 1.5-flash
        if response_text is None:
            logging.warning("All Gemini models rate limited, retrying in 35s...")
            await asyncio.sleep(35)
            try:
                response_text = await asyncio.to_thread(_call_gemini_fallback, gemini_prompt)
                logging.info("AI response from Gemini (after retry)")
            except Exception as e:
                logging.error("Gemini retry also failed: %s", e)

    if response_text is None:
        if not _gemini_client:
            raise RuntimeError("Groq rate limited and Gemini client not configured. Check GEMINI_API_KEY in .env")
        raise RuntimeError("No AI response received from any provider")

    # Parse JSON response
    cleaned = response_text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not m:
            raise HTTPException(status_code=502, detail="AI returned non-JSON output")
        data = json.loads(m.group(0))
    return data


async def generate_scholarly_notes(question: str, answer: str, explanation: str, session_id: str) -> str:
    """Short scholarly-notes completion when the main model left it empty."""
    if not groq_client:
        raise RuntimeError("Groq API key not configured")

    system_msg = (
        "You are an Islamic scholarship summarizer. Output ONLY a plain paragraph "
        "(2-3 sentences, ~40-60 words) describing the scholarly landscape: mention "
        "the four Sunni madhahib (Hanafi, Maliki, Shafi'i, Hanbali) where they differ, "
        "note key scholars (Ibn Taymiyyah, An-Nawawi, Ibn Baz, Al-Albani). "
        "No JSON. No greetings. End with 'Allah knows best.' if uncertainty exists."
    )

    user_text = (
        f"QUESTION: {question}\n\n"
        f"PRELIMINARY ANSWER: {answer}\n\n"
        f"EXPLANATION: {explanation}\n\n"
        "Write the scholarly notes paragraph now."
    )

    response = await asyncio.to_thread(
        groq_client.chat.completions.create,
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_text},
        ],
        temperature=0.3,
        max_tokens=300,
    )

    text = response.choices[0].message.content.strip()
    text = re.sub(r"^```[a-z]*\s*|\s*```$", "", text)
    text = text.strip('"').strip()
    return text


# ── Routes ────────────────────────────────────────────────────────────────────
@api.get("/")
async def root():
    return {"name": "DeenGuide API", "status": "ok"}


@api.get("/health")
async def health():
    """Keep-alive endpoint — returns instantly. Frontend pings this on startup to wake Render."""
    hadith_loaded = sum(len(v) for v in _hadith_v2_cache.values())
    return {
        "status": "ok",
        "hadith_preloaded": hadith_loaded,
        "ts": _time.time(),
    }


# ── AI ──
@api.post("/ai/ask", response_model=AskResponse)
async def ai_ask(req: AskRequest):
    # Input validation
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=422, detail="Question cannot be empty")
    if len(req.question.strip()) < 3:
        raise HTTPException(status_code=422, detail="Question is too short. Please ask a complete question.")
    if len(req.question) > 2000:
        raise HTTPException(status_code=422, detail="Question is too long. Please keep it under 2000 characters.")

    session_id = req.session_id or str(uuid.uuid4())

    # Trigger hadith corpus loading in background WITHOUT blocking the AI response.
    # If already loaded, this returns instantly.
    if not _hadith_v2_loaded:
        asyncio.create_task(_ensure_all_books_loaded())

    # RAG: retrieve top hadith from the actual indexed v2 corpus
    rag_hits = retrieve_hadiths_v2(req.question, limit=8)
    duas = retrieve_duas(req.question, limit=3)

    # Build the HADITH LIBRARY context the AI must cite from
    library_lines = []
    for h in rag_hits:
        meta = HADITH_V2_BOOKS.get(h["collection"], {})
        coll = meta.get("name", h["collection"])
        narrator = h.get("narrator") or ""
        text = (h.get("english") or "")[:600]  # cap per item
        library_lines.append(f"[{h['id']}] ({coll} #{h['number']}) Narrator: {narrator} | Text: {text}")
    library_text = "\n".join(library_lines) if library_lines else "(library is empty for this query — give Qur'an-based guidance)"

    duas_text = ""
    if duas:
        duas_text = "\nRELATED DUAS:\n" + "\n".join(f"- {d['title']} ({d['reference']}): {d['translation']}" for d in duas)

    context = f"HADITH LIBRARY (cite hadiths ONLY by these IDs):\n{library_text}{duas_text}"

    fallback_used = False
    try:
        data = await generate_answer(req.question, req.mode, session_id, context, req.conversation_history or [])
    except Exception:
        logging.exception("AI generation failed; serving local fallback")
        fallback_used = True
        _ = fallback_used
        data = {
            "answer": (
                "Here is guidance based on Qur'an and authentic Sunnah related to your question. "
                "The AI service is temporarily unavailable, so we are sharing the closest matched hadiths "
                "from our authentic library."
            ),
            "explanation": (
                "Please reflect on the verses and hadiths shown. For deeper context, consult a knowledgeable scholar."
            ),
            "quran_refs": [],
            "cite_hadith_ids": [h["id"] for h in rag_hits[:3]],
            "notice": "AI temporarily unavailable — guidance shown is from authentic sources we have indexed.",
            "related_duas": [d["title"] for d in duas[:3]],
        }

    # Hydrate custom hadiths provided by the AI (bypasses numbering mismatches)
    custom_hadiths = data.get("custom_hadiths") or []
    # Map full collection names to API slugs
    _coll_slug_map = {
        "sahih al-bukhari": "bukhari", "bukhari": "bukhari",
        "sahih muslim": "muslim", "muslim": "muslim",
        "sunan abu dawood": "abudawud", "sunan abu dawud": "abudawud", "abudawud": "abudawud",
        "jami` at-tirmidhi": "tirmidhi", "jami at-tirmidhi": "tirmidhi", "tirmidhi": "tirmidhi",
        "sunan an-nasa'i": "nasai", "nasai": "nasai",
        "sunan ibn majah": "ibnmajah", "ibn majah": "ibnmajah", "ibnmajah": "ibnmajah",
        "muwatta imam malik": "malik", "malik": "malik", "muwatta": "malik",
    }
    # sunnah.com style collection names for display
    _coll_display = {
        "bukhari": "Sahih al-Bukhari",
        "muslim": "Sahih Muslim",
        "abudawud": "Sunan Abu Dawud",
        "tirmidhi": "Jami` at-Tirmidhi",
        "nasai": "Sunan an-Nasa'i",
        "ibnmajah": "Sunan Ibn Majah",
        "malik": "Muwatta Malik",
    }
    hadith_refs = []
    for ch in custom_hadiths:
        raw_coll = ch.get("collection", "")
        slug = _coll_slug_map.get(raw_coll.lower(), raw_coll)
        h_num = ch.get("number", "")
        h_std = ch.get("number", "")
        h_eng = ch.get("english", "")
        h_ara = ch.get("arabic", "")
        
        # Attempt to align the custom hadith with our dataset so the link works perfectly
        try:
            if slug in HADITH_V2_BOOKS:
                book_items = await _load_hadith_book(slug)
                ai_norm = "".join(c for c in h_eng.lower() if c.isalnum())
                aligned_item = None
                
                if ai_norm and len(ai_norm) > 30:
                    # 1. Try exact number match first — check BOTH number and standard_number
                    try:
                        raw_num_str = str(h_num).split("a")[0].split("b")[0].strip()
                        target_num = int(raw_num_str.split(".")[0])
                        # First try matching against standard_number (sunnah.com numbering)
                        for item in book_items:
                            std = str(item.get("standard_number", ""))
                            # Match "1163" against "1163" or "1163.01" etc.
                            if std == raw_num_str or std.startswith(raw_num_str + ".") or std.split(".")[0] == raw_num_str:
                                # Verify text relevance
                                item_eng = item.get("english", "")
                                if item_eng:
                                    ai_words = set(w for w in h_eng.lower().split() if len(w) > 3)
                                    item_words = set(w for w in item_eng.lower().split() if len(w) > 3)
                                    if ai_words and item_words:
                                        overlap = len(ai_words.intersection(item_words)) / max(len(ai_words), 1)
                                        if overlap >= 0.3:
                                            aligned_item = item
                                            break
                        # Then try matching against the sequential number field
                        if not aligned_item:
                            for item in book_items:
                                if item.get("number") == target_num:
                                    item_eng = item.get("english", "")
                                    if item_eng:
                                        ai_words = set(w for w in h_eng.lower().split() if len(w) > 3)
                                        item_words = set(w for w in item_eng.lower().split() if len(w) > 3)
                                        if ai_words and item_words:
                                            overlap = len(ai_words.intersection(item_words)) / max(len(ai_words), 1)
                                            if overlap >= 0.3:
                                                aligned_item = item
                                    break
                    except (ValueError, TypeError):
                        pass

                    # 2. Try text-based matching if number match failed
                    if not aligned_item:
                        for item in book_items:
                            item_eng = item.get("english", "")
                            if not item_eng: continue
                            item_norm = "".join(c for c in item_eng.lower() if c.isalnum())
                            if len(ai_norm) > 50 and ai_norm[:50] in item_norm:
                                aligned_item = item
                                break
                    
                    # 3. Try word overlap with HIGH threshold (0.8) to avoid wrong matches
                    if not aligned_item and len(h_eng.split()) > 8:
                        ai_words = set(w for w in h_eng.lower().split() if len(w) > 3)
                        best_score = 0
                        best_item = None
                        for item in book_items:
                            item_eng = item.get("english", "")
                            if not item_eng: continue
                            item_words = set(w for w in item_eng.lower().split() if len(w) > 3)
                            if not item_words: continue
                            overlap = len(ai_words.intersection(item_words)) / max(len(ai_words), 1)
                            if overlap > best_score:
                                best_score = overlap
                                best_item = item
                        
                        if best_score >= 0.8:
                            aligned_item = best_item
                            
                if aligned_item:
                    logging.info(f"Aligned custom hadith: {slug} AI num {h_num} -> Dataset num {aligned_item['number']}")
                    h_num = str(aligned_item["number"])
                    h_std = str(aligned_item.get("standard_number") or aligned_item["number"])
                    h_eng = aligned_item.get("english") or h_eng
                    h_ara = aligned_item.get("arabic") or h_ara
                else:
                    h_std = h_num
        except Exception as e:
            logging.exception(f"Could not align hadith: {e}")

        hadith_refs.append({
            "collection": slug,
            "collection_name": _coll_display.get(slug, raw_coll),
            "number": h_num,
            "standard_number": h_std,
            "narrator": ch.get("narrator", ""),
            "arabic": h_ara,
            "english": h_eng,
            "authenticity": ch.get("authenticity", "Sahih")
        })

    # Only show hadiths the AI explicitly chose — no forced RAG merge
    hadith_refs = hadith_refs[:3]  # cap at 3 max

    record_id = str(uuid.uuid4())
    response = AskResponse(
        id=record_id,
        question=req.question,
        answer=data.get("answer", ""),
        detailed_answer=data.get("detailed_answer"),
        explanation=data.get("explanation", ""),
        quran_refs=[QuranRef(**q) for q in data.get("quran_refs", []) if q],
        hadith_refs=[HadithRef(**h) for h in hadith_refs if h],
        notice=data.get("notice"),
        related_duas=data.get("related_duas", []) or [],
        evidence_type=data.get("evidence_type"),
        scholarly_notes=data.get("scholarly_notes"),
        conclusion=data.get("conclusion"),
        created_at=datetime.now(timezone.utc).isoformat(),
    )

    # Persist
    try:
        if db is not None:
            await db.qa_history.insert_one({**response.model_dump(), "session_id": session_id})
    except Exception:
        logging.exception("failed to save qa history")

    return response


# ── Quran ──
@api.get("/hadith/search")
async def hadith_search(q: str, page: int = 1, per_page: int = 20):
    return hadith_service.search(q, page=page, per_page=per_page)


@api.get("/quran/surahs")
async def quran_surahs():
    global _surah_cache_ts
    now = _time.time()
    if "list" in _surah_cache and (now - _surah_cache_ts) < _SURAH_CACHE_TTL:
        return _surah_cache["list"]
    try:
        data = await asyncio.to_thread(fetch_alquran, "/surah")
        surahs = data.get("data", [])
        # Normalize: strip leading "سُورَةُ" or "سورة" prefix from Arabic name for cleaner display
        for s in surahs:
            n = s.get("name", "")
            for pre in ("سُورَةُ ", "سُورَةُ", "سورة "):
                if n.startswith(pre):
                    n = n[len(pre):]
                    break
            s["name"] = n.strip()
        _surah_cache["list"] = surahs
        _surah_cache_ts = now
        return surahs
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Quran API error: {e}")


@api.get("/quran/reciters")
async def quran_reciters():
    return RECITERS


_quran_token = None
_quran_token_expires = 0

@api.get("/quran/token")
async def quran_token():
    """Provides a short-lived access token for the frontend to hit Quran.com authenticated API."""
    global _quran_token, _quran_token_expires
    import time
    now = time.time()
    if _quran_token and now < _quran_token_expires:
        return {"access_token": _quran_token}

    client_id = os.environ.get("QURAN_FOUNDATION_CLIENT_ID")
    client_secret = os.environ.get("QURAN_FOUNDATION_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Quran API credentials not configured on backend")

    try:
        r = await asyncio.to_thread(
            requests.post,
            "https://oauth2.quran.foundation/oauth2/token",
            auth=(client_id, client_secret),
            data={
                "grant_type": "client_credentials",
                "scope": "content"
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10
        )
        r.raise_for_status()
        data = r.json()
        _quran_token = data.get("access_token")
        # Token is usually valid for 3600 seconds, subtract 300s buffer
        expires_in = data.get("expires_in", 3600)
        _quran_token_expires = now + expires_in - 300
        
        return {"access_token": _quran_token, "client_id": client_id}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch Quran.com token: {e}")


@api.get("/quran/surah/{number}")
async def quran_surah(number: int, edition: str = Query("en.sahih"), reciter: str = Query("ar.alafasy")):
    if reciter not in RECITER_IDS:
        reciter = "ar.alafasy"
    # Get the bitrate for this reciter
    reciter_meta = next((r for r in RECITERS if r["id"] == reciter), None)
    bitrate = reciter_meta["bitrate"] if reciter_meta else 128
    try:
        # Fetch arabic + translation
        ar = await asyncio.to_thread(fetch_alquran, f"/surah/{number}/quran-uthmani")
        tr = await asyncio.to_thread(fetch_alquran, f"/surah/{number}/{edition}")
        ar_data = ar["data"]
        tr_data = tr["data"]
        strip_bismillah = number not in (1, 9)
        ayahs = []
        for idx, (a, t) in enumerate(zip(ar_data["ayahs"], tr_data["ayahs"])):
            arabic_text = a["text"]
            if strip_bismillah and idx == 0:
                arabic_text = strip_bismillah_prefix(arabic_text)
            ayahs.append({
                "number": a["numberInSurah"],
                "globalNumber": a["number"],
                "arabic": arabic_text,
                "translation": t["text"],
                "audio": f"https://cdn.islamic.network/quran/audio/{bitrate}/{reciter}/{a['number']}.mp3",
            })
        return {
            "number": ar_data["number"],
            "name": ar_data["name"],
            "englishName": ar_data["englishName"],
            "englishNameTranslation": ar_data["englishNameTranslation"],
            "revelationType": ar_data["revelationType"],
            "numberOfAyahs": ar_data["numberOfAyahs"],
            "reciter": reciter,
            "edition": edition,
            "bismillah_audio": (
                f"https://cdn.islamic.network/quran/audio/{bitrate}/{reciter}/1.mp3"
                if strip_bismillah else None
            ),
            "ayahs": ayahs,
        }
    except requests.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Quran fetch failed: {e}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Quran error: {e}")


@api.get("/quran/editions")
async def quran_editions():
    """Authentic translation editions grouped by language."""
    return {"editions": TRANSLATION_EDITIONS}


@api.get("/quran/tafsirs")
async def quran_tafsirs():
    """Authentic tafsir editions grouped by language."""
    return {"tafsirs": TAFSIR_EDITIONS}


QURAN_COM_TAFSIR_BASE = "https://api.quran.com/api/v4/tafsirs"
_HTML_TAG_RE = _re.compile(r"<[^>]+>")
_WS_RE = _re.compile(r"\s+")


def _strip_html(html: str) -> str:
    if not html:
        return ""
    text = _HTML_TAG_RE.sub(" ", html)
    text = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"')
    return _WS_RE.sub(" ", text).strip()


@api.get("/quran/tafsir/{surah}/{ayah}")
async def quran_tafsir(surah: int, ayah: int, edition: str = Query("en-tafisr-ibn-kathir")):
    """Fetch tafsir for a specific ayah. Supports both spa5k and quran.com sources."""
    meta = _TAFSIR_BY_ID.get(edition)
    # Back-compat: treat unknown slugs as spa5k.
    source = (meta or {}).get("source", "spa5k")

    try:
        if source == "quran_com":
            rid = meta.get("resource_id")
            url = f"{QURAN_COM_TAFSIR_BASE}/{rid}/by_ayah/{surah}:{ayah}"
            data = await asyncio.to_thread(lambda: requests.get(url, timeout=20).json())
            raw_text = (data.get("tafsir") or {}).get("text") or ""
            text = _strip_html(raw_text)
        else:
            # spa5k
            url = f"{TAFSIR_CDN}/{edition}/{surah}/{ayah}.json"
            data = await asyncio.to_thread(lambda: requests.get(url, timeout=20).json())
            text = data.get("text", "") or ""
        return {
            "surah": surah,
            "ayah": ayah,
            "edition": edition,
            "source": source,
            "text": text,
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Tafsir fetch failed: {e}")


@api.get("/quran/search")
async def quran_search(q: str, edition: str = Query("en.sahih"), limit: int = 20):
    try:
        # Handle URL encoding for safer API requests
        from urllib.parse import quote
        safe_q = quote(q)
        data = await asyncio.to_thread(fetch_alquran, f"/search/{safe_q}/all/{edition}")
        matches = data.get("data", {}).get("matches", [])[:limit]
        return {"count": len(matches), "matches": matches}
    except requests.exceptions.HTTPError as http_err:
        # AlQuran.cloud returns 404 for 'zero matches found'
        if http_err.response.status_code == 404:
            return {"count": 0, "matches": []}
        raise HTTPException(status_code=502, detail=f"Quran search remote error: {http_err}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Quran search system error: {e}")


# ── Hadith ──
@api.get("/hadith/collections")
async def hadith_collections():
    return HADITHS_DATA["collections"]


@api.get("/hadith/search")
async def hadith_search(
    q: Optional[str] = None,
    collection: Optional[str] = None,
    authenticity: Optional[str] = None,
    limit: int = 50,
):
    results = HADITHS_DATA["hadiths"]
    if collection:
        results = [h for h in results if h["collection"] == collection]
    if authenticity:
        results = [h for h in results if h["authenticity"].lower() == authenticity.lower()]
    if q:
        keywords = extract_keywords(q)
        scored = []
        for h in results:
            haystack = " ".join([h["english"]] + h.get("topics", []) + [h.get("narrator", "")])
            score = keyword_score(haystack, keywords)
            if score > 0:
                scored.append((score, h))
        scored.sort(key=lambda x: -x[0])
        results = [h for _, h in scored]
    # decorate with collection name
    coll_map = {c["slug"]: c["name"] for c in HADITHS_DATA["collections"]}
    decorated = [{**h, "collection_name": coll_map.get(h["collection"], h["collection"])} for h in results[:limit]]
    return {"count": len(decorated), "results": decorated}


# ── Hadith v2 (large dataset) ──
async def _load_hadith_book(slug: str) -> List[Dict[str, Any]]:
    if slug in _hadith_v2_cache:
        return _hadith_v2_cache[slug]
    meta = HADITH_V2_BOOKS.get(slug)
    if not meta:
        raise HTTPException(status_code=404, detail="Book not found")

    items: List[Dict[str, Any]] = []
    try:
        if meta["source"] == "fawazahmed0":
            eng_url = f"{HADITH_CDN}/eng-{slug}.min.json"
            ara_url = f"{HADITH_CDN}/ara-{slug}.min.json"
            eng = await asyncio.to_thread(lambda: requests.get(eng_url, timeout=45).json())
            ara = await asyncio.to_thread(lambda: requests.get(ara_url, timeout=45).json())
            arabic_map = {h["hadithnumber"]: h.get("text", "") for h in ara.get("hadiths", [])}
            for h in eng.get("hadiths", []):
                num = h["hadithnumber"]
                items.append({
                    "id": f"{slug}-{num}",
                    "collection": slug,
                    "number": num,
                    "standard_number": str(h.get("arabicnumber") or num),
                    "english": h.get("text", ""),
                    "narrator": "",
                    "arabic": arabic_map.get(num, ""),
                    "grades": h.get("grades", []),
                })
            # Build chapter index from metadata.sections + section_details
            sections = (eng.get("metadata") or {}).get("sections") or {}
            details = (eng.get("metadata") or {}).get("section_details") or {}
            chapters = []
            for sec_num, title in sections.items():
                if not title or sec_num == "0":
                    continue
                sd = details.get(sec_num) or {}
                first = sd.get("hadithnumber_first") or 0
                last = sd.get("hadithnumber_last") or 0
                if first <= 0:
                    continue
                chapters.append({
                    "number": int(sec_num),
                    "title": title,
                    "first": int(first),
                    "last": int(last),
                    "count": int(last) - int(first) + 1,
                })
            chapters.sort(key=lambda c: c["number"])
            _hadith_v2_chapters[slug] = chapters
        elif meta["source"] in ("ahmedbaset", "ahmedbaset_other"):
            fname = meta.get("filename", slug)
            base = AHMEDBASET_OTHER_CDN if meta["source"] == "ahmedbaset_other" else AHMEDBASET_CDN
            url = f"{base}/{fname}.json"
            data = await asyncio.to_thread(lambda: requests.get(url, timeout=45).json())
            # Build chapter index from top-level chapters array
            chapters_raw = data.get("chapters") or []
            chapter_map: Dict[int, str] = {}
            for c in chapters_raw:
                cid = c.get("id")
                title = c.get("english") or c.get("arabic") or f"Chapter {cid}"
                if cid is not None:
                    chapter_map[cid] = title
            # first / last per chapter
            cfirst: Dict[int, int] = {}
            clast: Dict[int, int] = {}
            for h in data.get("hadiths", []):
                num = h.get("idInBook")
                cid = h.get("chapterId")
                if num is None or cid is None:
                    continue
                if cid not in cfirst or num < cfirst[cid]:
                    cfirst[cid] = num
                if cid not in clast or num > clast[cid]:
                    clast[cid] = num
            chapters = []
            for cid, title in chapter_map.items():
                if cid not in cfirst:
                    continue
                chapters.append({
                    "number": int(cid),
                    "title": title,
                    "first": int(cfirst[cid]),
                    "last": int(clast[cid]),
                    "count": int(clast[cid]) - int(cfirst[cid]) + 1,
                })
            chapters.sort(key=lambda c: c["number"])
            _hadith_v2_chapters[slug] = chapters

            for h in data.get("hadiths", []):
                num = h.get("idInBook")
                eng = h.get("english") or {}
                if isinstance(eng, dict):
                    text = (eng.get("text") or "").strip()
                    narrator = (eng.get("narrator") or "").strip()
                else:
                    text = str(eng or "")
                    narrator = ""
                items.append({
                    "id": f"{slug}-{num}",
                    "collection": slug,
                    "number": num,
                    "standard_number": str(num),
                    "english": text,
                    "narrator": narrator,
                    "arabic": h.get("arabic", ""),
                    "grades": [],
                })
    except Exception as e:
        logging.exception("hadith book load failed: %s", slug)
        raise HTTPException(status_code=502, detail=f"Failed to load {slug}: {e}")

    _hadith_v2_cache[slug] = items
    logging.info("Loaded hadith book '%s': %d items", slug, len(items))
    return items


async def _ensure_all_books_loaded():
    global _hadith_v2_loaded
    if _hadith_v2_loaded:
        return
    async with _hadith_v2_lock:
        if _hadith_v2_loaded:
            return
        results = await asyncio.gather(
            *[_load_hadith_book(s) for s in HADITH_V2_BOOKS.keys()],
            return_exceptions=True,
        )
        # Log any individual failures but don't block other books
        for slug, res in zip(HADITH_V2_BOOKS.keys(), results):
            if isinstance(res, Exception):
                logging.warning("Book %s failed to load: %s", slug, res)
        _hadith_v2_loaded = True


def _decorate_v2(h: Dict[str, Any]) -> Dict[str, Any]:
    meta = HADITH_V2_BOOKS.get(h["collection"], {})
    grades = h.get("grades") or []
    grade_text = grades[0].get("grade") if grades and isinstance(grades[0], dict) else None
    # Normalize authenticity label
    auth = meta.get("default_grade")
    if grade_text:
        gt = grade_text.lower()
        if "sahih" in gt or "saheeh" in gt:
            auth = "Sahih"
        elif "hasan" in gt:
            auth = "Hasan"
        elif "da" in gt or "weak" in gt:
            auth = "Da'if"
            
    # Fallback if no grading exists
    if not auth:
        if h["collection"] in ("bukhari", "muslim"):
            auth = "Sahih"
        else:
            auth = "Verified"

    return {
        **h,
        "collection_name": meta.get("name", h["collection"]),
        "authenticity": auth,
        "grade_text": grade_text,
    }


@api.get("/hadith/v2/books")
async def hadith_v2_books():
    """Return book metadata; loads counts in background if not cached."""
    out = []
    for slug, meta in HADITH_V2_BOOKS.items():
        count = len(_hadith_v2_cache.get(slug, []))
        out.append({
            "slug": slug,
            "name": meta["name"],
            "name_ar": meta.get("name_ar"),
            "compiler": meta["compiler"],
            "default_grade": meta["default_grade"],
            "color": meta.get("color"),
            "count": count,
            "loaded": slug in _hadith_v2_cache,
            "note": meta.get("note"),
        })
    return {"loaded_all": _hadith_v2_loaded, "books": out}


@api.get("/hadith/v2/search")
async def hadith_v2_search(
    q: Optional[str] = None,
    book: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    lang: Optional[str] = None,
):
    per_page = max(1, min(per_page, 100))
    page = max(1, page)
    if book and book not in HADITH_V2_BOOKS:
        raise HTTPException(status_code=400, detail="Unknown book")

    # Require a query for global (no-book) search — otherwise we'd dump 30k+ items.
    q_clean = (q or "").strip()
    if not book and not q_clean:
        return {"total": 0, "page": page, "per_page": per_page, "total_pages": 0, "results": []}

    if book:
        items = await _load_hadith_book(book)
    else:
        await _ensure_all_books_loaded()
        items = []
        for slug in HADITH_V2_BOOKS.keys():
            items.extend(_hadith_v2_cache.get(slug, []))

    # Filter out upstream gaps where both english and arabic are blank
    items = [h for h in items if (h.get("english") or "").strip() or (h.get("arabic") or "").strip()]

    if q_clean:
        keywords = extract_keywords(q_clean)
        # Fallback: if stopword filter removed everything, use raw lowercased tokens.
        if not keywords:
            keywords = [t for t in _re.findall(r"[a-zA-Z']+", q_clean.lower()) if len(t) >= 2]
        if keywords:
            scored = []
            ql = q_clean.lower()
            for h in items:
                text_en = (h.get("english") or "").lower()
                score = keyword_score(text_en, keywords)
                # phrase bonus
                if len(ql) >= 4 and ql in text_en:
                    score += 5
                if score > 0:
                    scored.append((score, h))
            scored.sort(key=lambda x: -x[0])
            items = [h for _, h in scored]
        else:
            items = []

    # Optional alternate-language overlay (per-book)
    lang_overlay = {}
    if lang and lang not in ("en",) and book:
        lang_overlay = await _load_hadith_lang(book, lang)

    total = len(items)
    start = (page - 1) * per_page
    end = start + per_page
    page_items = []
    for h in items[start:end]:
        d = _decorate_v2(h)
        if lang_overlay:
            d = {**d, "translation_lang": lang, "translation_text": lang_overlay.get(h["number"], "")}
        page_items.append(d)
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page if per_page else 1,
        "results": page_items,
    }


# ── Hadith chapters & multi-language (must be registered BEFORE /{book}/{number}) ──
async def _load_hadith_lang(slug: str, lang: str) -> Dict[int, str]:
    """Load alternate-language text for a book. lang = 'en'|'ar'|'ur'|'id'|'tr'|'bn'."""
    key = (slug, lang)
    if key in _hadith_lang_cache:
        return _hadith_lang_cache[key]
    meta = HADITH_V2_BOOKS.get(slug)
    if not meta or meta.get("source") != "fawazahmed0":
        return {}
    lang_prefix = {"en": "eng", "ar": "ara", "ur": "urd", "id": "ind", "tr": "tur", "bn": "ben", "fr": "fra", "ru": "rus"}.get(lang)
    if not lang_prefix:
        return {}
    url = f"{HADITH_CDN}/{lang_prefix}-{slug}.min.json"
    try:
        data = await asyncio.to_thread(lambda: requests.get(url, timeout=45).json())
    except Exception as e:
        logging.warning("lang load failed %s/%s: %s", slug, lang, e)
        return {}
    out = {h["hadithnumber"]: h.get("text", "") for h in data.get("hadiths", [])}
    _hadith_lang_cache[key] = out
    return out


@api.get("/hadith/v2/{book}/chapters")
async def hadith_v2_chapters(book: str):
    if book not in HADITH_V2_BOOKS:
        raise HTTPException(status_code=404, detail="Book not found")
    await _load_hadith_book(book)
    chapters = _hadith_v2_chapters.get(book) or []
    return {"book": book, "chapters": chapters}


@api.get("/hadith/v2/{book}/chapter/{chapter_number}")
async def hadith_v2_chapter_hadiths(
    book: str,
    chapter_number: int,
    page: int = 1,
    per_page: int = 20,
    lang: Optional[str] = None,
):
    if book not in HADITH_V2_BOOKS:
        raise HTTPException(status_code=404, detail="Book not found")
    items = await _load_hadith_book(book)
    chapters = _hadith_v2_chapters.get(book) or []
    chap = next((c for c in chapters if c["number"] == chapter_number), None)
    if not chap:
        raise HTTPException(status_code=404, detail="Chapter not found")
    in_chap = [h for h in items if chap["first"] <= h["number"] <= chap["last"]]
    in_chap = [h for h in in_chap if (h.get("english") or "").strip() or (h.get("arabic") or "").strip()]

    lang_map: Dict[int, str] = {}
    if lang and lang not in ("en",):
        lang_map = await _load_hadith_lang(book, lang)

    total = len(in_chap)
    per_page = max(1, min(per_page, 100))
    page = max(1, page)
    start = (page - 1) * per_page
    page_items = []
    for h in in_chap[start:start + per_page]:
        d = _decorate_v2(h)
        if lang_map:
            d = {**d, "translation_lang": lang, "translation_text": lang_map.get(h["number"], "")}
        page_items.append(d)
    return {
        "book": book,
        "chapter": chap,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page if per_page else 1,
        "results": page_items,
    }


@api.get("/hadith/v2/{book}/{number}")
async def hadith_v2_detail(book: str, number: int):
    if book not in HADITH_V2_BOOKS:
        raise HTTPException(status_code=404, detail="Book not found")
    items = await _load_hadith_book(book)
    for h in items:
        if h["number"] == number:
            return _decorate_v2(h)
    raise HTTPException(status_code=404, detail="Hadith not found")


# ── Duas ──
@api.get("/duas/categories")
async def get_dua_categories():
    return dua_service.get_categories()

@api.get("/duas/category/{id}")
async def get_dua_category(id: str):
    cat = dua_service.get_category(id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat

@api.get("/duas/topic/{id}")
async def get_dua_topic(id: str):
    topic = dua_service.get_topic(id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic

@api.get("/duas/search")
async def search_duas(q: str = Query("", min_length=1)):
    return dua_service.search(q)

@api.get("/duas/{id}")
async def get_dua_detail(id: str):
    dua = dua_service.get_dua(id)
    if not dua:
        raise HTTPException(status_code=404, detail="Dua not found")
    return dua

@api.get("/duas/bookmarks")
async def get_dua_bookmarks():
    # Placeholder for future cloud sync
    return []


# ── Mount ──
app.include_router(api)


logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


@app.on_event("startup")
async def warmup_hadith_corpus():
    """Pre-warm the v2 hadith corpus in the background so the first AI call is fast."""
    async def _bg():
        try:
            await _ensure_all_books_loaded()
            total = sum(len(v) for v in _hadith_v2_cache.values())
            logging.info("Hadith v2 corpus pre-warmed: %d hadiths across %d books", total, len(_hadith_v2_cache))
        except Exception:
            logging.exception("Pre-warm failed (will retry lazily on first request)")
    asyncio.create_task(_bg())


@app.on_event("shutdown")
async def shutdown_db_client():
    if client is not None:
        client.close()


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)

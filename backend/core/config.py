import os
import logging
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
from groq import Groq

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")

# ── Database ──
_supabase_url = os.environ.get("SUPABASE_URL", "")
_supabase_key = os.environ.get("SUPABASE_KEY", "")
if _supabase_url and _supabase_key:
    db: Client = create_client(_supabase_url, _supabase_key)
else:
    logging.warning("SUPABASE_URL/KEY not set — running without database persistence")
    db = None

# ── Groq ──
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# ── External API bases ──
ALQURAN_BASE = "https://api.alquran.cloud/v1"
HADITH_CDN = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions"
TAFSIR_CDN = "https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir"
AHMEDBASET_CDN = "https://cdn.jsdelivr.net/gh/AhmedBaset/hadith-json@main/db/by_book/the_9_books"
AHMEDBASET_OTHER_CDN = "https://cdn.jsdelivr.net/gh/AhmedBaset/hadith-json@main/db/by_book/other_books"
QURAN_COM_TAFSIR_BASE = "https://api.quran.com/api/v4/tafsirs"

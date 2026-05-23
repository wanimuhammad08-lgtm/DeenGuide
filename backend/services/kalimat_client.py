"""Kalimat API client for verified hadith lookup."""
import os
import logging
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)

KALIMAT_API_KEY = os.environ.get("KALIMAT_API_KEY", "")
KALIMAT_BASE = "https://api.kalimat.dev/api/v2"

# Mapping from Kalimat sourceBook values to our app's book slugs
_KALIMAT_TO_APP_SLUG = {
    "Bukhari": "bukhari",
    "Muslim": "muslim",
    "AbuDaud": "abudawud",
    "Tirmizi": "tirmidhi",
    "Nesai": "nasai",
    "IbnMaja": "ibnmajah",
}

# Mapping from our app slugs to Kalimat filter values
_APP_SLUG_TO_KALIMAT = {
    "bukhari": "bukhari",
    "muslim": "muslim",
    "abudawud": "abudaud",
    "tirmidhi": "tirmizi",
    "nasai": "nesai",
    "ibnmajah": "ibnmaja",
}


def verify_hadith(english_text: str, collection_hint: str = "", number_hint: str = "") -> Optional[Dict[str, Any]]:
    """
    Verify a hadith using Kalimat semantic search.
    Returns verified hadith data with correct collection and number, or None if not found.
    """
    if not KALIMAT_API_KEY:
        return None

    # Use a meaningful snippet for search (first 150 chars of the hadith text)
    query = english_text.strip()[:150]
    if not query or len(query) < 10:
        return None

    params = {
        "query": query,
        "contentType": "sunnah",
        "getText": "true",
        "getMetadata": "true",
        "numResults": 3,
        "userLang": "en",
    }

    # If we have a collection hint, filter by it
    hint_slug = collection_hint.lower().strip()
    kalimat_book = _APP_SLUG_TO_KALIMAT.get(hint_slug)
    if kalimat_book:
        params["hadithSourceBook"] = kalimat_book

    try:
        resp = requests.get(
            f"{KALIMAT_BASE}/search",
            params=params,
            headers={"X-Api-Key": KALIMAT_API_KEY},
            timeout=10,
        )
        if resp.status_code != 200:
            logger.warning("Kalimat API returned %d: %s", resp.status_code, resp.text[:200])
            return None

        data = resp.json()
        results = data.get("data", {}).get("results", [])
        if not results:
            # Retry without book filter
            if kalimat_book:
                params.pop("hadithSourceBook", None)
                resp = requests.get(
                    f"{KALIMAT_BASE}/search",
                    params=params,
                    headers={"X-Api-Key": KALIMAT_API_KEY},
                    timeout=10,
                )
                if resp.status_code == 200:
                    results = resp.json().get("data", {}).get("results", [])

        if not results:
            return None

        # Pick the best match (first result from semantic search)
        hit = results[0]
        source_book = hit.get("sourceBook", "")
        app_slug = _KALIMAT_TO_APP_SLUG.get(source_book, source_book.lower())

        return {
            "collection": app_slug,
            "number": str(hit.get("hadithNumber", "")),
            "narrator": hit.get("isnadEn", "").replace("Narrated ", "").rstrip(":"),
            "arabic": hit.get("matnAr", ""),
            "english": hit.get("matnEn", "") or hit.get("translatedText", ""),
            "authenticity": _normalize_grade(hit.get("gradeEn", "")),
            "chapter": hit.get("chapterEnglish", ""),
            "source_book_display": hit.get("sourceBook", ""),
        }

    except requests.Timeout:
        logger.warning("Kalimat API timeout")
        return None
    except Exception as e:
        logger.warning("Kalimat API error: %s", e)
        return None


def _normalize_grade(grade_en: str) -> str:
    """Normalize Kalimat grade to our app's format."""
    g = grade_en.lower()
    if "sahih" in g or "authentic" in g:
        return "Sahih"
    elif "hasan" in g or "good" in g:
        return "Hasan"
    elif "daif" in g or "weak" in g:
        return "Da'if"
    elif "maudu" in g or "fabricated" in g:
        return "Maudu"
    return grade_en or "Unknown"


def verify_hadiths_batch(hadiths: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Verify a list of AI-generated hadiths against Kalimat API.
    Returns the list with corrected/verified data.
    """
    if not KALIMAT_API_KEY:
        return hadiths

    verified = []
    for h in hadiths:
        english = h.get("english", "")
        collection = h.get("collection", "")
        number = h.get("number", "")

        result = verify_hadith(english, collection, number)
        if result:
            verified.append(result)
            logger.info(
                "Hadith verified: %s #%s → %s #%s",
                collection, number, result["collection"], result["number"]
            )
        else:
            # Keep the AI-generated one as-is if verification fails
            verified.append(h)

    return verified

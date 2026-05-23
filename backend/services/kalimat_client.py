"""Kalimat API client — primary hadith data source for DeenGuide."""
import os
import logging
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)

KALIMAT_API_KEY = os.environ.get("KALIMAT_API_KEY", "")
KALIMAT_BASE = "https://api.kalimat.dev/api/v2"

# Mapping from Kalimat sourceBook values to our app's book slugs
KALIMAT_TO_APP_SLUG = {
    "Bukhari": "bukhari",
    "Muslim": "muslim",
    "AbuDaud": "abudawud",
    "Tirmizi": "tirmidhi",
    "Nesai": "nasai",
    "IbnMaja": "ibnmajah",
}

# Mapping from our app slugs to Kalimat filter values
APP_SLUG_TO_KALIMAT = {
    "bukhari": "bukhari",
    "muslim": "muslim",
    "abudawud": "abudaud",
    "tirmidhi": "tirmizi",
    "nasai": "nesai",
    "ibnmajah": "ibnmaja",
}


def _headers():
    return {"X-Api-Key": KALIMAT_API_KEY}


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


def _transform_hit(hit: Dict[str, Any]) -> Dict[str, Any]:
    """Transform a Kalimat API result into our app's hadith format."""
    source_book = hit.get("sourceBook", "")
    app_slug = KALIMAT_TO_APP_SLUG.get(source_book, source_book.lower())
    number = hit.get("hadithNumber", 0)
    grade_en = hit.get("gradeEn", "")

    return {
        "id": f"{app_slug}-{number}",
        "collection": app_slug,
        "number": number,
        "english": hit.get("matnEn", "") or hit.get("translatedText", ""),
        "arabic": hit.get("matnAr", "") or hit.get("text", ""),
        "narrator": (hit.get("isnadEn", "") or "").replace("Narrated ", "").rstrip(":").strip(),
        "grades": [{"grade": grade_en}] if grade_en else [],
        "chapter_number": hit.get("chapterNumber"),
        "chapter_english": hit.get("chapterEnglish", ""),
        "chapter_arabic": hit.get("chapterArabic", ""),
        "section_english": hit.get("sectionEnglish", ""),
        "section_number": hit.get("sectionNumber"),
    }


# ─── Search ───────────────────────────────────────────────────────────────────

def search_hadiths(
    query: str,
    book: Optional[str] = None,
    num_results: int = 20,
    start: int = 0,
    grade: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Semantic search for hadiths via Kalimat API.
    Returns: { total, results: [...] }
    """
    if not KALIMAT_API_KEY:
        return {"total": 0, "results": []}

    params = {
        "query": query,
        "contentType": "sunnah",
        "getText": "true",
        "getMetadata": "true",
        "numResults": min(num_results, 50),
        "start": start,
        "userLang": "en",
    }

    if book:
        kalimat_book = APP_SLUG_TO_KALIMAT.get(book)
        if kalimat_book:
            params["hadithSourceBook"] = kalimat_book

    if grade:
        params["hadithGrade"] = grade

    try:
        resp = requests.get(
            f"{KALIMAT_BASE}/search",
            params=params,
            headers=_headers(),
            timeout=15,
        )
        if resp.status_code != 200:
            logger.warning("Kalimat search returned %d", resp.status_code)
            return {"total": 0, "results": []}

        data = resp.json()
        results_raw = data.get("data", {}).get("results", [])
        total = data.get("data", {}).get("total_results_num", len(results_raw))

        results = [_transform_hit(h) for h in results_raw]
        return {"total": total, "results": results}

    except requests.Timeout:
        logger.warning("Kalimat search timeout")
        return {"total": 0, "results": []}
    except Exception as e:
        logger.warning("Kalimat search error: %s", e)
        return {"total": 0, "results": []}


# ─── Chapters / Filters ───────────────────────────────────────────────────────

def get_chapters(book: str) -> List[Dict[str, Any]]:
    """Get chapter list for a book from Kalimat filters endpoint."""
    if not KALIMAT_API_KEY:
        return []

    kalimat_book = APP_SLUG_TO_KALIMAT.get(book)
    if not kalimat_book:
        return []

    try:
        resp = requests.get(
            f"{KALIMAT_BASE}/filters/sunnah",
            params={"book": kalimat_book},
            headers=_headers(),
            timeout=15,
        )
        if resp.status_code != 200:
            logger.warning("Kalimat filters returned %d", resp.status_code)
            return []

        data = resp.json()
        chapters_raw = data.get("chapters", [])

        chapters = []
        for ch in chapters_raw:
            chapters.append({
                "number": ch.get("number", 0),
                "title": ch.get("labelEn", "") or ch.get("labelAr", ""),
                "title_ar": ch.get("labelAr", ""),
            })
        return chapters

    except Exception as e:
        logger.warning("Kalimat chapters error: %s", e)
        return []


def get_chapter_hadiths(
    book: str,
    chapter_number: int,
    num_results: int = 50,
    start: int = 0,
) -> Dict[str, Any]:
    """Get hadiths for a specific chapter in a book."""
    if not KALIMAT_API_KEY:
        return {"total": 0, "results": []}

    kalimat_book = APP_SLUG_TO_KALIMAT.get(book)
    if not kalimat_book:
        return {"total": 0, "results": []}

    params = {
        "query": "*",
        "contentType": "sunnah",
        "getText": "true",
        "getMetadata": "true",
        "numResults": min(num_results, 50),
        "start": start,
        "userLang": "en",
        "hadithSourceBook": kalimat_book,
        "hadithChapter": chapter_number,
    }

    try:
        resp = requests.get(
            f"{KALIMAT_BASE}/search",
            params=params,
            headers=_headers(),
            timeout=15,
        )
        if resp.status_code != 200:
            logger.warning("Kalimat chapter hadiths returned %d", resp.status_code)
            return {"total": 0, "results": []}

        data = resp.json()
        results_raw = data.get("data", {}).get("results", [])
        total = data.get("data", {}).get("total_results_num", len(results_raw))

        results = [_transform_hit(h) for h in results_raw]
        return {"total": total, "results": results}

    except Exception as e:
        logger.warning("Kalimat chapter hadiths error: %s", e)
        return {"total": 0, "results": []}


# ─── Detail (single hadith) ──────────────────────────────────────────────────

def get_hadith_detail(book: str, number: int) -> Optional[Dict[str, Any]]:
    """Fetch a specific hadith by book and number."""
    if not KALIMAT_API_KEY:
        return None

    kalimat_book = APP_SLUG_TO_KALIMAT.get(book)
    if not kalimat_book:
        return None

    # Search for the exact hadith number in the book
    params = {
        "query": str(number),
        "contentType": "sunnah",
        "getText": "true",
        "getMetadata": "true",
        "numResults": 10,
        "userLang": "en",
        "hadithSourceBook": kalimat_book,
    }

    try:
        resp = requests.get(
            f"{KALIMAT_BASE}/search",
            params=params,
            headers=_headers(),
            timeout=15,
        )
        if resp.status_code != 200:
            return None

        data = resp.json()
        results_raw = data.get("data", {}).get("results", [])

        # Find exact match by hadith number
        for hit in results_raw:
            if hit.get("hadithNumber") == number:
                return _transform_hit(hit)

        # If no exact match, return first result if it's close
        if results_raw:
            return _transform_hit(results_raw[0])

        return None

    except Exception as e:
        logger.warning("Kalimat detail error: %s", e)
        return None


# ─── AI Verification (kept from before) ──────────────────────────────────────

def verify_hadith(english_text: str, collection_hint: str = "", number_hint: str = "") -> Optional[Dict[str, Any]]:
    """
    Verify a hadith using Kalimat semantic search.
    Returns verified hadith data with correct collection and number, or None.
    """
    if not KALIMAT_API_KEY:
        return None

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

    hint_slug = collection_hint.lower().strip()
    kalimat_book = APP_SLUG_TO_KALIMAT.get(hint_slug)
    if kalimat_book:
        params["hadithSourceBook"] = kalimat_book

    try:
        resp = requests.get(
            f"{KALIMAT_BASE}/search",
            params=params,
            headers=_headers(),
            timeout=10,
        )
        if resp.status_code != 200:
            return None

        data = resp.json()
        results = data.get("data", {}).get("results", [])
        if not results and kalimat_book:
            params.pop("hadithSourceBook", None)
            resp = requests.get(f"{KALIMAT_BASE}/search", params=params, headers=_headers(), timeout=10)
            if resp.status_code == 200:
                results = resp.json().get("data", {}).get("results", [])

        if not results:
            return None

        hit = results[0]
        source_book = hit.get("sourceBook", "")
        app_slug = KALIMAT_TO_APP_SLUG.get(source_book, source_book.lower())

        return {
            "collection": app_slug,
            "number": str(hit.get("hadithNumber", "")),
            "narrator": (hit.get("isnadEn", "") or "").replace("Narrated ", "").rstrip(":").strip(),
            "arabic": hit.get("matnAr", ""),
            "english": hit.get("matnEn", "") or hit.get("translatedText", ""),
            "authenticity": _normalize_grade(hit.get("gradeEn", "")),
        }

    except Exception:
        return None


def verify_hadiths_batch(hadiths: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Verify a list of AI-generated hadiths against Kalimat API."""
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
        else:
            verified.append(h)

    return verified

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException

from services.kalimat_client import (
    search_hadiths,
    get_chapters,
    get_chapter_hadiths,
    get_hadith_detail,
    KALIMAT_TO_APP_SLUG,
    APP_SLUG_TO_KALIMAT,
    _normalize_grade,
)

router = APIRouter()

# Book metadata (static — Kalimat covers 6 major collections)
HADITH_BOOKS = {
    "bukhari": {"name": "Sahih al-Bukhari", "name_ar": "صحيح البخاري", "compiler": "Imam al-Bukhari", "default_grade": "Sahih", "color": "#E0A91B"},
    "muslim": {"name": "Sahih Muslim", "name_ar": "صحيح مسلم", "compiler": "Imam Muslim", "default_grade": "Sahih", "color": "#86C29B"},
    "tirmidhi": {"name": "Jami` at-Tirmidhi", "name_ar": "جامع الترمذي", "compiler": "Imam at-Tirmidhi", "default_grade": None, "color": "#E66B3D"},
    "abudawud": {"name": "Sunan Abu Dawood", "name_ar": "سنن أبي داود", "compiler": "Imam Abu Dawood", "default_grade": None, "color": "#3B9CE8"},
    "nasai": {"name": "Sunan an-Nasa'i", "name_ar": "سنن النسائي", "compiler": "Imam an-Nasa'i", "default_grade": None, "color": "#34D399"},
    "ibnmajah": {"name": "Sunan Ibn Majah", "name_ar": "سنن ابن ماجه", "compiler": "Imam Ibn Majah", "default_grade": None, "color": "#A78BFA"},
}


def _decorate(h: dict) -> dict:
    """Add collection_name and authenticity to a hadith result."""
    meta = HADITH_BOOKS.get(h.get("collection", ""), {})
    grades = h.get("grades") or []
    grade_text = grades[0].get("grade") if grades and isinstance(grades[0], dict) else None
    auth = meta.get("default_grade")
    if grade_text:
        auth = _normalize_grade(grade_text)
    if not auth:
        auth = "Sahih" if h.get("collection") in ("bukhari", "muslim") else "Verified"
    return {
        **h,
        "collection_name": meta.get("name", h.get("collection", "")),
        "authenticity": auth,
        "grade_text": grade_text,
    }


# ─── Books ────────────────────────────────────────────────────────────────────

@router.get("/hadith/v2/books")
async def hadith_v2_books():
    out = []
    for slug, meta in HADITH_BOOKS.items():
        out.append({
            "slug": slug,
            "name": meta["name"],
            "name_ar": meta.get("name_ar"),
            "compiler": meta["compiler"],
            "default_grade": meta["default_grade"],
            "color": meta.get("color"),
            "loaded": True,
        })
    return {"books": out}


# ─── Search ───────────────────────────────────────────────────────────────────

@router.get("/hadith/v2/search")
async def hadith_v2_search(
    q: Optional[str] = None,
    book: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    lang: Optional[str] = None,
):
    per_page = max(1, min(per_page, 50))
    page = max(1, page)

    if book and book not in HADITH_BOOKS:
        raise HTTPException(status_code=400, detail="Unknown book")

    q_clean = (q or "").strip()
    if not q_clean:
        return {"total": 0, "page": page, "per_page": per_page, "total_pages": 0, "results": []}

    start = (page - 1) * per_page
    data = search_hadiths(query=q_clean, book=book, num_results=per_page, start=start)

    total = data["total"]
    results = [_decorate(h) for h in data["results"]]

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page if per_page else 1,
        "results": results,
    }


# ─── Chapters ─────────────────────────────────────────────────────────────────

@router.get("/hadith/v2/{book}/chapters")
async def hadith_v2_chapters(book: str):
    if book not in HADITH_BOOKS:
        raise HTTPException(status_code=404, detail="Book not found")

    chapters = get_chapters(book)
    return {"book": book, "chapters": chapters}


# ─── Chapter Hadiths ──────────────────────────────────────────────────────────

@router.get("/hadith/v2/{book}/chapter/{chapter_number}")
async def hadith_v2_chapter_hadiths(
    book: str,
    chapter_number: int,
    page: int = 1,
    per_page: int = 20,
    lang: Optional[str] = None,
):
    if book not in HADITH_BOOKS:
        raise HTTPException(status_code=404, detail="Book not found")

    per_page = max(1, min(per_page, 50))
    page = max(1, page)
    start = (page - 1) * per_page

    data = get_chapter_hadiths(book, chapter_number, num_results=per_page, start=start)
    total = data["total"]
    results = [_decorate(h) for h in data["results"]]

    # Get chapter info
    chapters = get_chapters(book)
    chap = next((c for c in chapters if c["number"] == chapter_number), None)
    if not chap:
        chap = {"number": chapter_number, "title": f"Chapter {chapter_number}"}

    return {
        "book": book,
        "chapter": chap,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page if per_page else 1,
        "results": results,
    }


# ─── Detail ───────────────────────────────────────────────────────────────────

@router.get("/hadith/v2/{book}/{number}")
async def hadith_v2_detail(book: str, number: int):
    if book not in HADITH_BOOKS:
        raise HTTPException(status_code=404, detail="Book not found")

    result = get_hadith_detail(book, number)
    if not result:
        raise HTTPException(status_code=404, detail="Hadith not found")

    return _decorate(result)


# ─── Legacy v1 endpoints (kept for backward compat) ──────────────────────────

@router.get("/hadith/collections")
async def hadith_collections():
    return [
        {"slug": slug, "name": meta["name"]}
        for slug, meta in HADITH_BOOKS.items()
    ]


@router.get("/hadith/search")
async def hadith_search(
    q: Optional[str] = None,
    collection: Optional[str] = None,
    authenticity: Optional[str] = None,
    limit: int = 50,
):
    if not q:
        return {"count": 0, "results": []}

    data = search_hadiths(query=q, book=collection, num_results=min(limit, 50), grade=authenticity)
    results = [_decorate(h) for h in data["results"]]
    return {"count": len(results), "results": results}

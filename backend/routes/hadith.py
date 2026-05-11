import re
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from core.hadith_data import (
    HADITH_V2_BOOKS, _hadith_v2_cache, _hadith_v2_chapters,
    _load_hadith_book, _ensure_all_books_loaded, _load_hadith_lang,
    _decorate_v2, extract_keywords, keyword_score,
)
from services.hadith_service import HadithService

router = APIRouter()
hadith_service = HadithService()

DATA_DIR = Path(__file__).parent.parent / "data"
with open(DATA_DIR / "hadiths.json", "r", encoding="utf-8") as f:
    HADITHS_DATA = json.load(f)


@router.get("/hadith/collections")
async def hadith_collections():
    return HADITHS_DATA["collections"]


@router.get("/hadith/search")
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
    coll_map = {c["slug"]: c["name"] for c in HADITHS_DATA["collections"]}
    decorated = [{**h, "collection_name": coll_map.get(h["collection"], h["collection"])} for h in results[:limit]]
    return {"count": len(decorated), "results": decorated}


@router.get("/hadith/v2/books")
async def hadith_v2_books():
    out = []
    for slug, meta in HADITH_V2_BOOKS.items():
        count = len(_hadith_v2_cache.get(slug, []))
        out.append({
            "slug": slug, "name": meta["name"], "name_ar": meta.get("name_ar"),
            "compiler": meta["compiler"], "default_grade": meta["default_grade"],
            "color": meta.get("color"), "count": count,
            "loaded": slug in _hadith_v2_cache, "note": meta.get("note"),
        })
    return {"books": out}


@router.get("/hadith/v2/search")
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

    items = [h for h in items if (h.get("english") or "").strip() or (h.get("arabic") or "").strip()]

    if q_clean:
        keywords = extract_keywords(q_clean)
        if not keywords:
            keywords = [t for t in re.findall(r"[a-zA-Z']+", q_clean.lower()) if len(t) >= 2]
        if keywords:
            ql = q_clean.lower()
            scored = []
            for h in items:
                text_en = (h.get("english") or "").lower()
                score = keyword_score(text_en, keywords)
                if len(ql) >= 4 and ql in text_en:
                    score += 5
                if score > 0:
                    scored.append((score, h))
            scored.sort(key=lambda x: -x[0])
            items = [h for _, h in scored]
        else:
            items = []

    lang_overlay = {}
    if lang and lang not in ("en",) and book:
        lang_overlay = await _load_hadith_lang(book, lang)

    total = len(items)
    start = (page - 1) * per_page
    page_items = []
    for h in items[start:start + per_page]:
        d = _decorate_v2(h)
        if lang_overlay:
            d = {**d, "translation_lang": lang, "translation_text": lang_overlay.get(h["number"], "")}
        page_items.append(d)
    return {
        "total": total, "page": page, "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page if per_page else 1,
        "results": page_items,
    }


@router.get("/hadith/v2/{book}/chapters")
async def hadith_v2_chapters(book: str):
    if book not in HADITH_V2_BOOKS:
        raise HTTPException(status_code=404, detail="Book not found")
    await _load_hadith_book(book)
    return {"book": book, "chapters": _hadith_v2_chapters.get(book) or []}


@router.get("/hadith/v2/{book}/chapter/{chapter_number}")
async def hadith_v2_chapter_hadiths(
    book: str, chapter_number: int,
    page: int = 1, per_page: int = 20, lang: Optional[str] = None,
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
    start = (page - 1) * per_page
    page_items = []
    for h in in_chap[start:start + per_page]:
        d = _decorate_v2(h)
        if lang_map:
            d = {**d, "translation_lang": lang, "translation_text": lang_map.get(h["number"], "")}
        page_items.append(d)
    return {
        "book": book, "chapter": chap, "total": total, "page": page, "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page if per_page else 1,
        "results": page_items,
    }


@router.get("/hadith/v2/{book}/{number}")
async def hadith_v2_detail(book: str, number: int):
    if book not in HADITH_V2_BOOKS:
        raise HTTPException(status_code=404, detail="Book not found")
    items = await _load_hadith_book(book)
    for h in items:
        if h["number"] == number:
            return _decorate_v2(h)
    raise HTTPException(status_code=404, detail="Hadith not found")

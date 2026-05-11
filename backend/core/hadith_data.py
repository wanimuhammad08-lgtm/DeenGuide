import re
import asyncio
import logging
import requests
from typing import List, Dict, Any, Optional
from fastapi import HTTPException

from core.config import HADITH_CDN, AHMEDBASET_CDN, AHMEDBASET_OTHER_CDN

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
_hadith_v2_chapters: Dict[str, List[Dict[str, Any]]] = {}
_hadith_v2_loaded = False
_hadith_v2_lock = asyncio.Lock()
_hadith_lang_cache: Dict[tuple, Dict[int, str]] = {}

SYNONYMS = {
    "salah": ["prayer", "salat", "pray"], "salat": ["prayer", "salah"],
    "prayer": ["salah", "salat"], "wudu": ["ablution"], "ablution": ["wudu"],
    "sawm": ["fasting", "fast", "siyam"], "siyam": ["fasting", "sawm"],
    "fasting": ["sawm", "siyam"], "zakat": ["alms", "charity"],
    "sadaqah": ["charity", "alms"], "hajj": ["pilgrimage"], "umrah": ["pilgrimage"],
    "shirk": ["polytheism", "associating partners"], "tawhid": ["monotheism", "oneness"],
    "iman": ["faith", "belief"], "kufr": ["disbelief"],
    "gheebah": ["backbiting", "slander"], "ghibah": ["backbiting", "slander"],
    "backbiting": ["gheebah", "ghibah", "slander"], "slander": ["backbiting", "gheebah"],
    "riba": ["usury", "interest"], "usury": ["riba", "interest"],
    "qiyamah": ["resurrection", "judgment day", "last day"],
    "akhirah": ["hereafter", "afterlife"], "jannah": ["paradise", "heaven"],
    "jahannam": ["hell", "hellfire"], "rasul": ["messenger", "prophet"],
    "nabi": ["prophet"], "halal": ["lawful", "permitted"], "haram": ["forbidden", "prohibited"],
    "rizq": ["sustenance", "provision"], "tahajjud": ["night prayer", "qiyam"],
    "qiyam": ["tahajjud", "night prayer"], "dhikr": ["remembrance"],
    "tawbah": ["repentance"], "istighfar": ["forgiveness"],
    "neighbor": ["neighbour"], "neighbour": ["neighbor"],
    "parents": ["mother", "father"], "mother": ["parents"], "father": ["parents"],
    "music": ["singing", "instruments"], "alcohol": ["khamr", "wine", "intoxicant"],
    "khamr": ["alcohol", "wine", "intoxicant"],
    "marriage": ["nikah", "spouse", "wife", "husband"], "nikah": ["marriage"],
    "divorce": ["talaq"], "talaq": ["divorce"],
}


def keyword_score(text: str, keywords: List[str]) -> int:
    t = text.lower()
    return sum(1 for k in keywords if k.lower() in t)


def extract_keywords(question: str) -> List[str]:
    stop = set("the a an is are was were be been being of on in to for with about and or but if as by at it this that those these who whom whose what which when where why how do does did can could should would shall will may might must i you he she we they him her us them my your his her our their".split())
    words = re.findall(r"[a-zA-Z']+", question.lower())
    base = [w for w in words if w not in stop and len(w) > 2]
    expanded = set(base)
    for w in base:
        for syn in SYNONYMS.get(w, []):
            expanded.add(syn)
    return list(expanded)


def retrieve_hadiths_v2(question: str, limit: int = 8) -> List[Dict[str, Any]]:
    keywords = extract_keywords(question)
    if not keywords:
        keywords = [t for t in re.findall(r"[a-zA-Z']+", question.lower()) if len(t) >= 3]
    if not keywords:
        return []
    bigrams = [f"{keywords[i]} {keywords[i+1]}" for i in range(len(keywords) - 1) if len(keywords[i]) > 3]
    q_lower = question.lower()
    scored = []
    for slug, items in list(_hadith_v2_cache.items()):
        for h in items:
            text = (h.get("english") or "").lower()
            if not text:
                continue
            score = sum(1 for k in keywords if k in text)
            score += sum(3 for bg in bigrams if bg in text)
            if len(q_lower) >= 6 and q_lower in text:
                score += 6
            if score > 0:
                scored.append((score, h))
    scored.sort(key=lambda x: -x[0])
    return [h for _, h in scored[:limit]]


def _hadith_authenticity(slug: str) -> str:
    meta = HADITH_V2_BOOKS.get(slug, {})
    if slug in ("bukhari", "muslim"):
        return "Sahih"
    return meta.get("default_grade") or "Authentic"


def _decorate_v2(h: Dict[str, Any]) -> Dict[str, Any]:
    meta = HADITH_V2_BOOKS.get(h["collection"], {})
    grades = h.get("grades") or []
    grade_text = grades[0].get("grade") if grades and isinstance(grades[0], dict) else None
    auth = meta.get("default_grade")
    if grade_text:
        gt = grade_text.lower()
        if "sahih" in gt or "saheeh" in gt:
            auth = "Sahih"
        elif "hasan" in gt:
            auth = "Hasan"
        elif "da" in gt or "weak" in gt:
            auth = "Da'if"
    if not auth:
        auth = "Sahih" if h["collection"] in ("bukhari", "muslim") else "Verified"
    return {**h, "collection_name": meta.get("name", h["collection"]), "authenticity": auth, "grade_text": grade_text}


async def _load_hadith_book(slug: str) -> List[Dict[str, Any]]:
    if slug in _hadith_v2_cache:
        return _hadith_v2_cache[slug]
    meta = HADITH_V2_BOOKS.get(slug)
    if not meta:
        raise HTTPException(status_code=404, detail="Book not found")
    items: List[Dict[str, Any]] = []
    try:
        if meta["source"] == "fawazahmed0":
            eng = await asyncio.to_thread(lambda: requests.get(f"{HADITH_CDN}/eng-{slug}.min.json", timeout=45).json())
            ara = await asyncio.to_thread(lambda: requests.get(f"{HADITH_CDN}/ara-{slug}.min.json", timeout=45).json())
            arabic_map = {h["hadithnumber"]: h.get("text", "") for h in ara.get("hadiths", [])}
            for h in eng.get("hadiths", []):
                num = h["hadithnumber"]
                items.append({"id": f"{slug}-{num}", "collection": slug, "number": num,
                               "english": h.get("text", ""), "narrator": "",
                               "arabic": arabic_map.get(num, ""), "grades": h.get("grades", [])})
            sections = (eng.get("metadata") or {}).get("sections") or {}
            details = (eng.get("metadata") or {}).get("section_details") or {}
            chapters = []
            for sec_num, title in sections.items():
                if not title or sec_num == "0":
                    continue
                sd = details.get(sec_num) or {}
                first, last = sd.get("hadithnumber_first") or 0, sd.get("hadithnumber_last") or 0
                if first <= 0:
                    continue
                chapters.append({"number": int(sec_num), "title": title, "first": int(first),
                                  "last": int(last), "count": int(last) - int(first) + 1})
            chapters.sort(key=lambda c: c["number"])
            _hadith_v2_chapters[slug] = chapters
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
        results = await asyncio.gather(*[_load_hadith_book(s) for s in HADITH_V2_BOOKS.keys()], return_exceptions=True)
        for slug, res in zip(HADITH_V2_BOOKS.keys(), results):
            if isinstance(res, Exception):
                logging.warning("Book %s failed to load: %s", slug, res)
        _hadith_v2_loaded = True


async def _load_hadith_lang(slug: str, lang: str) -> Dict[int, str]:
    key = (slug, lang)
    if key in _hadith_lang_cache:
        return _hadith_lang_cache[key]
    meta = HADITH_V2_BOOKS.get(slug)
    if not meta or meta.get("source") != "fawazahmed0":
        return {}
    lang_prefix = {"en": "eng", "ar": "ara", "ur": "urd", "id": "ind", "tr": "tur", "bn": "ben", "fr": "fra", "ru": "rus"}.get(lang)
    if not lang_prefix:
        return {}
    try:
        data = await asyncio.to_thread(lambda: requests.get(f"{HADITH_CDN}/{lang_prefix}-{slug}.min.json", timeout=45).json())
    except Exception as e:
        logging.warning("lang load failed %s/%s: %s", slug, lang, e)
        return {}
    out = {h["hadithnumber"]: h.get("text", "") for h in data.get("hadiths", [])}
    _hadith_lang_cache[key] = out
    return out

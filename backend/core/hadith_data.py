"""
Hadith data module — now powered by Kalimat API.
Kept for backward compatibility with AI route imports.
"""
import re
import logging
from typing import List, Dict, Any

from services.kalimat_client import search_hadiths, APP_SLUG_TO_KALIMAT

# Book metadata (kept for AI route references)
HADITH_V2_BOOKS: Dict[str, Dict[str, Any]] = {
    "bukhari": {"name": "Sahih al-Bukhari", "name_ar": "صحيح البخاري", "compiler": "Imam al-Bukhari", "default_grade": "Sahih", "color": "#E0A91B"},
    "muslim": {"name": "Sahih Muslim", "name_ar": "صحيح مسلم", "compiler": "Imam Muslim", "default_grade": "Sahih", "color": "#86C29B"},
    "tirmidhi": {"name": "Jami` at-Tirmidhi", "name_ar": "جامع الترمذي", "compiler": "Imam at-Tirmidhi", "default_grade": None, "color": "#E66B3D"},
    "abudawud": {"name": "Sunan Abu Dawood", "name_ar": "سنن أبي داود", "compiler": "Imam Abu Dawood", "default_grade": None, "color": "#3B9CE8"},
    "nasai": {"name": "Sunan an-Nasa'i", "name_ar": "سنن النسائي", "compiler": "Imam an-Nasa'i", "default_grade": None, "color": "#34D399"},
    "ibnmajah": {"name": "Sunan Ibn Majah", "name_ar": "سنن ابن ماجه", "compiler": "Imam Ibn Majah", "default_grade": None, "color": "#A78BFA"},
}

# No longer needed but kept as no-ops for import compatibility
_hadith_v2_cache: Dict[str, List[Dict[str, Any]]] = {}

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
    """
    Retrieve relevant hadiths for the AI context using Kalimat semantic search.
    """
    keywords = extract_keywords(question)
    query = question.strip()
    if not query:
        return []

    data = search_hadiths(query=query, num_results=limit)
    return data.get("results", [])


async def _ensure_all_books_loaded():
    """No-op — Kalimat API is on-demand, no pre-loading needed."""
    pass

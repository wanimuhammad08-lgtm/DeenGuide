import re
import asyncio
import os
import time
import requests
import logging
from typing import Any, Dict, Optional
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Query

from core.config import ALQURAN_BASE, TAFSIR_CDN, QURAN_COM_TAFSIR_BASE

router = APIRouter()

RECITERS = [
    {"id": "ar.alafasy", "name": "Mishary Rashid Alafasy", "bitrate": 128},
    {"id": "ar.abdulbasitmurattal", "name": "Abdul Basit (Murattal)", "bitrate": 128},
    {"id": "ar.abdurrahmaansudais", "name": "Abdurrahmaan As-Sudais", "bitrate": 128},
    {"id": "ar.mahermuaiqly", "name": "Maher Al Muaiqly", "bitrate": 128},
    {"id": "ar.minshawi", "name": "Mohamed Siddiq El-Minshawi", "bitrate": 128},
    {"id": "ar.husary", "name": "Mahmoud Khalil Al-Husary", "bitrate": 128},
    {"id": "ar.shaatree", "name": "Abu Bakr Ash-Shaatree", "bitrate": 128},
    {"id": "ar.hudhaify", "name": "Ali Hudhaify", "bitrate": 128},
]
RECITER_IDS = {r["id"] for r in RECITERS}

TRANSLATION_EDITIONS = [
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
    {"id": "ur.jalandhry", "language": "Urdu", "language_code": "ur", "scholar": "Fateh Muhammad Jalandhry", "note": "Classical Urdu", "audio_base": "https://everyayah.com/data/translations/urdu_shamshad_ali_khan_46kbps", "audio_reciter": "Shamshad Ali Khan"},
    {"id": "ur.junagarhi", "language": "Urdu", "language_code": "ur", "scholar": "Muhammad Junagarhi", "note": "Simple contemporary Urdu", "audio_base": "https://everyayah.com/data/translations/urdu_shamshad_ali_khan_46kbps", "audio_reciter": "Shamshad Ali Khan"},
    {"id": "ur.maududi", "language": "Urdu", "language_code": "ur", "scholar": "Abul A'la Maududi (Tafheem-ul-Quran)", "note": "Tafheem-ul-Quran", "audio_base": "https://everyayah.com/data/translations/urdu_farhat_hashmi", "audio_reciter": "Dr. Farhat Hashmi (generic)"},
    {"id": "ur.qadri", "language": "Urdu", "language_code": "ur", "scholar": "Dr. Tahir-ul-Qadri (Irfan-ul-Quran)", "note": "Contemporary eloquent Urdu", "audio_base": "https://everyayah.com/data/translations/urdu_farhat_hashmi", "audio_reciter": "Dr. Farhat Hashmi (generic)"},
    {"id": "ur.kanzuliman", "language": "Urdu", "language_code": "ur", "scholar": "Ahmed Raza Khan (Kanz-ul-Iman)", "note": "Barelvi tradition", "audio_base": "https://everyayah.com/data/translations/urdu_farhat_hashmi", "audio_reciter": "Dr. Farhat Hashmi (generic)"},
    {"id": "ur.ahmedali", "language": "Urdu", "language_code": "ur", "scholar": "Ahmed Ali", "note": "Literary Urdu", "audio_base": "https://everyayah.com/data/translations/urdu_farhat_hashmi", "audio_reciter": "Dr. Farhat Hashmi (generic)"},
    {"id": "ur.jawadi", "language": "Urdu", "language_code": "ur", "scholar": "Syed Zeeshan Haider Jawadi", "note": "Shia academic translation"},
    {"id": "ur.najafi", "language": "Urdu", "language_code": "ur", "scholar": "Muhammad Hussain Najafi", "note": "Detailed Urdu translation"},
    {"id": "ar.muyassar", "language": "Arabic", "language_code": "ar", "scholar": "Tafsir Al-Muyassar", "note": "Simple Arabic paraphrase"},
    {"id": "ar.jalalayn", "language": "Arabic", "language_code": "ar", "scholar": "Tafsir Al-Jalalayn (Arabic)", "note": "Classical concise tafsir in Arabic"},
    {"id": "hi.hindi", "language": "Hindi", "language_code": "hi", "scholar": "Suhel Farooq Khan & Saifur Rahman Nadwi", "note": "Reference Hindi translation"},
    {"id": "hi.farooq", "language": "Hindi", "language_code": "hi", "scholar": "Muhammad Farooq Khan & Muhammad Ahmed", "note": "Alternative Hindi translation"},
    {"id": "ps.abdulwali", "language": "Pashto", "language_code": "ps", "scholar": "Abdul Wali Khan", "note": "Reference Pashto translation"},
    {"id": "sd.amroti", "language": "Sindhi", "language_code": "sd", "scholar": "Taj Mehmood Amroti", "note": "Reference Sindhi translation"},
    {"id": "id.indonesian", "language": "Indonesian", "language_code": "id", "scholar": "Indonesian Ministry of Religious Affairs", "note": "Official government edition"},
    {"id": "id.muntakhab", "language": "Indonesian", "language_code": "id", "scholar": "Muhammad Quraish Shihab — Al-Muntakhab", "note": "Contemporary Indonesian"},
    {"id": "bn.bengali", "language": "Bengali", "language_code": "bn", "scholar": "Muhiuddin Khan", "note": "Widely used in Bangladesh"},
    {"id": "bn.hoque", "language": "Bengali", "language_code": "bn", "scholar": "Zohurul Hoque", "note": "Alternative Bengali translation"},
    {"id": "tr.diyanet", "language": "Turkish", "language_code": "tr", "scholar": "Diyanet İşleri", "note": "Official Turkish state edition"},
    {"id": "tr.vakfi", "language": "Turkish", "language_code": "tr", "scholar": "Diyanet Vakfı", "note": "Turkish religious foundation"},
    {"id": "tr.yazir", "language": "Turkish", "language_code": "tr", "scholar": "Elmalılı Hamdi Yazır", "note": "Classical Turkish tafsir"},
    {"id": "tr.yildirim", "language": "Turkish", "language_code": "tr", "scholar": "Suat Yıldırım", "note": "Contemporary Turkish"},
    {"id": "fr.hamidullah", "language": "French", "language_code": "fr", "scholar": "Muhammad Hamidullah", "note": "Reference French translation"},
    {"id": "ru.kuliev", "language": "Russian", "language_code": "ru", "scholar": "Elmir Kuliev", "note": "Reference Russian translation"},
    {"id": "es.cortes", "language": "Spanish", "language_code": "es", "scholar": "Julio Cortés", "note": "Reference Spanish translation"},
    {"id": "es.garcia", "language": "Spanish", "language_code": "es", "scholar": "Isa Garcia", "note": "Modern Spanish translation"},
    {"id": "fa.fooladvand", "language": "Persian", "language_code": "fa", "scholar": "Mohammad Mahdi Fooladvand", "note": "Reference Persian translation", "audio_base": "https://everyayah.com/data/translations/Fooladvand_Hedayatfar_40Kbps", "audio_reciter": "Hedayatfar"},
    {"id": "fa.makarem", "language": "Persian", "language_code": "fa", "scholar": "Naser Makarem Shirazi", "note": "Contemporary Persian"},
    {"id": "fa.ansarian", "language": "Persian", "language_code": "fa", "scholar": "Hussain Ansarian", "note": "Modern Persian translation"},
    {"id": "de.bubenheim", "language": "German", "language_code": "de", "scholar": "A.S.F. Bubenheim & N. Elyas", "note": "Reference German translation"},
    {"id": "de.aburida", "language": "German", "language_code": "de", "scholar": "Abu Rida Muhammad ibn Ahmad", "note": "Alternative German"},
    {"id": "ta.tamil", "language": "Tamil", "language_code": "ta", "scholar": "Jan Turst Foundation", "note": "Reference Tamil translation"},
    {"id": "ml.abdulhameed", "language": "Malayalam", "language_code": "ml", "scholar": "Abdul Hameed & Parappoor", "note": "Reference Malayalam translation"},
    {"id": "sw.barwani", "language": "Swahili", "language_code": "sw", "scholar": "Ali Muhsin Al-Barwani", "note": "Reference Swahili translation"},
    {"id": "zh.jian", "language": "Chinese", "language_code": "zh", "scholar": "Ma Jian", "note": "Reference Chinese translation"},
    {"id": "ku.asan", "language": "Kurdish", "language_code": "ku", "scholar": "Burhan Muhammad-Amin", "note": "Tefsiri Asan"},
]

TAFSIR_EDITIONS = [
    {"id": "ar-tafsir-ibn-kathir", "language": "Arabic", "language_code": "ar", "scholar": "Ibn Kathir", "source": "spa5k"},
    {"id": "ar-tafsir-al-tabari", "language": "Arabic", "language_code": "ar", "scholar": "At-Tabari (Jami` al-Bayan)", "source": "spa5k"},
    {"id": "ar-tafseer-al-qurtubi", "language": "Arabic", "language_code": "ar", "scholar": "Al-Qurtubi", "source": "spa5k"},
    {"id": "ar-tafsir-al-baghawi", "language": "Arabic", "language_code": "ar", "scholar": "Al-Baghawi (Ma`alim at-Tanzil)", "source": "spa5k"},
    {"id": "ar-tafseer-al-saddi", "language": "Arabic", "language_code": "ar", "scholar": "As-Sa`di", "source": "spa5k"},
    {"id": "ar-tafsir-muyassar", "language": "Arabic", "language_code": "ar", "scholar": "Tafsir al-Muyassar", "source": "spa5k"},
    {"id": "qc-ar-al-wasit", "language": "Arabic", "language_code": "ar", "scholar": "Tantawi — Al-Wasit", "source": "quran_com", "resource_id": 93},
    {"id": "en-tafisr-ibn-kathir", "language": "English", "language_code": "en", "scholar": "Ibn Kathir (English — Abridged)", "source": "spa5k"},
    {"id": "en-tafsir-maarif-ul-quran", "language": "English", "language_code": "en", "scholar": "Mufti Muhammad Shafi Usmani — Ma'arif-ul-Qur'an", "source": "spa5k"},
    {"id": "en-tafsir-ibn-abbas", "language": "English", "language_code": "en", "scholar": "Tanwir al-Miqbas (Ibn Abbas)", "source": "spa5k"},
    {"id": "en-al-jalalayn", "language": "English", "language_code": "en", "scholar": "Al-Jalalayn (English)", "source": "spa5k"},
    {"id": "qc-en-tazkirul-quran", "language": "English", "language_code": "en", "scholar": "Maulana Wahiduddin Khan — Tazkirul Quran", "source": "quran_com", "resource_id": 817},
    {"id": "qc-ur-ibn-kathir", "language": "Urdu", "language_code": "ur", "scholar": "Ibn Kathir — Urdu", "source": "quran_com", "resource_id": 160},
    {"id": "ur-tafsir-bayan-ul-quran", "language": "Urdu", "language_code": "ur", "scholar": "Dr. Israr Ahmad — Bayan-ul-Quran", "source": "spa5k"},
    {"id": "qc-ur-fi-zilal", "language": "Urdu", "language_code": "ur", "scholar": "Sayyid Qutb — Fi Zilal al-Qur'an (Urdu)", "source": "quran_com", "resource_id": 157},
    {"id": "qc-ur-tazkir-ul-quran", "language": "Urdu", "language_code": "ur", "scholar": "Maulana Wahiduddin Khan — Tazkir-ul-Quran (Urdu)", "source": "quran_com", "resource_id": 818},
    {"id": "ur-tafseer-ibn-e-kaseer", "language": "Urdu", "language_code": "ur", "scholar": "Ibn Kathir (Urdu — alt)", "source": "spa5k"},
    {"id": "ur-tazkirul-quran", "language": "Urdu", "language_code": "ur", "scholar": "Tazkir-ul-Quran (spa5k)", "source": "spa5k"},
    {"id": "bn-tafseer-ibn-e-kaseer", "language": "Bengali", "language_code": "bn", "scholar": "Ibn Kathir (Bengali)", "source": "spa5k"},
    {"id": "bn-tafsir-ahsanul-bayaan", "language": "Bengali", "language_code": "bn", "scholar": "Ahsanul Bayaan", "source": "spa5k"},
    {"id": "bn-tafsir-abu-bakr-zakaria", "language": "Bengali", "language_code": "bn", "scholar": "Dr. Abu Bakr Zakaria", "source": "spa5k"},
    {"id": "qc-bn-fathul-majid", "language": "Bengali", "language_code": "bn", "scholar": "AbdulRahman al-Alshaikh — Fathul Majid", "source": "quran_com", "resource_id": 381},
    {"id": "ru-tafseer-al-saddi", "language": "Russian", "language_code": "ru", "scholar": "As-Sa`di (Russian)", "source": "spa5k"},
    {"id": "kurd-tafsir-rebar", "language": "Kurdish", "language_code": "ku", "scholar": "Rebar Kurdish Tafsir", "source": "spa5k"},
]
_TAFSIR_BY_ID = {e["id"]: e for e in TAFSIR_EDITIONS}

_BISMILLAH_RE = re.compile(
    r"^[\ufeff\s]*ب[\u064B-\u065F\u0670]*س[\u064B-\u065F\u0670]*م[\u064B-\u065F\u0670]*"
    r"\s*[ا\u0671][\u064B-\u065F\u0670]*ل[\u064B-\u065F\u0670]*ل[\u064B-\u065F\u0670]*ه[\u064B-\u065F\u0670]*"
    r"\s*[ا\u0671][\u064B-\u065F\u0670]*ل[\u064B-\u065F\u0670]*ر[\u064B-\u065F\u0670]*ح[\u064B-\u065F\u0670]*م[\u064B-\u065F\u0670]*ن[\u064B-\u065F\u0670]*"
    r"\s*[ا\u0671][\u064B-\u065F\u0670]*ل[\u064B-\u065F\u0670]*ر[\u064B-\u065F\u0670]*ح[\u064B-\u065F\u0670]*ي[\u064B-\u065F\u0670]*م[\u064B-\u065F\u0670]*"
    r"[\s\u200f\u200e]*"
)
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")

_surah_cache: Dict[str, Any] = {}
_quran_token = None
_quran_token_expires = 0


def fetch_alquran(path: str, params=None) -> dict:
    r = requests.get(f"{ALQURAN_BASE}{path}", params=params, timeout=15)
    r.raise_for_status()
    return r.json()


def strip_bismillah_prefix(text: str) -> str:
    if not text:
        return text
    return _BISMILLAH_RE.sub("", text).lstrip()


def _strip_html(html: str) -> str:
    if not html:
        return ""
    text = _HTML_TAG_RE.sub(" ", html)
    text = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"')
    return _WS_RE.sub(" ", text).strip()


@router.get("/quran/surahs")
async def quran_surahs():
    if "list" in _surah_cache:
        return _surah_cache["list"]
    try:
        data = await asyncio.to_thread(fetch_alquran, "/surah")
        surahs = data.get("data", [])
        for s in surahs:
            n = s.get("name", "")
            for pre in ("سُورَةُ ", "سُورَةُ", "سورة "):
                if n.startswith(pre):
                    n = n[len(pre):]
                    break
            s["name"] = n.strip()
        _surah_cache["list"] = surahs
        return surahs
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Quran API error: {e}")


@router.get("/quran/reciters")
async def quran_reciters():
    return RECITERS


@router.get("/quran/token")
async def quran_token():
    global _quran_token, _quran_token_expires
    now = time.time()
    if _quran_token and now < _quran_token_expires:
        return {"access_token": _quran_token}
    client_id = os.environ.get("QURAN_FOUNDATION_CLIENT_ID")
    client_secret = os.environ.get("QURAN_FOUNDATION_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Quran API credentials not configured on backend")
    try:
        r = await asyncio.to_thread(
            requests.post, "https://oauth2.quran.foundation/oauth/token",
            data={"client_id": client_id, "client_secret": client_secret, "grant_type": "client_credentials"},
            timeout=10
        )
        r.raise_for_status()
        data = r.json()
        _quran_token = data.get("access_token")
        _quran_token_expires = now + data.get("expires_in", 3600) - 300
        return {"access_token": _quran_token}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch Quran.com token: {e}")


@router.get("/quran/surah/{number}")
async def quran_surah(number: int, edition: str = Query("en.sahih"), reciter: str = Query("ar.alafasy")):
    if reciter not in RECITER_IDS:
        reciter = "ar.alafasy"
    try:
        ar = await asyncio.to_thread(fetch_alquran, f"/surah/{number}/quran-uthmani")
        tr = await asyncio.to_thread(fetch_alquran, f"/surah/{number}/{edition}")
        ar_data, tr_data = ar["data"], tr["data"]
        strip_bismillah = number not in (1, 9)
        ayahs = []
        for idx, (a, t) in enumerate(zip(ar_data["ayahs"], tr_data["ayahs"])):
            arabic_text = a["text"]
            if strip_bismillah and idx == 0:
                arabic_text = strip_bismillah_prefix(arabic_text)
            ayahs.append({
                "number": a["numberInSurah"], "globalNumber": a["number"],
                "arabic": arabic_text, "translation": t["text"],
                "audio": f"https://cdn.islamic.network/quran/audio/128/{reciter}/{a['number']}.mp3",
            })
        return {
            "number": ar_data["number"], "name": ar_data["name"],
            "englishName": ar_data["englishName"], "englishNameTranslation": ar_data["englishNameTranslation"],
            "revelationType": ar_data["revelationType"], "numberOfAyahs": ar_data["numberOfAyahs"],
            "reciter": reciter, "edition": edition,
            "bismillah_audio": f"https://cdn.islamic.network/quran/audio/128/{reciter}/1.mp3" if strip_bismillah else None,
            "ayahs": ayahs,
        }
    except requests.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Quran fetch failed: {e}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Quran error: {e}")


@router.get("/quran/editions")
async def quran_editions():
    return {"editions": TRANSLATION_EDITIONS}


@router.get("/quran/tafsirs")
async def quran_tafsirs():
    return {"tafsirs": TAFSIR_EDITIONS}


@router.get("/quran/tafsir/{surah}/{ayah}")
async def quran_tafsir(surah: int, ayah: int, edition: str = Query("en-tafisr-ibn-kathir")):
    meta = _TAFSIR_BY_ID.get(edition)
    source = (meta or {}).get("source", "spa5k")
    try:
        if source == "quran_com":
            rid = meta.get("resource_id")
            data = await asyncio.to_thread(lambda: requests.get(f"{QURAN_COM_TAFSIR_BASE}/{rid}/by_ayah/{surah}:{ayah}", timeout=20).json())
            text = _strip_html((data.get("tafsir") or {}).get("text") or "")
        else:
            data = await asyncio.to_thread(lambda: requests.get(f"{TAFSIR_CDN}/{edition}/{surah}/{ayah}.json", timeout=20).json())
            text = data.get("text", "") or ""
        return {"surah": surah, "ayah": ayah, "edition": edition, "source": source, "text": text}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Tafsir fetch failed: {e}")


@router.get("/quran/search")
async def quran_search(q: str, edition: str = Query("en.sahih"), limit: int = 20):
    try:
        data = await asyncio.to_thread(fetch_alquran, f"/search/{quote(q)}/all/{edition}")
        matches = data.get("data", {}).get("matches", [])[:limit]
        return {"count": len(matches), "matches": matches}
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            return {"count": 0, "matches": []}
        raise HTTPException(status_code=502, detail=f"Quran search error: {e}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Quran search error: {e}")

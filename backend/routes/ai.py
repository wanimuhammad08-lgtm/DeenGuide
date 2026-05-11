import uuid
import json
import re
import logging
import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter
from groq import Groq

from core.config import groq_client, db
from core.models import AskRequest, AskResponse, QuranRef, HadithRef
from core.hadith_data import (
    HADITH_V2_BOOKS, retrieve_hadiths_v2, _ensure_all_books_loaded
)
from services.dua_service import dua_service
from core.hadith_data import extract_keywords, keyword_score

router = APIRouter()

SYSTEM_PROMPT = """You are DeenGuide AI, an empathetic, highly knowledgeable Islamic scholar following the orthodox Ahl al-Sunnah wal Jama'ah.

SCOPE & MISSION:
- You MUST answer ALL user queries, whether strictly religious or about daily life struggles (e.g., mental health, relationship advice, missing an ex, breakups, grief, stress). 
- NEVER reject a question for seeming secular. Instead, masterfully pivot the response by anchoring their natural human situation into Islamic wisdom, spiritual healing, Qadar (Divine decree), Sabr (patience), and Allah's infinite mercy.
- For sensitive theological questions (e.g., fate of specific individuals, controversial rulings), give the AUTHENTIC Sunni scholarly position clearly and directly, citing evidence. Do NOT dodge or give vague answers.

STYLE & TONE:
- Start with a brief empathetic greeting (e.g., "Assalamu Alaikum!").
- Be DIRECT and CLEAR. Give the ruling or answer FIRST, then explain the evidence.
- For "how to" questions: provide NUMBERED STEPS with clear detail.
- For "is X halal/haram" questions: state the majority scholarly position CLEARLY in the first sentence, then provide evidence.
- Address the deeper Wisdom (Hikmah) behind the spiritual advice or ruling.

CORE RULES (MANDATORY):
1. Grounding: Anchor all responses strictly in the Qur'an and authentic Sunnah.
2. Custom Hadith: Internally source 1-3 famous, highly relevant Hadiths (preferably from Bukhari or Muslim) and return the full English text via `custom_hadiths`. Include narrator chain if known.
3. Quran Verses: Include 1-2 precise relevant verses in `quran_refs`.
4. Fiqh Insight: You MUST populate `scholarly_notes` with an authentic paragraph detailing how the 4 Madhahib (Hanafi, Maliki, Shafi'i, Hanbali) or major scholars view this issue. Mention specific scholars by name.

ALWAYS respond with ONLY this JSON:
{
  "detailed_answer": "<A comprehensive answer (150-300 words). For step-by-step questions, use numbered steps. For rulings, state the ruling clearly first then explain. Be thorough but not repetitive.>",
  "quran_refs": [{"surah": <int>, "surah_name": "<English>", "ayah": <int>, "arabic": "<arabic verse>", "translation": "<English translation>"}],
  "custom_hadiths": [{"collection": "Sahih al-Bukhari", "number": "1234", "narrator": "<narrator if known>", "english": "<full translation of hadith>", "authenticity": "Sahih"}],
  "scholarly_notes": "<ONE paragraph clearly synthesizing the authentic scholarly consensus or the perspectives of the 4 Madhahib relevant to this issue. Mention specific scholars where relevant.>",
  "conclusion": "<ONE concise conclusion paragraph summarizing the takeaway and ending with practical advice or 'And Allah knows best.'>",
  "evidence_type": "Direct Text Evidence",
  "related_duas": ["<title>"]
}
"""

_COLL_SLUG_MAP = {
    "sahih al-bukhari": "bukhari", "bukhari": "bukhari",
    "sahih muslim": "muslim", "muslim": "muslim",
    "sunan abu dawood": "abudawud", "sunan abu dawud": "abudawud", "abudawud": "abudawud",
    "jami` at-tirmidhi": "tirmidhi", "jami at-tirmidhi": "tirmidhi", "tirmidhi": "tirmidhi",
    "sunan an-nasa'i": "nasai", "nasai": "nasai",
    "sunan ibn majah": "ibnmajah", "ibn majah": "ibnmajah", "ibnmajah": "ibnmajah",
    "muwatta imam malik": "malik", "malik": "malik", "muwatta": "malik",
}


def retrieve_duas(question: str, limit: int = 3) -> List[Dict[str, Any]]:
    keywords = extract_keywords(question)
    if not keywords:
        return []
    scored = []
    for dua in dua_service.duas.values():
        topic = dua_service.topics.get(dua["topic_id"])
        topic_title = topic["title"] if topic else ""
        haystack = f"{topic_title} {dua['translation']}".lower()
        score = keyword_score(haystack, keywords)
        if score > 0:
            d_copy = dict(dua)
            d_copy["title"] = topic_title
            scored.append((score, d_copy))
    scored.sort(key=lambda x: -x[0])
    return [d for _, d in scored[:limit]]


async def generate_answer(question: str, mode: str, session_id: str, context: str, conversation_history: list = None) -> Dict[str, Any]:
    if not groq_client:
        raise RuntimeError("Groq API key not configured")
    depth_note = "Be thorough and scholarly." if mode == "deep" else "Be simple and beginner-friendly."
    user_text = f"""USER QUESTION: {question}\n\nEXPLANATION DEPTH: {depth_note}\n\nRELEVANT CONTEXT (use what fits, ignore the rest):\n{context}\n\nRespond ONLY with the JSON object as instructed. No markdown fences."""
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if conversation_history:
        for turn in conversation_history[-6:]:
            messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": user_text})
    response = await asyncio.to_thread(
        groq_client.chat.completions.create,
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=0.3,
        max_tokens=2500,
        response_format={"type": "json_object"},
    )
    cleaned = re.sub(r"^```(?:json)?\s*", "", response.choices[0].message.content.strip())
    cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not m:
            raise
        return json.loads(m.group(0))


@router.post("/ai/ask", response_model=AskResponse)
async def ai_ask(req: AskRequest):
    session_id = req.session_id or str(uuid.uuid4())
    try:
        await asyncio.wait_for(_ensure_all_books_loaded(), timeout=60)
    except Exception:
        logging.warning("hadith v2 corpus not fully loaded; falling back to local seed only")

    rag_hits = retrieve_hadiths_v2(req.question, limit=8)
    duas = retrieve_duas(req.question, limit=3)

    library_lines = []
    for h in rag_hits:
        meta = HADITH_V2_BOOKS.get(h["collection"], {})
        coll = meta.get("name", h["collection"])
        text = (h.get("english") or "")[:600]
        library_lines.append(f"[{h['id']}] ({coll} #{h['number']}) Narrator: {h.get('narrator') or ''} | Text: {text}")
    library_text = "\n".join(library_lines) if library_lines else "(library is empty — give Qur'an-based guidance)"
    duas_text = ("\nRELATED DUAS:\n" + "\n".join(f"- {d['title']} ({d['reference']}): {d['translation']}" for d in duas)) if duas else ""
    context = f"HADITH LIBRARY (cite hadiths ONLY by these IDs):\n{library_text}{duas_text}"

    try:
        data = await generate_answer(req.question, req.mode, session_id, context, req.conversation_history or [])
    except Exception:
        logging.exception("AI generation failed; serving local fallback")
        data = {
            "answer": "The AI service is temporarily unavailable. Here is guidance from authentic sources.",
            "explanation": "Please reflect on the hadiths shown. For deeper context, consult a knowledgeable scholar.",
            "quran_refs": [], "cite_hadith_ids": [h["id"] for h in rag_hits[:3]],
            "notice": "AI temporarily unavailable.", "related_duas": [d["title"] for d in duas[:3]],
        }

    hadith_refs = []
    for ch in (data.get("custom_hadiths") or []):
        raw_coll = ch.get("collection", "")
        slug = _COLL_SLUG_MAP.get(raw_coll.lower(), raw_coll)
        hadith_refs.append({
            "collection": slug, "number": ch.get("number", ""),
            "narrator": ch.get("narrator", ""), "arabic": ch.get("arabic", ""),
            "english": ch.get("english", ""), "authenticity": ch.get("authenticity", "Sahih"),
        })

    record_id = str(uuid.uuid4())
    resp = AskResponse(
        id=record_id, question=req.question,
        answer=data.get("answer", ""), detailed_answer=data.get("detailed_answer"),
        explanation=data.get("explanation", ""),
        quran_refs=[QuranRef(**q) for q in data.get("quran_refs", []) if q],
        hadith_refs=[HadithRef(**h) for h in hadith_refs[:3] if h],
        notice=data.get("notice"), related_duas=data.get("related_duas", []) or [],
        evidence_type=data.get("evidence_type"), scholarly_notes=data.get("scholarly_notes"),
        conclusion=data.get("conclusion"), created_at=datetime.now(timezone.utc).isoformat(),
    )
    try:
        if db is not None:
            payload = {**resp.model_dump(), "session_id": session_id}
            await asyncio.to_thread(db.table("qa_history").insert(payload).execute)
    except Exception:
        logging.exception("failed to save qa history")
    return resp

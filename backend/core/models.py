from typing import List, Optional, Dict
from pydantic import BaseModel


class AskRequest(BaseModel):
    question: str
    mode: str = "deep"
    session_id: Optional[str] = None
    conversation_history: Optional[List[Dict[str, str]]] = None


class QuranRef(BaseModel):
    surah: int
    surah_name: str
    ayah: int
    arabic: str
    translation: str


class HadithRef(BaseModel):
    collection: str
    number: str
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
    evidence_type: Optional[str] = None
    scholarly_notes: Optional[str] = None
    conclusion: Optional[str] = None
    created_at: str

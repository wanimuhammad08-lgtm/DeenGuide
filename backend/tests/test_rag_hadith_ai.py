"""Tests for RAG-powered AI ask + Musnad Ahmad addition + hadith v2 corpus."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
AI_TIMEOUT = 120


@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ── Books endpoint: 8 books with name_ar + color ──
def test_hadith_v2_books_eight_with_ahmad(http):
    r = http.get(f"{API}/hadith/v2/books", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert "books" in data
    books = data["books"]
    slugs = {b["slug"] for b in books}
    expected = {"bukhari", "muslim", "abudawud", "tirmidhi", "nasai",
                "ibnmajah", "malik", "ahmad"}
    assert expected.issubset(slugs), f"missing: {expected - slugs}"
    for b in books:
        assert "name" in b and "compiler" in b
        assert "name_ar" in b and b["name_ar"], f"{b['slug']} missing name_ar"
        assert "color" in b and b["color"], f"{b['slug']} missing color"


def test_hadith_v2_books_loaded_true_after_warmup(http):
    r = http.get(f"{API}/hadith/v2/books", timeout=30)
    data = r.json()
    loaded_map = {b["slug"]: b.get("loaded") for b in data["books"]}
    # After backend warmup, all should be loaded=True
    assert loaded_map.get("ahmad") is True, "Musnad Ahmad not loaded after warmup"
    assert all(loaded_map.values()), f"Not all books loaded: {loaded_map}"
    assert data.get("loaded_all") is True


# ── Musnad Ahmad specific ──
def test_ahmad_detail_first(http):
    r = http.get(f"{API}/hadith/v2/ahmad/1", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert data["collection"] == "ahmad"
    assert data["number"] == 1
    # arabic or english text must exist
    assert data.get("arabic") or data.get("english")


def test_ahmad_search_count(http):
    r = http.get(f"{API}/hadith/v2/search",
                 params={"book": "ahmad", "page": 1, "per_page": 20},
                 timeout=60)
    assert r.status_code == 200
    data = r.json()
    # Expect ~1374 (allow tolerance)
    assert data["total"] >= 1000, f"expected >=1000, got {data['total']}"
    assert data["total"] <= 2000
    assert all(h["collection"] == "ahmad" for h in data["results"])


# ── RAG-powered AI ask ──
def _assert_hadith_refs_valid(http, hadith_refs):
    """Cross-check every hadith_ref back against v2 corpus - no hallucination."""
    assert isinstance(hadith_refs, list)
    for ref in hadith_refs:
        collection = ref.get("collection")
        number = ref.get("number")
        assert collection, f"missing collection: {ref}"
        assert number is not None, f"missing number: {ref}"
        # Reverse lookup: this hadith must actually exist in corpus
        r = http.get(f"{API}/hadith/v2/{collection}/{number}", timeout=30)
        assert r.status_code == 200, (
            f"hadith {collection}#{number} cited by AI but NOT in corpus "
            f"(status {r.status_code}) — fabricated reference!"
        )
        real = r.json()
        assert real["collection"] == collection
        assert str(real["number"]) == str(number)
        # Ensure the ref.text / english is non-empty (real data)
        text = ref.get("english") or ref.get("text") or ""
        assert len(text.strip()) > 0, f"empty text for {collection}#{number}"


def test_ai_ask_kindness_to_neighbors(http):
    r = http.post(f"{API}/ai/ask",
                  json={"question": "What did the Prophet say about kindness to neighbors?"},
                  timeout=AI_TIMEOUT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "answer" in data and len(data["answer"]) > 20
    assert "hadith_refs" in data
    refs = data["hadith_refs"]
    assert len(refs) >= 1, "Expected at least one hadith ref for kindness-to-neighbors"
    _assert_hadith_refs_valid(http, refs)
    # Topical check: at least one ref should mention neighbor/kind
    combined = " ".join(
        (r.get("english") or r.get("text") or "").lower() for r in refs
    )
    assert any(k in combined for k in ["neighbor", "neighbour", "kind"]), \
        f"No topical match in refs: {[r.get('english','')[:80] for r in refs]}"


def test_ai_ask_backbiting_gheebah(http):
    r = http.post(f"{API}/ai/ask",
                  json={"question": "Is backbiting (gheebah) haram?"},
                  timeout=AI_TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    refs = data.get("hadith_refs", [])
    assert len(refs) >= 1
    _assert_hadith_refs_valid(http, refs)
    combined = " ".join(
        (r.get("english") or r.get("text") or "").lower() for r in refs
    )
    assert any(k in combined for k in ["backbit", "gheebah", "ghibah", "slander", "tongue", "brother"]), \
        f"No backbiting-topical match: {[r.get('english','')[:100] for r in refs]}"


def test_ai_ask_intention(http):
    r = http.post(f"{API}/ai/ask",
                  json={"question": "How important is intention in Islam?"},
                  timeout=AI_TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    refs = data.get("hadith_refs", [])
    assert len(refs) >= 1
    _assert_hadith_refs_valid(http, refs)
    combined = " ".join(
        (r.get("english") or r.get("text") or "").lower() for r in refs
    )
    # Umar's hadith of intentions (Bukhari #1) should be cited topically
    assert "intention" in combined or "niyy" in combined or "deeds" in combined, \
        f"No intention topical match: {[r.get('english','')[:100] for r in refs]}"


def test_ai_ask_helping_poor(http):
    r = http.post(f"{API}/ai/ask",
                  json={"question": "What about helping the poor?"},
                  timeout=AI_TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    refs = data.get("hadith_refs", [])
    assert len(refs) >= 1
    _assert_hadith_refs_valid(http, refs)


# ── Existing endpoints still functional ──
def test_quran_surah_1(http):
    r = http.get(f"{API}/quran/surah/1", timeout=30)
    assert r.status_code == 200
    assert len(r.json()["ayahs"]) == 7


def test_tafsir_1_1(http):
    r = http.get(f"{API}/quran/tafsir/1/1", timeout=30)
    assert r.status_code == 200
    assert len(r.json().get("text", "")) > 50


def test_duas_categories(http):
    r = http.get(f"{API}/duas/categories", timeout=15)
    assert r.status_code == 200
    assert len(r.json()) >= 1

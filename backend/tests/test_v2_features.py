"""Tests for new v2 features: Hadith v2 (large dataset), Reciters, Tafsir."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://islamic-qa-15.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ── Hadith v2 ──
def test_hadith_v2_books(http):
    r = http.get(f"{API}/hadith/v2/books", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert "books" in data
    slugs = {b["slug"] for b in data["books"]}
    expected = {"bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"}
    assert expected.issubset(slugs)
    # Each book must have essential metadata
    for b in data["books"]:
        assert "name" in b and "compiler" in b


def test_hadith_v2_search_bukhari_intention(http):
    r = http.get(
        f"{API}/hadith/v2/search",
        params={"book": "bukhari", "q": "intention", "page": 1, "per_page": 20},
        timeout=60,
    )
    assert r.status_code == 200
    data = r.json()
    for key in ("total", "page", "per_page", "total_pages", "results"):
        assert key in data
    assert data["page"] == 1
    assert data["per_page"] == 20
    assert data["total"] >= 1
    assert len(data["results"]) >= 1
    first = data["results"][0]
    for key in ("id", "collection", "number", "english", "arabic", "collection_name", "authenticity", "grade_text"):
        assert key in first, f"missing {key}"
    assert first["collection"] == "bukhari"


def test_hadith_v2_search_muslim_only(http):
    r = http.get(
        f"{API}/hadith/v2/search",
        params={"book": "muslim", "page": 1, "per_page": 20},
        timeout=60,
    )
    assert r.status_code == 200
    data = r.json()
    # ~7500 muslim records (allow wide tolerance)
    assert data["total"] >= 3000
    assert all(h["collection"] == "muslim" for h in data["results"])


def test_hadith_v2_search_all_books(http):
    # First call triggers parallel load of all 7 books - may take 30-60s
    r = http.get(f"{API}/hadith/v2/search", params={"page": 1, "per_page": 5}, timeout=120)
    assert r.status_code == 200
    data = r.json()
    # ~36000 total across 7 books (allow tolerance)
    assert data["total"] >= 20000, f"expected >=20000 total, got {data['total']}"


def test_hadith_v2_detail(http):
    r = http.get(f"{API}/hadith/v2/bukhari/1", timeout=60)
    assert r.status_code == 200
    data = r.json()
    assert data["collection"] == "bukhari"
    assert data["number"] == 1
    assert data["english"]


def test_hadith_v2_unknown_book(http):
    r = http.get(f"{API}/hadith/v2/unknownbook/1", timeout=15)
    assert r.status_code in (400, 404)


def test_hadith_v2_search_unknown_book(http):
    r = http.get(f"{API}/hadith/v2/search", params={"book": "unknownbook"}, timeout=15)
    assert r.status_code in (400, 404)


# ── Quran Reciters ──
def test_quran_reciters_list(http):
    r = http.get(f"{API}/quran/reciters", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 8
    first = data[0]
    for key in ("id", "name", "bitrate"):
        assert key in first
    ids = {x["id"] for x in data}
    assert "ar.alafasy" in ids
    assert "ar.abdulbasitmurattal" in ids


def test_quran_surah_with_custom_reciter(http):
    r = http.get(
        f"{API}/quran/surah/1",
        params={"reciter": "ar.abdulbasitmurattal"},
        timeout=30,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["reciter"] == "ar.abdulbasitmurattal"
    assert len(data["ayahs"]) == 7
    assert "ar.abdulbasitmurattal" in data["ayahs"][0]["audio"]


def test_quran_surah_default_reciter(http):
    r = http.get(f"{API}/quran/surah/1", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert data["reciter"] == "ar.alafasy"
    assert "ar.alafasy" in data["ayahs"][0]["audio"]


# ── Tafsir Ibn Kathir ──
def test_tafsir_fatiha_1(http):
    r = http.get(f"{API}/quran/tafsir/1/1", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert data["surah"] == 1
    assert data["ayah"] == 1
    assert isinstance(data.get("text"), str)
    assert len(data["text"]) > 50, "tafsir text too short/empty"


def test_tafsir_ayat_al_kursi(http):
    r = http.get(f"{API}/quran/tafsir/2/255", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert data["surah"] == 2
    assert data["ayah"] == 255
    assert isinstance(data.get("text"), str)
    assert len(data["text"]) > 50


# ── Existing endpoints still working ──
def test_existing_quran_surahs(http):
    r = http.get(f"{API}/quran/surahs", timeout=30)
    assert r.status_code == 200
    assert len(r.json()) == 114


def test_existing_duas_categories(http):
    r = http.get(f"{API}/duas/categories", timeout=15)
    assert r.status_code == 200
    assert len(r.json()) >= 1

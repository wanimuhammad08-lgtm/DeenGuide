"""DeenGuide backend API tests."""
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


# ── Health ──
def test_root_health(http):
    r = http.get(f"{API}/")
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ok"
    assert "DeenGuide" in data.get("name", "")


# ── Quran ──
def test_quran_surahs_list(http):
    r = http.get(f"{API}/quran/surahs", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 114
    first = data[0]
    assert first["number"] == 1
    assert "englishName" in first


def test_quran_surah_fatiha(http):
    r = http.get(f"{API}/quran/surah/1", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert data["number"] == 1
    assert data["numberOfAyahs"] == 7
    assert len(data["ayahs"]) == 7
    a = data["ayahs"][0]
    assert "arabic" in a and "translation" in a and "audio" in a
    assert a["audio"].endswith(".mp3")


def test_quran_search_mercy(http):
    r = http.get(f"{API}/quran/search", params={"q": "mercy"}, timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert "matches" in data
    assert data["count"] >= 1


# ── Hadith ──
def test_hadith_collections(http):
    r = http.get(f"{API}/hadith/collections")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 8
    slugs = {c["slug"] for c in data}
    assert {"bukhari", "muslim", "abudawood", "tirmidhi", "nasai", "ibnmajah", "muwatta", "ahmad"}.issubset(slugs)


def test_hadith_search_all(http):
    r = http.get(f"{API}/hadith/search")
    assert r.status_code == 200
    data = r.json()
    assert "results" in data and data["count"] >= 1


def test_hadith_search_by_query(http):
    r = http.get(f"{API}/hadith/search", params={"q": "intention"})
    assert r.status_code == 200
    data = r.json()
    # Famous bukhari #1 niyyah hadith should surface
    assert data["count"] >= 1


def test_hadith_search_filter_collection(http):
    r = http.get(f"{API}/hadith/search", params={"collection": "bukhari"})
    assert r.status_code == 200
    data = r.json()
    assert all(h["collection"] == "bukhari" for h in data["results"])


def test_hadith_search_filter_authenticity(http):
    r = http.get(f"{API}/hadith/search", params={"authenticity": "Sahih"})
    assert r.status_code == 200
    data = r.json()
    assert all(h["authenticity"].lower() == "sahih" for h in data["results"])


def test_hadith_search_combined_filters(http):
    r = http.get(f"{API}/hadith/search", params={"q": "mercy", "collection": "bukhari", "authenticity": "Sahih"})
    assert r.status_code == 200
    data = r.json()
    for h in data["results"]:
        assert h["collection"] == "bukhari"
        assert h["authenticity"].lower() == "sahih"


# ── Duas ──
def test_duas_categories(http):
    r = http.get(f"{API}/duas/categories")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 10


def test_duas_filtered_daily(http):
    r = http.get(f"{API}/duas", params={"category": "daily"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert all(d["category"] == "daily" for d in data)


def test_dua_detail_ok(http):
    # fetch list first
    r = http.get(f"{API}/duas")
    assert r.status_code == 200
    duas = r.json()
    first_id = duas[0]["id"]
    r2 = http.get(f"{API}/duas/{first_id}")
    assert r2.status_code == 200
    assert r2.json()["id"] == first_id


def test_dua_detail_404(http):
    r = http.get(f"{API}/duas/does-not-exist-xyz")
    assert r.status_code == 404


# ── AI (slow) ──
@pytest.mark.parametrize("mode", ["simple", "deep"])
def test_ai_ask_modes(http, mode):
    payload = {"question": "What is the importance of prayer (salah) in Islam?", "mode": mode}
    r = http.post(f"{API}/ai/ask", json=payload, timeout=120)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["answer"]
    assert data["explanation"]
    assert "quran_refs" in data
    assert "hadith_refs" in data
    assert "created_at" in data
    assert data["id"]

import requests
from config import UMMAH_API_KEY, UMMAH_BASE_URL

class UmmahClient:
    def search_hadith(self, query: str):
        url = f"{UMMAH_BASE_URL}/api/hadith/search"
        headers = {
            "X-API-Key": UMMAH_API_KEY
        }
        params = {"q": query}
        
        try:
            res = requests.get(url, headers=headers, params=params, timeout=10)
            res.raise_for_status()
            return res.json()
        except Exception as e:
            # Return empty structure if API fails
            return {"results": []}

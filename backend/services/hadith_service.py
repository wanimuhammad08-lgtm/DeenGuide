from services.ummah_client import UmmahClient
from services.grading_parser import GradingParser
from cache.redis_client import Cache
from models.hadith import Hadith
import json

class HadithService:
    def __init__(self):
        self.client = UmmahClient()
        self.parser = GradingParser()
        self.cache = Cache()

    def search(self, query: str, page: int = 1, per_page: int = 20):
        cache_key = f"hadith:{query}"
        cached = self.cache.get(cache_key)
        
        all_results = []
        if cached:
            try:
                all_results = json.loads(cached)
            except Exception:
                pass
        
        if not all_results:
            data = self.client.search_hadith(query)
            items = data.get("results") or data.get("data") or []
            
            for item in items:
                grade = self.parser.parse(item)
                hadith = Hadith(
                    id=str(item.get("id") or item.get("number") or ""),
                    collection=item.get("collection") or "Unknown",
                    collection_name=item.get("collection_name") or item.get("collection", "Unknown"),
                    number=str(item.get("number") or item.get("id") or ""),
                    narrator=item.get("narrator"),
                    arabic=item.get("arabic"),
                    english=item.get("english") or item.get("text") or "",
                    translation_text=item.get("translation_text") or item.get("urdu"),
                    translation_lang=item.get("translation_lang") or ("ur" if item.get("urdu") else "en"),
                    authenticity=grade,
                    grade_text=item.get("grade") or item.get("status") or grade
                )
                all_results.append(hadith.to_dict())
            
            if all_results:
                self.cache.set(cache_key, all_results)

        total = len(all_results)
        start = (page - 1) * per_page
        end = start + per_page
        page_items = all_results[start:end]
        
        return {
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page if per_page > 0 else 0,
            "results": page_items
        }

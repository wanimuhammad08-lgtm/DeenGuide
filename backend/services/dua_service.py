import json
import os
import re
from pathlib import Path
from typing import List, Dict, Optional
from config.dua_categories import CATEGORY_MAPPING
from config.dua_references import DUA_REFERENCES

class DuaService:
    _instance = None
    DATA_DIR = Path(__file__).parent.parent / "data"
    RAW_PATH = DATA_DIR / "duas_raw.json"
    NORMALIZED_PATH = DATA_DIR / "duas_normalized.json"

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DuaService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.categories = {}
        self.topics = {}
        self.duas = {}
        self.search_index = []
        self.load_data()
        self._initialized = True

    def slugify(self, text: str) -> str:
        text = text.lower().strip()
        text = re.sub(r'[^\w\s-]', '', text)
        text = re.sub(r'[\s_-]+', '_', text)
        text = re.sub(r'^-+|-+$', '', text)
        return text

    def load_data(self):
        if not self.RAW_PATH.exists():
            print(f"Warning: {self.RAW_PATH} not found.")
            return

        # Load raw data
        with open(self.RAW_PATH, "r", encoding="utf-8-sig") as f:
            raw_data = json.load(f)

        raw_list = raw_data.get("English", [])
        
        # Build mapping from topic title to raw topic object
        raw_topics_map = {t["TITLE"]: t for t in raw_list}

        normalized_categories = []
        
        all_topics_in_mapping = set()
        for cat_slug, cat_info in CATEGORY_MAPPING.items():
            cat_topics = []
            for topic_title in cat_info["topics"]:
                raw_topic = raw_topics_map.get(topic_title)
                if not raw_topic:
                    continue
                
                all_topics_in_mapping.add(topic_title)
                topic_id = self.slugify(topic_title)
                
                # Normalize duas
                normalized_duas = []
                for i, d in enumerate(raw_topic.get("TEXT", [])):
                    dua_id = d.get("ID") or f"{topic_id}_{i}"
                    ref_data = DUA_REFERENCES.get(dua_id, {})
                    
                    # Only include if has reference AND grade
                    ref = ref_data.get("reference", "").strip()
                    grade = ref_data.get("grade", "").strip()
                    
                    if not ref or not grade:
                        continue

                    dua = {
                        "id": dua_id,
                        "topic_id": topic_id,
                        "category_id": cat_slug,
                        "arabic": d.get("ARABIC_TEXT", ""),
                        "transliteration": d.get("LANGUAGE_ARABIC_TRANSLATED_TEXT", ""),
                        "translation": d.get("TRANSLATED_TEXT", ""),
                        "repeat": d.get("REPEAT", 1),
                        "audio": d.get("AUDIO", "").replace("http://", "https://"),
                        "reference": ref,
                        "grade": grade,
                        "benefits": [],
                        "explanation": "",
                        "keywords": []
                    }
                    normalized_duas.append(dua)
                    self.duas[str(dua_id)] = dua
                
                if normalized_duas:
                    topic_obj = {
                        "id": topic_id,
                        "title": topic_title,
                        "category_id": cat_slug,
                        "duas": normalized_duas,
                        "dua_count": len(normalized_duas)
                    }
                    cat_topics.append(topic_obj)
                    self.topics[topic_id] = topic_obj

            if cat_topics:
                cat_obj = {
                    "id": cat_slug,
                    "title": cat_info["title"],
                    "section": cat_info.get("section", "Others"),
                    "icon": cat_info.get("icon", "Book"),
                    "description": cat_info.get("description", ""),
                    "topic_count": len(cat_topics),
                    "topics": cat_topics
                }
                normalized_categories.append(cat_obj)
                self.categories[cat_slug] = cat_obj

        # Save normalized data for future use/debugging
        with open(self.NORMALIZED_PATH, "w", encoding="utf-8") as f:
            json.dump(normalized_categories, f, ensure_ascii=False, indent=2)

        self.build_search_index()

    def build_search_index(self):
        self.search_index = []
        for cat in self.categories.values():
            for topic in cat["topics"]:
                # Index topic title
                self.search_index.append({
                    "type": "topic",
                    "id": topic["id"],
                    "category_id": cat["id"],
                    "title": topic["title"],
                    "text": topic["title"].lower()
                })
                for dua in topic["duas"]:
                    # Index dua text
                    search_text = f"{dua['translation']} {dua['transliteration']} {dua['arabic']}".lower()
                    self.search_index.append({
                        "type": "dua",
                        "id": dua["id"],
                        "topic_id": topic["id"],
                        "category_id": cat["id"],
                        "title": topic["title"],
                        "text": search_text
                    })

    def get_categories(self):
        return [
            {
                "id": c["id"],
                "title": c["title"],
                "section": c.get("section", "Others"),
                "icon": c["icon"],
                "description": c["description"],
                "topic_count": c["topic_count"]
            }
            for c in self.categories.values()
        ]

    def get_category(self, category_id: str):
        cat = self.categories.get(category_id)
        if not cat:
            return None
        return {
            "id": cat["id"],
            "title": cat["title"],
            "icon": cat["icon"],
            "description": cat["description"],
            "topics": [
                {
                    "id": t["id"],
                    "title": t["title"],
                    "dua_count": t["dua_count"]
                }
                for t in cat["topics"]
            ]
        }

    def get_topic(self, topic_id: str):
        return self.topics.get(topic_id)

    def get_dua(self, dua_id: str):
        return self.duas.get(str(dua_id))

    def search(self, query: str, limit: int = 20):
        if not query:
            return []
        
        query = query.lower().strip()
        results = []
        seen_topics = set()
        
        for item in self.search_index:
            if query in item["text"]:
                if item["type"] == "topic":
                    if item["id"] not in seen_topics:
                        results.append(item)
                        seen_topics.add(item["id"])
                else:
                    results.append(item)
            
            if len(results) >= limit:
                break
                
        return results

dua_service = DuaService()

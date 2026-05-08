from typing import Optional

class Hadith:
    def __init__(self, id: str, collection: str, collection_name: str, number: str, 
                 narrator: Optional[str], arabic: Optional[str], english: str, 
                 translation_text: Optional[str] = None, 
                 translation_lang: Optional[str] = None, 
                 authenticity: Optional[str] = None, 
                 grade_text: Optional[str] = None):
        self.id = id
        self.collection = collection
        self.collection_name = collection_name
        self.number = number
        self.narrator = narrator
        self.arabic = arabic
        self.english = english
        self.translation_text = translation_text
        self.translation_lang = translation_lang
        self.authenticity = authenticity # Sahih / Hasan / Daif
        self.grade_text = grade_text

    def to_dict(self):
        return self.__dict__

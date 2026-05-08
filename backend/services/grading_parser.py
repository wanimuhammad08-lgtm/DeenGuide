class GradingParser:
    def parse(self, item: dict) -> str:
        # Many APIs return grading in different formats, so normalize it.
        grade = item.get("grade") or item.get("status") or item.get("grading") or ""
        
        if isinstance(grade, dict):
            grade = grade.get("grade") or grade.get("status") or ""
            
        grade = str(grade).lower()
        
        if "sahih" in grade:
            return "Sahih"
        elif "hasan" in grade:
            return "Hasan"
        elif "daif" in grade or "weak" in grade:
            return "Daif"
        elif "maudu" in grade or "fabricated" in grade:
            return "Fabricated"
        else:
            return "Unknown"

import json
import os

path = r'c:\Users\wanim\Desktop\deen\backend\data\duas_normalized.json'

with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

missing = []

for cat in data:
    for topic in cat.get('topics', []):
        for dua in topic.get('duas', []):
            has_ref = bool(dua.get('reference', '').strip())
            has_grade = bool(dua.get('grade', '').strip())
            
            if not has_ref or not has_grade:
                missing.append({
                    "topic": topic['title'],
                    "id": dua['id'],
                    "arabic_start": dua.get('arabic', '')[:50]
                })

print(json.dumps(missing, indent=2))

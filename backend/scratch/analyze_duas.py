import json
import os

path = r'c:\Users\wanim\Desktop\deen\backend\data\duas_normalized.json'

with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

total_duas = 0
missing_ref = 0
missing_grade = 0
missing_both = 0

for cat in data:
    for topic in cat.get('topics', []):
        for dua in topic.get('duas', []):
            total_duas += 1
            has_ref = bool(dua.get('reference', '').strip())
            has_grade = bool(dua.get('grade', '').strip())
            
            if not has_ref: missing_ref += 1
            if not has_grade: missing_grade += 1
            if not has_ref and not has_grade: missing_both += 1

print(f"Total Duas: {total_duas}")
print(f"Missing Reference: {missing_ref}")
print(f"Missing Grade: {missing_grade}")
print(f"Missing Both: {missing_both}")

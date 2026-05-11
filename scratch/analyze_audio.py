import json
with open('backend/data/duas_raw.json', 'r', encoding='utf-8-sig') as f:
    data = json.load(f)
all_text = []
for cat in data.get('English', []):
    for txt in cat.get('TEXT', []):
        all_text.append(txt)

no_audio = [x for x in all_text if not x.get('AUDIO')]
print(f"Total Raw Duas: {len(all_text)}")
print(f"Raw Duas with missing AUDIO field: {len(no_audio)}")
if no_audio:
    print("First 3 IDs with missing audio:", [x.get('ID') for x in no_audio[:3]])

import json
path = r'c:\Users\wanim\Desktop\deen\backend\data\duas_normalized.json'
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

for cat in data:
    for topic in cat['topics']:
        for dua in topic['duas']:
            if str(dua['id']) == "166":
                print(json.dumps(dua, indent=2))
                exit()

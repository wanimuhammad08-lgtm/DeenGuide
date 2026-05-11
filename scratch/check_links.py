import json
import requests
import concurrent.futures

with open('backend/data/duas_normalized.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

urls = []
for cat in data:
    for top in cat['topics']:
        for d in top['duas']:
            if d.get('audio'):
                # Replace http with https for checking
                urls.append(d['audio'].replace('http://', 'https://'))

def check_url(url):
    try:
        r = requests.head(url, timeout=5)
        return (url, r.status_code)
    except Exception as e:
        return (url, "ERROR")

broken = []
print(f"Checking {len(urls)} unique URLs...")
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    results = list(executor.map(check_url, urls))

for url, status in results:
    if status != 200:
        broken.append(url)

print(f"Checked all URLs.")
print(f"Broken URLs found: {len(broken)}")
if broken:
    print("Sample broken:")
    for u in broken[:5]: print(u)

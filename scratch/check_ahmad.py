import requests

url = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-ahmad.min.json"
try:
    r = requests.head(url, timeout=10)
    print(f"{url}: {r.status_code}")
except Exception as e:
    print(f"{url}: Error {e}")

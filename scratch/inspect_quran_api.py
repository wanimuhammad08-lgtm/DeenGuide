import requests
import json

url = "https://api.quran.com/api/v4/verses/by_chapter/1"
params = {
    "language": "en",
    "words": "true",
    "audio": "7",
    "fields": "text_uthmani",
    "word_fields": "text_uthmani,audio_url",
    "per_page": "1"
}

r = requests.get(url, params=params)
data = r.json()

print(json.dumps(data['verses'][0]['audio'], indent=2))

import requests

def search_hadith(query):
    # This matches the backend's v2 search
    url = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/info.json"
    # We can't search across all easily, but we can search common collections
    books = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah"]
    
    results = []
    for book in books:
        try:
            # We fetch the english data for the book
            # Warning: this might be large, but for a script it's okay
            r = requests.get(f"https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-{book}.json")
            data = r.json()
            for h in data["hadiths"]:
                if query.lower() in h["text"].lower():
                    results.append({"book": book, "number": h["hadithnumber"], "text": h["text"][:100]})
                    if len(results) > 2: break
            if len(results) > 2: break
        except:
            continue
    return results

queries = [
    "Sayyid al-Istighfar", # Bukhari 6306
    "Anxiety and sorrow", # Bukhari 6369
    "forgiveness and well-being", # Abu Dawud 5074
    "guide me and make me steadfast", # Tirmidhi 3522
    "perfect Allah is, all praise is for Allah", # Muslim 597
]

for q in queries:
    print(f"Searching for: {q}")
    res = search_hadith(q)
    for r in res:
        print(f"  Found: {r['book']} #{r['number']}")

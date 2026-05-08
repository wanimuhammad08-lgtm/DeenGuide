import requests

urls = [
    "https://cdn.jsdelivr.net/gh/AhmedBaset/hadith-json@main/db/by_book/other_books/musnad_ahmad.json",
    "https://cdn.jsdelivr.net/gh/AhmedBaset/hadith-json@main/db/by_book/other_books/sunan_darimi.json",
    "https://cdn.jsdelivr.net/gh/AhmedBaset/hadith-json@main/db/by_book/the_9_books/musnad_ahmed.json"
]

for url in urls:
    try:
        r = requests.head(url, timeout=10)
        print(f"{url}: {r.status_code}")
    except Exception as e:
        print(f"{url}: Error {e}")

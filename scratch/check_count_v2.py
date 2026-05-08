import requests

try:
    response = requests.get("http://localhost:8001/api/hadith/v2/books")
    if response.status_code == 200:
        data = response.json()
        total = sum(book.get('count', 0) for book in data.get('books', []))
        print(f"Total Hadith Count: {total}")
        for book in data.get('books', []):
            print(f"- {book['name']}: {book.get('count', 0)}")
    else:
        print(f"Error: {response.status_code} {response.text}")
except Exception as e:
    print(f"Error: {e}")

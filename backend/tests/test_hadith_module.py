import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from services.hadith_service import HadithService
import asyncio

async def test_search():
    service = HadithService()
    print("Searching for 'prayer'...")
    results = service.search("prayer")
    print(f"Found {results['total']} results")
    if results['results']:
        h = results['results'][0]
        print(f"First result: {h['collection_name']} #{h['number']}")
        print(f"Grade: {h['authenticity']}")
    else:
        print("No results found (maybe API key is missing?)")

if __name__ == "__main__":
    asyncio.run(test_search())

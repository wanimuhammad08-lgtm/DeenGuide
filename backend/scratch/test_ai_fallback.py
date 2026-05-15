import sys
import requests
import json

def test_gemini_fallback():
    url = "http://127.0.0.1:8001/api/ai/ask"
    payload = {
        "question": "is prophet muhammads father in hell",
        "mode": "general",
        "conversation_history": []
    }
    
    print(f"Testing {url}...")
    try:
        response = requests.post(url, json=payload, timeout=60)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("Response summary:")
            print(data.get("summary", "No summary")[:200] + "...")
            print("Hadith refs counts:", len(data.get("hadith_refs", [])))
        else:
            print(response.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_gemini_fallback()

import os
from groq import Groq
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")

api_key = os.environ.get("GROQ_API_KEY")
print(f"Using key: {api_key[:10]}...")

client = Groq(api_key=api_key)

try:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": "Say hello!"}],
        max_tokens=10
    )
    print("Response:", response.choices[0].message.content)
except Exception as e:
    print("Error:", e)

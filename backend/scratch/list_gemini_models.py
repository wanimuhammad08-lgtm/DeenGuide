import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

def list_models():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("No GEMINI_API_KEY found")
        return
        
    client = genai.Client(api_key=api_key)
    print("Available models:")
    try:
        # Just print the whole model object or name
        for model in client.models.list():
            print(f"- {model.name}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_models()

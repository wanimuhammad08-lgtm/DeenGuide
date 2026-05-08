import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

UMMAH_API_KEY = os.environ.get("UMMAH_API_KEY", "YOUR_KEY")
UMMAH_BASE_URL = os.environ.get("UMMAH_BASE_URL", "https://api.ummahapi.com")

REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))

import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / "backend" / ".env")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("MISSING ENV KEYS")
    exit(1)

supabase = create_client(url, key)

try:
    res = supabase.table("qa_history").select("*").limit(1).execute()
    print("QA_HISTORY_EXISTS")
except Exception as e:
    err = str(e)
    if 'relation "public.qa_history" does not exist' in err.lower() or '404' in err:
        print("QA_HISTORY_MISSING")
    else:
        print(f"OTHER_ERROR: {err}")

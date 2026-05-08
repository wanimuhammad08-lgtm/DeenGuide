import sys
import os

# Add backend to sys.path
sys.path.append(r'c:\Users\wanim\Desktop\deen\backend')

from services.dua_service import DuaService

# Re-init will trigger load_data and save to duas_normalized.json
# But since it's a singleton we need to force it or just create a new instance if we can
ds = DuaService()
# Force reload
ds._initialized = False
ds.__init__()

print("Successfully regenerated duas_normalized.json with new references and strict filtering.")

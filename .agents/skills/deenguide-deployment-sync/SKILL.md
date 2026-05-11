---
name: deenguide-deployment-sync
description: Validates and synchronizes deployment configs, CORS rules, and network bindings between the DeenGuide Vercel frontend and Render backend.
risk: safe
---

# DeenGuide Deployment Sync

## When to use
Trigger this skill whenever you are:
1. Modifying environment variables (`.env`, `API_URL`, etc.).
2. Editing backend entry points (`backend/server.py`, `backend/main.py`).
3. Configuring frontend API utility files (e.g., `frontend/src/lib/api.js`).
4. Debugging "Network Error", "CORS", or "Connection Refused" issues between frontend and backend.

## 1. Backend Network Bindings (FastAPI / Uvicorn)
When running the Python backend, NEVER bind to `127.0.0.1` or `localhost` if the app is destined for a container (Docker) or a cloud provider (Render).
- **Rule:** Always bind the host to `0.0.0.0`. 
- **Reason:** Binding to `localhost` often causes IPv6/IPv4 loopback mismatches or prevents external traffic from reaching the container on cloud providers like Render.

*Example (Correct):* `uvicorn.run(app, host="0.0.0.0", port=8000)`
*Example (Incorrect):* `uvicorn.run(app, host="127.0.0.1", port=8000)`

## 2. CORS Configurations (Backend)
When updating CORS in the backend, ensure both local development and production URLs are supported.
- **Rule:** The `CORSMiddleware` in FastAPI must explicitly allow the Vercel production domain AND `http://localhost:3000` (for local React dev).
- **Rule:** Set `allow_credentials=True`, `allow_methods=["*"]`, `allow_headers=["*"]`.

## 3. Frontend API Endpoints
When configuring the frontend to talk to the backend:
- **Rule:** Do not hardcode `http://localhost:8000` in production logic. 
- **Rule:** Use environment variables (e.g., `process.env.REACT_APP_API_URL` or `import.meta.env.VITE_API_URL`) with fallback logic.
- **Rule:** Ensure the production Render URL uses `https://` to prevent Mixed Content security errors on Vercel.

## 4. Health Check
Before finalizing any deployment-related PR or commit:
1. Verify `backend/requirements.txt` is updated.
2. Verify a root health check endpoint (e.g., `GET /` returning `{"status": "ok"}`) exists in the backend so cloud providers can verify successful deployment.

# 🕌 DeenGuide — Islamic AI Assistant

A comprehensive Islamic web application with AI-powered guidance, Quran reader, Hadith collections, Prayer Times, Duas, and more. Built for Muslims seeking authentic knowledge from the Quran and Sunnah.

**Live:** [deenguide-seven.vercel.app](https://deenguide-seven.vercel.app)

---

## Features

### 🤖 Ask AI
- AI-powered Islamic Q&A grounded in Quran and authentic Hadith
- Structured responses with evidence (Quran verses + Hadith references)
- Scholarly insights from the four Madhahib
- Click-through to full Quran ayah or Hadith detail
- Conversation history within session

### 📖 Quran Reader
- Full 114 Surahs with Uthmani Arabic text
- 47 translation editions (English, Urdu, French, Turkish, Arabic, and more)
- 24 Tafsir editions (Ibn Kathir, Tabari, Qurtubi, Maududi, etc.)
- 8 audio reciters (Alafasy, Abdul Basit, Sudais, Husary, etc.)
- Word-by-word mode with transliteration
- Tajweed color-coded text
- IndoPak script option
- Bookmarks and favorites
- Continue Reading from where you left off
- Surah search, Juz view, Revelation order

### 📚 Hadith Library
- 36,390+ authentic hadiths across 7 major collections:
  - Sahih al-Bukhari (7,589)
  - Sahih Muslim (7,563)
  - Jami` at-Tirmidhi (3,998)
  - Sunan Abu Dawud (5,274)
  - Sunan an-Nasa'i (5,765)
  - Sunan Ibn Majah (4,343)
  - Muwatta Imam Malik (1,858)
- Chapter-based browsing
- Full-text search across all collections
- Arabic + English text with narrator info
- Authenticity grading
- Bookmark and save hadiths

### 🤲 Duas & Adhkar
- 231 verified duas across 14 categories
- Arabic text with transliteration and translation
- Audio recitation for every dua
- Authentic references (Bukhari, Muslim, etc.)
- Categories: Morning/Evening, Prayer, Travel, Food, Hardship, and more

### 🕐 Prayer Times
- Accurate prayer times based on GPS location
- Multiple calculation methods (Karachi, ISNA, MWL, Egyptian, etc.)
- Juristic method selection (Shafi'i/Hanafi)
- Dynamic countdown to next prayer
- Suhur, Iftar, and Tahajjud times
- Forbidden Salat times with explanations
- Monthly timetable view
- 7-day swipe navigation

### 🧭 Qibla Finder
- Live compass direction to Ka'bah
- GPS-based bearing calculation
- Calibration guidance

### 📅 Islamic Calendar
- Hijri date display (location-aware via Aladhan API)
- Monthly calendar with Hijri dates
- Upcoming Islamic events and holidays
- Gregorian ↔ Hijri date converter

### 📿 Tasbih Counter
- Digital tasbih with nature-themed backgrounds
- Multiple dhikr presets (SubhanAllah, Alhamdulillah, etc.)
- Count persistence via localStorage
- Vibration feedback

### ✨ 99 Names of Allah
- Complete Asma ul-Husna
- Arabic, transliteration, and meaning
- Beautiful card-based display

### 💰 Zakat Calculator
- Gold and silver Nisab calculation
- Live metal prices via API
- Comprehensive wealth categories

### 📘 Guides
- Hajj step-by-step guide
- Umrah step-by-step guide
- Menstrual rulings guide (Islamic fiqh)

### 👤 User Profile
- Supabase authentication (email/password)
- Bookmark sync across devices
- Admin dashboard for analytics

---

## Tech Stack

### Frontend
- **React 19** with React Router v7
- **Tailwind CSS** with custom design system
- **Radix UI** primitives for accessible components
- **Lucide React** icons
- **React Markdown** for AI response rendering
- **Recharts** for analytics
- **CRACO** build configuration
- **PWA** with manifest.json and cross-platform icons

### Backend
- **FastAPI** (Python)
- **Groq API** (Llama 3.3 70B) — primary AI provider
- **Google Gemini** (2.0 Flash + 1.5 Flash) — fallback AI
- **Supabase** — authentication and user data
- **SlowAPI** — rate limiting (100 req/min)
- **Motor** — async MongoDB driver (optional persistence)

### External APIs
- [AlQuran.cloud](https://alquran.cloud) — Quran text and translations
- [Quran.com API v4](https://api.quran.com) — Word-by-word, Tajweed, audio
- [Aladhan](https://aladhan.com) — Prayer times and Hijri calendar
- [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api) — Hadith corpus
- [HisnMuslim](https://hisnmuslim.com) — Dua audio
- [Islamic Network CDN](https://cdn.islamic.network) — Quran audio recitations
- [EveryAyah](https://everyayah.com) — Translation audio

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- npm or yarn

### Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

Create `backend/.env`:
```env
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
QURAN_FOUNDATION_CLIENT_ID=your_quran_client_id
QURAN_FOUNDATION_CLIENT_SECRET=your_quran_client_secret
METALS_DEV_API_KEY=your_metals_api_key
```

Run the backend:
```bash
python server.py
```
Server starts at `http://localhost:8001`

### Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
REACT_APP_BACKEND_URL=http://127.0.0.1:8001
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Run the frontend:
```bash
npm start
```
App opens at `http://localhost:3000`

---

## Deployment

### Render (Backend)
The backend is configured for Render deployment via `render.yaml`:
- Auto-deploys from `main` branch
- Starts with `uvicorn server:app --host 0.0.0.0 --port $PORT`
- Set environment variables in Render dashboard

### Vercel (Frontend)
The frontend deploys to Vercel:
- Build command: `npm run build`
- Output directory: `build`
- Set `REACT_APP_BACKEND_URL` to your Render backend URL

---

## Project Structure

```
deen/
├── backend/
│   ├── server.py           # Main FastAPI application
│   ├── requirements.txt    # Python dependencies
│   ├── cache/              # Redis caching layer
│   ├── config/             # Dua categories & references
│   ├── core/               # Core models & database config
│   ├── data/               # Static JSON (hadiths, duas)
│   ├── models/             # Pydantic data models
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic (hadith, dua, AI)
│   └── tests/              # Backend test suite
│
├── frontend/
│   ├── public/             # Static assets & PWA manifest
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── context/        # React contexts (AI, Auth)
│       ├── hooks/          # Custom React hooks
│       ├── lib/            # Utilities, API clients, helpers
│       └── pages/          # 24 page components
│
├── .gitignore
├── render.yaml             # Render deployment config
└── README.md
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/` | GET | Health check |
| `/api/ai/ask` | POST | AI Islamic Q&A |
| `/api/quran/surahs` | GET | List all 114 surahs |
| `/api/quran/surah/{n}` | GET | Surah with translation + audio |
| `/api/quran/editions` | GET | Available translations |
| `/api/quran/tafsirs` | GET | Available tafsir editions |
| `/api/quran/tafsir/{s}/{a}` | GET | Tafsir for specific ayah |
| `/api/quran/search` | GET | Search Quran translations |
| `/api/quran/reciters` | GET | Available audio reciters |
| `/api/quran/token` | GET | Quran.com OAuth token |
| `/api/hadith/v2/books` | GET | List hadith collections |
| `/api/hadith/v2/{book}/{n}` | GET | Specific hadith detail |
| `/api/hadith/v2/{book}/chapters` | GET | Chapter index |
| `/api/hadith/v2/{book}/chapter/{n}` | GET | Hadiths in chapter |
| `/api/hadith/v2/search` | GET | Search across all hadiths |
| `/api/duas/categories` | GET | Dua categories |
| `/api/duas/category/{id}` | GET | Topics in category |
| `/api/duas/topic/{id}` | GET | Duas in topic |
| `/api/duas/search` | GET | Search duas |

---

## Security

- Rate limiting: 100 requests/minute per IP
- Input validation on all endpoints (empty, too short, too long)
- CORS configured for production domains
- No API keys exposed in responses
- Supabase Row Level Security for user data
- SQL injection safe (no raw SQL queries)
- XSS safe (no script injection in responses)

---

## Contributing

This is a personal project. If you'd like to contribute or report issues, please open an issue on GitHub.

---

## License

All rights reserved. This project is not open-source.

---

## Credits

- Quran data: [AlQuran.cloud](https://alquran.cloud) & [Quran.com](https://quran.com)
- Hadith data: [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api)
- Dua content: [Hisnul Muslim](https://hisnmuslim.com)
- Prayer calculations: Based on established astronomical algorithms
- AI: Powered by Groq (Llama 3.3) and Google Gemini

---

*Built with ❤️ for the Ummah*

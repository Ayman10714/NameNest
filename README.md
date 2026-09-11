# NameNest

A brand/name availability scanner. Type a name and NameNest checks it across domains, GitHub, Instagram, X, TikTok, Google Play, and USPTO trademarks — all in one shot — and suggests alternative names if your first pick is taken.

## Features

- Domain check across 7 TLDs (`.com`, `.io`, `.co`, `.net`, `.org`, `.app`, `.dev`)
- GitHub username availability
- Social handle checks — Instagram, X (Twitter), TikTok
- Google Play app name search
- USPTO trademark check
- Name suggestions with scoring based on `.com` + GitHub availability
- Recent checks history, persisted to MongoDB

## Tech Stack

**Backend:** Python + FastAPI, MongoDB, Pydantic

**Frontend:** React (CRACO), Tailwind CSS, shadcn/ui, Axios

## Project Structure

```
app/
├── backend/
│   ├── server.py        # FastAPI app, routes, response models
│   ├── checkers.py       # Domain / GitHub / social / Play Store / trademark checkers
│   ├── suggestions.py    # Name variant generation
│   ├── cache.py          # Caching layer
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/ui/
│   │   └── NameNest.jsx
│   ├── public/index.html
│   ├── craco.config.js
│   ├── package.json
│   └── .env
```

## Prerequisites

- Python 3.13+
- Node.js 20+ and npm 10+
- A MongoDB connection (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) free tier)

## Setup

### Backend

```bash
cd app/backend
python -m venv .venv
.venv\Scripts\Activate.ps1     # Windows
# source .venv/bin/activate    # macOS/Linux

pip install -r requirements.txt
pip install "pymongo[srv]"
```

Create `app/backend/.env`:

```dotenv
MONGO_URL="mongodb+srv://<username>:<password>@<your-cluster>.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
DB_NAME="test_database"
CORS_ORIGINS=http://localhost:3000
```

Run:

```bash
uvicorn server:app --reload
```

### Frontend

```bash
cd app/frontend
npm install --legacy-peer-deps
```

Create `app/frontend/.env`:

```dotenv
REACT_APP_BACKEND_URL=http://localhost:8000
```

Run:

```bash
npm start
```

## Usage

1. Start the backend (`uvicorn server:app --reload`)
2. Start the frontend (`npm start`)
3. Open `https://namenest-ilib.onrender.com/`, type a name, click **Check**

## Future Ideas

- Real WHOIS/RDAP-based domain availability
- Proper USPTO TSDR/TESS trademark integration
- Parallelize checkers for faster response times
- Deploy to a live environment

# Portfolio Manager

A professional, full-stack portfolio management web application for tracking stocks, crypto, and mutual funds — built with React 19, TypeScript, Vite, Tailwind CSS 4, and Firebase.

---

## Features

- 📊 **Portfolio Dashboard** — Real-time holdings, P&L, net worth, and allocation charts
- 🤖 **Multi-AI Advisor** — Gemini, Groq, NVIDIA NIM, Bytez with debate mode and auto-fallback
- 📈 **Swing Research Engine** — Institutional-style 4–12 week trade research for NSE/BSE stocks
- 🏦 **Angel One SmartAPI** — Import real holdings from your Angel One demat account (read-only)
- 💱 **Crypto Tracking** — Live prices via CoinGecko for 100+ coins in INR/USD
- 🔐 **Firebase Authentication** — Secure login, signup, forgot password, persistent sessions
- 🌐 **PWA Support** — Installable as a Progressive Web App
- 🚀 **Vercel-Ready** — Serverless API routes for all backend proxies

---

## Quick Start (Local Development)

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd portfolio-manager

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local and fill in your API keys

# 4. Start the dev server
npm run dev
# Open http://localhost:5173
```

---

## Deploy to Vercel

### Option 1: Vercel CLI

```bash
npm i -g vercel
vercel --prod
```

### Option 2: GitHub Integration

1. Push your code to GitHub.
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo.
3. Vercel auto-detects Vite — no extra configuration needed.
4. Add Environment Variables (see table below).
5. Click **Deploy**.

### Environment Variables on Vercel

In your Vercel project → **Settings → Environment Variables**:

| Variable | Description | Required |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key (server-side fallback) | Optional |
| `FINNHUB_API_KEY` | Finnhub API key (server-side fallback) | Optional |
| `ANGEL_ONE_API_KEY` | Angel One SmartAPI key (server-side fallback) | Optional |
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key | Required for Auth |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | Required for Auth |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | Required for Auth |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | Required for Auth |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Sender ID | Required for Auth |
| `VITE_FIREBASE_APP_ID` | Firebase App ID | Required for Auth |

> **Note:** Most API keys (Gemini, Finnhub, Groq, NVIDIA NIM, Bytez, Angel One) can also be configured directly in the app's **Settings** page after deployment. They are stored in your browser's `localStorage` and forwarded to backend routes via request headers — never hardcoded or stored server-side.

---

## Project Structure

```
├── api/                  # Vercel Serverless Functions (backend proxies)
│   ├── ai.ts             # Multi-AI provider proxy (Gemini, Groq, NVIDIA, Bytez)
│   ├── angelone.ts       # Angel One SmartAPI proxy
│   ├── crypto.ts         # CoinGecko crypto data proxy
│   ├── finnhub.ts        # Finnhub stock data proxy
│   └── gemini.ts         # Google Gemini proxy
├── src/
│   ├── components/       # React UI components
│   │   ├── ai/           # AI Advisor & Multi-AI Hub
│   │   ├── angelone/     # Angel One integration
│   │   ├── auth/         # Login, Signup, Forgot Password
│   │   ├── crypto/       # Crypto market & holdings
│   │   ├── dashboard/    # Overview dashboard, morning briefing
│   │   ├── layout/       # Header, Sidebar, Mobile nav
│   │   ├── research/     # Swing Research Engine
│   │   └── settings/     # Settings & API key management
│   ├── context/          # React Context (Auth, Portfolio)
│   ├── services/         # API service layer
│   └── App.tsx           # Root app component & routing
├── vercel.json           # Vercel routing config (SPA + API rewrites)
├── vite.config.ts        # Vite config + dev API proxy middleware
└── .env.example          # Environment variable template (no real keys)
```

---

## API Routes (Vercel Serverless Functions)

All API calls are proxied server-side — API keys are **never exposed in frontend bundles**.

| Route | Method | Description |
|---|---|---|
| `/api/gemini/generate` | POST | Google Gemini AI content generation |
| `/api/gemini/test-connection` | GET | Test Gemini API key validity |
| `/api/ai/chat` | POST | Multi-provider AI chat |
| `/api/ai/test` | POST | Test AI provider connection |
| `/api/finnhub/*` | GET | Finnhub stock quotes & news proxy |
| `/api/angelone/login` | POST | Angel One SmartAPI authentication |
| `/api/angelone/holdings` | GET | Fetch Angel One portfolio holdings |
| `/api/angelone/funds` | GET | Fetch Angel One available funds |
| `/api/crypto/markets` | GET | CoinGecko live crypto prices |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4 |
| Charts | Recharts |
| Animation | Framer Motion |
| Auth & DB | Firebase Auth + Firestore |
| PDF Export | jsPDF + jsPDF-AutoTable |
| Backend | Vercel Serverless Functions (Node.js ≥ 18) |
| AI | Google Gemini, Groq, NVIDIA NIM, Bytez |
| Market Data | Finnhub, CoinGecko, Angel One SmartAPI |

---

## Security Notes

- Firebase keys (`VITE_FIREBASE_*`) are **intentionally public** — security is enforced by Firestore Security Rules.
- All other API keys are **never committed to Git**. They are either set as Vercel Environment Variables or entered by the user in the app's Settings page.
- Angel One integration is **strictly read-only** — no trades are placed via this app.

---

## License

Private — All rights reserved.

# Debt Tracker - Installation Guide

A lightweight Progressive Web App (PWA) for tracking personal debts - both money people owe you and money you owe others. With interest tracking and payment schedules.

## Features

- **Two-way tracking**: "They Owe Me" and "I Owe" tabs
- **Interest calculation**: Set monthly interest rates
- **Payment recording**: Track payments with amortization schedule
- **Running balances**: See principal + interest totals
- **Works offline**: PWA with service worker
- **Mobile installable**: Add to home screen on Android/iOS

---

## Quick Start (Development)

### 1. Start the Backend

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run the API server
python run_backend.py
```

The API runs at `http://localhost:8765`

### 2. Start the Frontend

```bash
cd frontend

# Install Node dependencies
npm install

# Run development server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Deploy for Mobile

### Using Vercel (Easiest - Free)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in
3. Import your repository
4. Set root directory to `frontend`
5. Deploy!

You'll get a URL like `https://debt-tracker-xxx.vercel.app`

---

## Installing on Android Phone

### Step-by-Step

1. **Open Chrome** on your Android phone

2. **Navigate to your app URL**

3. **Tap the 3-dot menu** (top right)

4. **Tap "Add to Home screen"**

5. **Tap "Add"**

### Visual Guide

```
┌─────────────────────────────────────┐
│  Chrome                         [⋮] │  ← Step 3: Tap menu
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Debt Tracker                 │  │
│  │  +$1,500.00 / -$500.00        │  │
│  │                               │  │
│  │ They Owe Me | I Owe | Details │  │
│  │ ───────────────────────────── │  │
│  │                               │  │
│  │ ┌─────────────────────────┐   │  │
│  │ │ John           +$500.00│   │  │
│  │ │ 1%/mo · 12 months      │   │  │
│  │ └─────────────────────────┘   │  │
│  │                               │  │
│  │ ┌─────────────────────────┐   │  │
│  │ │ Sarah         +$1000.00│   │  │
│  │ │ 0%/mo · 6 months       │   │  │
│  │ └─────────────────────────┘   │  │
│  │                           [+] │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘

           ↓ Menu opens ↓

┌─────────────────────────────────────┐
│  ─────────────────────────────────  │
│  New tab                            │
│  New incognito tab                  │
│  ─────────────────────────────────  │
│  ★ Add to Home screen    ← Step 4   │
│  ─────────────────────────────────  │
└─────────────────────────────────────┘

           ↓ Dialog appears ↓

┌─────────────────────────────────────┐
│                                     │
│   Add to Home screen                │
│                                     │
│   ┌─────┐                           │
│   │  $  │  Debt Tracker             │
│   └─────┘                           │
│                                     │
│   [Cancel]            [Add] ← Tap   │
│                                     │
└─────────────────────────────────────┘

           ↓ Done! ↓

┌─────────────────────────────────────┐
│  Home Screen                        │
│                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │     │ │     │ │  $  │ ← Your app│
│  │ App │ │ App │ │     │           │
│  └─────┘ └─────┘ └─────┘           │
│                                     │
│  Tap to open in standalone mode     │
│  (no browser chrome, works offline) │
└─────────────────────────────────────┘
```

---

## Installing on iPhone

1. Open **Safari** (must be Safari)
2. Navigate to your app URL
3. Tap **Share button** (square with arrow up)
4. Tap **"Add to Home Screen"**
5. Tap **"Add"**

---

## Backend Deployment

For production, deploy the backend separately:

### Using Railway

1. Go to [railway.app](https://railway.app)
2. Create project from GitHub
3. Set start command: `uvicorn backend.api:app --host 0.0.0.0 --port $PORT`

### Update Frontend API URL

Edit `frontend/src/api.js`:

```javascript
const API_BASE = import.meta.env.PROD
  ? 'https://your-backend.railway.app'  // ← Your backend URL
  : '/api';
```

---

## Usage

### Adding a Debt

1. Tap **+** button
2. Select: "They owe me" or "I owe them"
3. Enter person's name
4. Enter amount
5. Set monthly interest rate (0 if none)
6. Set term (months)
7. Add notes (optional)
8. Tap "Add Debt"

### Recording a Payment

1. Tap a debt card to view details
2. Tap **+** button
3. Enter date and amount
4. Tap "Record Payment"

Payments are applied to interest first, then principal.

---

## Project Structure

```
debt-tracker/
├── backend/
│   ├── api.py          # FastAPI routes
│   ├── db.py           # SQLite setup
│   ├── models.py       # Loan & Payment models
│   └── logic.py        # Amortization logic
├── frontend/
│   ├── src/
│   │   ├── App.jsx     # React UI
│   │   ├── api.js      # API client
│   │   └── index.css   # Styles
│   ├── vite.config.js  # PWA config
│   └── package.json
└── requirements.txt
```

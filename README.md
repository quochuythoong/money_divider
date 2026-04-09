# MoneyDivider 💸

Split expenses fairly across any group, with zero drama.

---

## Quick Start (5 steps)

### 1 – Install Node.js
Download and install Node.js (v18 or later) from https://nodejs.org  
Verify: `node -v`

### 2 – Create a Supabase project
1. Go to https://supabase.com and sign up (free tier is fine).
2. Click **New Project**, give it a name (e.g. "money-divider"), choose a region.
3. Wait ~1 minute for it to provision.

### 3 – Run the database schema
1. In your Supabase dashboard, open **SQL Editor** → **New query**.
2. Paste the contents of `supabase_schema.sql` (in this folder).
3. Click **Run** (▶).

### 4 – Configure credentials
```bash
cp .env.example .env
```
Open `.env` and fill in the two values from your Supabase project:
- **VITE_SUPABASE_URL** → Settings → API → Project URL
- **VITE_SUPABASE_ANON_KEY** → Settings → API → Project API keys → `anon public`

### 5 – Install, then run
```bash
npm install
npm run dev
```
Open http://localhost:5173 in your browser.

---

## All Commands

| Command           | What it does                              |
|-------------------|-------------------------------------------|
| `npm install`     | Download all dependencies (once)          |
| `npm run dev`     | Start local dev server (hot reload)       |
| `npm run build`   | Compile for production → `dist/` folder   |
| `npm run preview` | Serve the production build locally        |

---

## Project Structure

```
money-divider/
├── index.html              # HTML shell
├── vite.config.js          # Vite config
├── package.json
├── .env.example            # ← copy to .env and fill in credentials
├── supabase_schema.sql     # ← run this once in Supabase SQL editor
└── src/
    ├── main.jsx            # React entry point
    ├── App.jsx             # App shell + session management
    ├── lib/
    │   └── supabase.js     # Supabase client singleton
    ├── engine/
    │   └── calculator.js   # Pure calculation logic (balances, settlements)
    ├── styles/
    │   └── theme.js        # Design tokens & shared styles
    ├── components/
    │   └── index.jsx       # Shared UI components
    └── tabs/
        ├── ParticipantsTab.jsx
        ├── BillsTab.jsx
        ├── SummaryTab.jsx
        └── SettlementTab.jsx
```

---

## How It Works

1. **Create a group** (e.g. "Weekend Trip").
2. **Add people** — anyone who participated.
3. **Add bills** — for each expense:
   - Who paid
   - Who shares it (any subset of the group)
   - Amount
4. **Summary tab** — see each person's paid / owed / net balance.
5. **Settlement tab** — get the minimum list of transfers to settle everything.

---

## Database Schema

| Table              | Purpose                                     |
|--------------------|---------------------------------------------|
| `sessions`         | A named expense group / trip                |
| `participants`     | People in a session                         |
| `bills`            | Expenses (amount, payer, category)          |
| `bill_participants`| Which participants share each bill          |

---

## Building for Production / Docker (later)

```bash
npm run build
# Serves the static files in dist/ with any HTTP server, e.g.:
npx serve dist
```

To Dockerize, use a standard `nginx` image serving the `dist/` folder and inject
the `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` as build args.

# MoneyDivider 💸
Split expenses fairly across any group, with zero drama.

---

## Option A — Use online
If someone is hosting a live instance, just open the URL in your browser. No setup needed.

---

## Option B — Clone and run (developers)

**Requirements:** Node.js v18+ — download from nodejs.org

```bash
git clone https://github.com/YOUR_USERNAME/money-divider.git
cd money-divider
cp .env.example .env        # then fill in your Supabase credentials (see below)
npm install
npm run dev                 # open http://localhost:5173
```

---

## Option C — Clone and run with Docker (no Node.js needed)

**Requirements:** Docker — download from docker.com

```bash
git clone https://github.com/YOUR_USERNAME/money-divider.git
cd money-divider
docker build -t money-divider .
docker run -p 8080:80 \
  -e VITE_SUPABASE_URL=https://xxxx.supabase.co \
  -e VITE_SUPABASE_ANON_KEY=your_key \
  money-divider
```
Open http://localhost:8080

---

## Supabase setup (required for Options B and C)

1. Go to **supabase.com** → sign up free → New Project
2. Wait ~1 minute for it to provision
3. Go to **SQL Editor** → New query → paste the contents of `supabase_schema.sql` → Run ▶
4. Go to **Authentication → Providers → Email** → turn OFF "Confirm email" → Save
5. Go to **Settings → API** → copy:
   - Project URL
   - anon public key

For Option B, paste these into your `.env`:
- VITE_SUPABASE_URL=https://xxxx.supabase.co
- VITE_SUPABASE_ANON_KEY=your_anon_key

For Option C, pass them as `-e` flags in the `docker run` command above.

---

## Commands reference

| Command | What it does |
|---|---|
| `npm install` | Install dependencies (once) |
| `npm run dev` | Local dev server at localhost:5173 |
| `npm run build` | Build for production → `dist/` |
| `npm run preview` | Preview the production build locally |

---

## How it works

1. Create a **group** (e.g. "Weekend Trip")
2. Add **people** — everyone who participated
3. Add **bills** — who paid, who shares it, how much
4. **Summary** — see each person's net balance
5. **Settlement** — minimum transfers to settle all debts

### Two modes
- **Account mode** — create a username + password, your data is saved and private
- **Single use** — no account needed, data is cleared when you close the tab

---

## Project structure
money-divider/
├── index.html
├── vite.config.js
├── package.json
├── Dockerfile
├── nginx.conf
├── docker-entrypoint.sh
├── .env.example            ← copy to .env and fill in credentials
├── supabase_schema.sql     ← run once in Supabase SQL editor
├── README.md
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── lib/
        ├── supabase.js
        └── auth.js
    ├── engine/calculator.js
    ├── styles/theme.js
    ├── components/index.jsx
    └── tabs/
        ├── AuthScreen.jsx
        ├── ParticipantsTab.jsx
        ├── BillsTab.jsx
        ├── SummaryTab.jsx
        └── SettlementTab.jsx


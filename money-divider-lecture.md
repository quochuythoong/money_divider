# MoneyDivider — A Complete Technical Lecture

### From Problem to Production: Architecture, Implementation, and Operations of a Full-Stack Bill-Splitting Application

---

## 1. Executive Overview

MoneyDivider is a web application that solves a precise, everyday problem: when a group of people share expenses across multiple events, calculating who owes whom at the end is tedious and error-prone if done manually. The app removes that friction entirely.

A user — typically the person who organized the outing or trip — creates an expense group, adds every participant, records each bill with the payer and the subset of people who shared it, and receives a mathematically correct settlement list that minimises the number of transfers needed to balance all debts.

The application runs as:
- A hosted web app on Vercel (primary, used directly in a browser)
- A Progressive Web App installable on iPhone via Safari (no App Store needed)
- A Docker container (for self-hosters)
- A cloneable codebase where developers run their own Supabase backend

The codebase is a single-page React application. There is no dedicated Node.js server. All persistence is handled by Supabase (a hosted Postgres service with a REST and realtime API). The calculation engine is pure JavaScript with no dependencies.

---

## 2. Product and User Problem

### The Problem in Concrete Terms

Consider five friends who go to the cinema, then dinner, then a café. Not everyone attends every part. One person pays for cinema tickets, another covers dinner, a third buys café drinks. Additionally, one person pays the parking fee for two specific others. At the end of the evening, nobody knows exactly who owes what.

The naive approach — splitting the total equally — is wrong because participation was unequal. The correct approach requires:

1. For each bill, dividing the cost only among the participants included in that bill.
2. Crediting the payer for the full amount they spent.
3. Computing each person's net balance (total paid minus total owed).
4. Finding the minimum number of transfers that clears all debts.

This last step — the minimum settlement — is an optimisation problem. A greedy algorithm over sorted creditors and debtors solves it in practice to near-optimal results for small groups.

### Who Uses It

The primary user is a group host or trip organiser who inputs data on behalf of the group. Participants view the settlement output (typically shared as a screenshot) and act on it. The app is designed for non-technical users: it has no jargon, no required configuration, and works on both desktop and iPhone.

### What Makes It Non-Trivial

- Participants join bills individually (not everyone joins every bill).
- One person can pay on behalf of someone else who is the sole beneficiary.
- Currency formatting matters: Vietnamese Dong (VND) should be rounded up to the nearest 1,000 for cleanliness; USD requires two decimal places.
- The "collector" feature is a real workflow: one trusted person collects all money, then distributes it, reducing the number of peer-to-peer transfers for large groups.
- Data must persist across devices and platform (phone and computer same account, same state).

---

## 3. High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     USER'S BROWSER / PWA                  │
│                                                           │
│  React SPA (Vite)                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │  Auth    │  │ Session  │  │   Tabs   │  │ Engine   │ │
│  │ Screen   │  │  List    │  │ (4 views)│  │ (pure JS)│ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│                        │                                  │
│              ┌─────────▼──────────┐                      │
│              │   Supabase Client  │                      │
│              │  (@supabase/js SDK)│                      │
│              └─────────┬──────────┘                      │
└────────────────────────┼────────────────────────────────┘
                         │  HTTPS (REST + Auth JWT)
┌────────────────────────▼────────────────────────────────┐
│                    SUPABASE CLOUD                         │
│                                                           │
│  ┌──────────────┐   ┌──────────────┐  ┌───────────────┐ │
│  │  Auth        │   │  PostgREST   │  │   Postgres DB │ │
│  │  (bcrypt pwd)│   │  (auto REST) │  │   (5 tables)  │ │
│  └──────────────┘   └──────────────┘  └───────────────┘ │
│                                                           │
│  Row Level Security: every query filtered by auth.uid()  │
└──────────────────────────────────────────────────────────┘
```

**Key architectural property:** There is no application server between the browser and Supabase. The browser talks to Supabase directly using the anon public key (a JWT that identifies the project but not a user). Row Level Security (RLS) policies in Postgres enforce per-user data isolation at the database level. This means even if someone obtains the anon key, they can only see their own rows.

---

## 4. Tech Stack Inventory

| Technology | Role in this app |
|---|---|
| **React 18** | UI rendering, component model, hooks for state and effects |
| **Vite 5** | Dev server with hot module replacement; production bundler |
| **@supabase/supabase-js 2** | Client SDK for auth, database queries, realtime |
| **Supabase (hosted Postgres)** | Database, authentication, REST API via PostgREST, RLS |
| **html2canvas** | DOM-to-canvas screenshot for "Save as Image" feature |
| **nginx** | Static file server inside the Docker container |
| **Docker + electron-builder** | Container packaging; desktop `.exe` build target |
| **Vercel** | Hosting for the web/PWA version; auto-deploys on git push |
| **Google Fonts (DM Sans, DM Serif Display)** | Typography via CDN link in index.html |

**What is deliberately absent:**
- No React Router — the app uses conditional rendering driven by state instead. This works because there are only 4 views inside a session and 3 outer screens (auth, session list, main tabs). URL routing would add complexity without benefit.
- No Redux, Zustand, or other state library — React's own `useState` and prop drilling is sufficient. The app has one data owner (`App.jsx`) and passes everything down.
- No TypeScript — the codebase uses plain JavaScript. This is a trade-off: faster to write, but no compile-time safety.
- No test suite — not evident in the repository.
- No CSS framework or CSS-in-JS library — all styles are inline JavaScript objects. This is unconventional but has a clear motivation: it colocates visual and structural concerns in a single file per component, avoids class name collisions, and makes theming trivial through a shared `theme.js` object.

---

## 5. Repository Map

```
money-divider/
│
├── index.html                  # HTML shell; loads fonts, PWA meta, registers SW
├── vite.config.js              # Vite plugin setup (react only)
├── package.json                # Dependencies and npm scripts
├── .env.example                # Template showing required env vars
├── .gitignore                  # Excludes node_modules, dist, .env
│
├── supabase_schema.sql         # Full DB schema + RLS policies (run once)
├── nginx.conf                  # nginx config for Docker: serves SPA, 404→index
├── Dockerfile                  # Two-stage: node build → nginx serve
├── docker-entrypoint.sh        # Injects runtime env vars as window.__* globals
│
├── public/                     # Static assets served as-is by Vite/nginx
│   ├── manifest.json           # PWA manifest (name, icons, theme color)
│   ├── sw.js                   # Service worker (offline shell caching)
│   ├── favicon.ico / *.png     # Browser tab and home screen icons
│
└── src/
    ├── main.jsx                # React entry: mounts <App> into #root
    ├── App.jsx                 # Root component: auth gate, session picker, tab shell
    │
    ├── lib/
    │   ├── supabase.js         # Creates SupabaseClient; exports isConfigured flag
    │   ├── auth.js             # signUp/signIn/signOut with fake-email pattern
    │   ├── settlementState.js  # load/save collector+checkboxes to Supabase
    │   └── useIsMobile.js      # Hook: returns true if viewport < 768px
    │
    ├── engine/
    │   └── calculator.js       # Pure functions: balances, settlements, formatting
    │
    ├── styles/
    │   └── theme.js            # Design token object (colors, avatar palette, etc.)
    │
    ├── components/
    │   └── index.jsx           # Shared UI: Modal, Input, Select, MultiSelect,
    │                           #   Avatar, Badge, Empty, Confirm, Spinner
    │
    └── tabs/
        ├── AuthScreen.jsx      # Login / create-account form
        ├── ParticipantsTab.jsx # Add/edit/delete group members
        ├── BillsTab.jsx        # Add/edit/delete expense entries
        ├── SummaryTab.jsx      # Per-person balance breakdown + bill table
        └── SettlementTab.jsx   # Settlement list, collector mode, QR, save image
```

### The most important files to understand first

1. `src/engine/calculator.js` — the financial brain; everything else is UI around it.
2. `src/App.jsx` — the entire application state machine; controls what screen renders.
3. `supabase_schema.sql` — the full data contract; understand this and you understand the backend.
4. `src/lib/supabase.js` — the single database connection; changing credentials here affects the whole app.

---

## 6. Core Runtime Flow

### First Load (Web)

```
1. Browser fetches index.html from Vercel CDN
2. index.html loads /config.js (Docker only; noop on Vercel)
3. Vite bundle loads: React, Supabase SDK, app code
4. main.jsx renders <App> inside StrictMode
5. App checks isConfigured (env vars present?)
   → No  : renders <SetupGuide> with step-by-step instructions
   → Yes : proceeds
6. App calls supabase.auth.onAuthStateChange()
   → user = undefined : shows <Spinner> (checking session)
   → user = null      : renders <AuthScreen>
   → user = object    : renders <SessionListView>
7. Service worker registers in background (sw.js)
   → Caches index.html and / for offline fallback
```

### Authentication Flow

```
AuthScreen
  ↓ user types username + password, clicks "Log in"
auth.js: signIn(username, password)
  ↓ converts to fake email: "username@moneydivider.app"
supabase.auth.signInWithPassword({ email, password })
  ↓ Supabase returns JWT session
onAuthStateChange fires with new user
  ↓ App.jsx setUser(user)
SessionListView renders
```

The "fake email" pattern exists because Supabase Auth requires an email address. Since real emails are not needed (no confirmation, no recovery), a deterministic transformation of the username suffices. The domain `moneydivider.app` is never contacted; it is a syntactic placeholder.

### Main Data Flow (within a session)

```
User selects a session
  ↓ App.jsx: setSession(s), reload() fires
reload():
  parallel fetch:
    - participants table WHERE session_id = ?
    - bills table + bill_participants JOIN WHERE session_id = ?
    - sessions table for currency + exchange_rate
    - settlement_state table for collector + checked boxes
  ↓ setState for all four
Tab renders with fresh data
  ↓ User edits (add/edit/delete)
Tab calls Supabase mutation
  ↓ await reload()
UI updates
```

Note the deliberate simplicity: there is no optimistic update except in the Bills tab (which gained `close()` + `reload()` after a bug fix). Every mutation waits for a server round-trip before refreshing the UI. For a small-group app with few rows, this is acceptable and eliminates a category of consistency bugs.

---

## 7. Frontend Architecture

### Rendering Model

The app is a single-page application with no URL routing. Navigation is entirely state-driven:

```
user === undefined          → <Spinner>
!isConfigured               → <SetupGuide>
!user && !isGuest           → <AuthScreen>
user/isGuest && !session    → <SessionListView>
session                     → <MainShell> with 4 tabs
```

Each condition is a plain `if` statement at the top of `App`'s render. This is not a router — it is a state machine with 5 states.

### Component Hierarchy

```
App
├── SetupGuide            (no deps, static)
├── AuthScreen            (reads: none; writes: supabase.auth)
├── SessionListView       (reads: sessions; writes: sessions)
└── [Main Shell]
    ├── Header            (inline in App.jsx)
    │   ├── Logo
    │   ├── SessionName
    │   ├── CurrencyToggle
    │   ├── Tabs (grid of 4)
    │   └── ← Groups button
    └── Tab Content
        ├── ParticipantsTab
        ├── BillsTab
        ├── SummaryTab
        └── SettlementTab
```

### Shared Components (`src/components/index.jsx`)

All shared UI primitives live in a single file. This is intentional for a small project — one import covers all needs. The components are:

- **Modal** — fixed overlay with backdrop blur; behaves as a bottom sheet on mobile (slides up from bottom), centered dialog on desktop. Accepts a `centered` prop to force center on mobile (used by `Confirm`).
- **Input** — labeled text field with error state; passes all props through to `<input>` via spread.
- **Select** — styled `<select>` with label.
- **MultiSelect** — a group of toggle buttons for selecting multiple participants; has an "All/None" shortcut.
- **Avatar** — circular initial badge with colour derived from participant index.
- **Badge** — small pill label (category tags, status indicators).
- **Empty** — centered icon + message for empty states.
- **Confirm** — destructive action confirmation dialog; always centered.
- **Spinner** — CSS keyframe spinning circle.

### Styling Architecture

There is no CSS file in the project (aside from minimal resets in `index.html`). All styles are JavaScript objects passed to the `style` prop. A central `theme.js` exports a `G` object:

```js
const G = {
  bg:         '#0a0a0b',  // page background
  surface:    '#111114',  // nav bars
  card:       '#18181d',  // card backgrounds
  accent:     '#f5a623',  // primary amber/gold
  text:       '#f0eee8',  // primary text
  textMuted:  '#7a7880',  // secondary text
  green:      '#4ade80',  // positive balances
  red:        '#f87171',  // negative balances / delete actions
  blue:       '#60a5fa',  // payer labels, USD amounts
  // ...
}
```

This approach has trade-offs. Advantages: theming is trivially centralised, no class name collisions, no build-time CSS processing. Disadvantages: no CSS media queries (the app uses a `useIsMobile` hook instead), no pseudo-class support (hover effects require `onMouseEnter/Leave` handlers), styles are not cached by the browser across components.

### Responsive Strategy

Mobile detection uses a custom hook:

```js
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}
```

The 768px breakpoint corresponds to the iPad portrait width — anything narrower is treated as a phone. This value is used in `SettlementTab` (column layout vs. stacked), `App.jsx` (header layout), and `Modal` (bottom sheet vs. centered).

Safe area insets (`env(safe-area-inset-top)`) are applied to the header row so content is not hidden behind iPhone's Dynamic Island or status bar.

### Font Strategy

Two fonts from Google Fonts:
- **DM Sans** — body text, UI labels, buttons. Clean, modern, legible at small sizes.
- **DM Serif Display** — headings and monetary amounts. Elegant serif with high visual weight; makes large numbers feel premium.

Both are loaded via `<link>` in `index.html`, not via npm, which avoids bundle size bloat.

---

## 8. Backend Architecture

There is no backend application server. All "backend" logic is provided by Supabase:

### Supabase Services Used

**1. Supabase Auth**
- Manages user accounts, password hashing (bcrypt), JWT session tokens.
- Email confirmation is disabled — users sign up and immediately access the app.
- The `onAuthStateChange` listener in `App.jsx` reacts to login/logout events without polling.

**2. PostgREST (auto-generated REST API)**
- Every Postgres table is automatically exposed as a REST endpoint.
- The Supabase JS SDK wraps these endpoints in a fluent query builder:
  ```js
  supabase.from('bills')
    .select('*, participants:bill_participants(participant_id)')
    .eq('session_id', session.id)
    .order('created_at')
  ```
  This translates to a JOIN query: fetch all bills for a session, embedding the `bill_participants` rows as a nested array named `participants`.

**3. Row Level Security (RLS)**
- Every table has RLS enabled. Policies use `auth.uid()` — the authenticated user's UUID — to filter rows.
- The `sessions` table policy: `user_id = auth.uid()`.
- Derived tables (`participants`, `bills`, `bill_participants`) check ownership via subquery: `session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())`.
- This means a logged-in user physically cannot query another user's data, regardless of what the client-side code does.

**4. No Edge Functions or server-side jobs**
- All business logic (calculation, validation) runs in the browser.
- This is appropriate because the logic is stateless and CPU-cheap. There is no server-side computation that needs protecting from manipulation (the app has no financial stakes beyond personal use).

---

## 9. Data / Storage Layer

### Schema Overview

```sql
sessions
  id          uuid PK
  name        text
  currency    text DEFAULT 'VND'
  exchange_rate numeric(14,4) DEFAULT 25000
  user_id     uuid FK → auth.users
  created_at  timestamptz

participants
  id          uuid PK
  session_id  uuid FK → sessions (CASCADE DELETE)
  name        text
  created_at  timestamptz

bills
  id          uuid PK
  session_id  uuid FK → sessions (CASCADE DELETE)
  title       text
  amount      numeric(14,2)
  payer_id    uuid FK → participants (RESTRICT DELETE)
  category    text DEFAULT 'Other'
  notes       text nullable
  created_at  timestamptz

bill_participants          ← junction table
  bill_id        uuid FK → bills (CASCADE DELETE)
  participant_id uuid FK → participants (CASCADE DELETE)
  PRIMARY KEY (bill_id, participant_id)

settlement_state           ← persists UI state across devices
  session_id   uuid PK FK → sessions (CASCADE DELETE)
  collector_id uuid FK → participants (SET NULL on DELETE)
  checked_keys jsonb DEFAULT '[]'
  updated_at   timestamptz
```

### Key Design Decisions

**Why `bill_participants` as a junction table?**
A bill can include any subset of participants. This is a many-to-many relationship. A junction table is the correct normalised representation. The alternative — storing participant IDs as an array in the `bills` table — would break relational integrity and complicate queries.

**Why `payer_id` uses RESTRICT on delete?**
If you try to delete a participant who is the payer on an existing bill, Postgres will refuse. This prevents orphaned bills with no payer. The UI warns users before deletion; the database enforces it.

**Why store `settlement_state` in Supabase?**
The collector mode selection and checked checkboxes need to survive page refresh and persist across the user's phone and laptop. `localStorage` is device-specific. Supabase provides device-agnostic persistence. The state is small (one UUID + an array of string keys) so the overhead is negligible.

**Why `exchange_rate` on the `sessions` table?**
Different sessions may be settled in different currencies or at different times (exchange rates fluctuate). Storing the rate per session ensures historical accuracy and allows each group to use its own rate.

### CASCADE DELETE Chain

Deleting a session cascades through:
```
sessions → participants, bills, bill_participants, settlement_state
```
This means deleting a group in the UI removes all associated data in one operation with no orphaned rows.

### Guest Mode Storage

Guest mode uses `localStorage` only. On every page load, `clearGuest()` is called unconditionally:
```js
clearGuest()  // runs once at module load time in App.jsx
window.addEventListener('beforeunload', clearGuest)
```
The double strategy (on load + on unload) handles both the "user closed and reopened" and "user refreshed" cases, since `beforeunload` is unreliable in some mobile browsers.

---

## 10. State Management and Data Flow

### Where State Lives

All authoritative application state lives in `App.jsx`:

```js
// Auth
const [user,         setUser]         = useState(undefined)
const [isGuest,      setIsGuest]      = useState(false)

// Navigation
const [session,      setSession]      = useState(null)
const [tab,          setTab]          = useState('participants')

// Data
const [participants, setParticipants] = useState([])
const [bills,        setBills]        = useState([])
const [loading,      setLoading]      = useState(false)

// Currency
const [currency,     setCurrency]     = useState('VND')
const [exchangeRate, setExchangeRate] = useState(25000)

// Settlement UI (persisted to DB)
const [checkedKeys,  setCheckedKeys]  = useState(new Set())
const [collectorId,  setCollectorId]  = useState(null)
```

Tab components receive data and callbacks as props. They do not own state — they display it and invoke mutations that call `reload()` to refresh from the source of truth (Supabase).

### Data Flow Pattern

```
Supabase (source of truth)
    ↓  reload()
App.jsx state (participants, bills, ...)
    ↓  props
Tab components (ParticipantsTab, BillsTab, ...)
    ↓  user action (add/edit/delete)
Tab calls Supabase mutation
    ↓  await reload()
App.jsx state updates
    ↓  React re-renders tab
```

This is a top-down, unidirectional data flow. No state is shared laterally between tabs.

### Computed State in SettlementTab

The calculation engine is called inside `useMemo` hooks:

```js
const { net } = useMemo(
  () => calculateBalances(participants, normBills),
  [participants, normBills]
)

const settlements = useMemo(
  () => calculateSettlements(participants, net),
  [participants, net]
)
```

`useMemo` ensures these computations only run when their inputs change, not on every render. For large groups with many bills, this matters.

---

## 11. The Calculation Engine

This is the most important module in the entire application. It is in `src/engine/calculator.js` and has zero dependencies.

### `calculateBalances(participants, bills)`

```
Input:  participants = [{ id, name }, ...]
        bills = [{ amount, payerId, participantIds: [...] }, ...]

For each bill:
  share = bill.amount / bill.participantIds.length
  paid[bill.payerId] += bill.amount
  for each participant in bill.participantIds:
    owed[pid] += share

net[pid] = paid[pid] - owed[pid]

Output: { paid, owed, net }   (each is { [pid]: number })
```

A positive `net` means the person paid more than their share — they are owed money. A negative `net` means they owe money.

### `calculateSettlements(participants, net)`

```
1. Separate participants into creditors (net > 0) and debtors (net < 0)
2. Sort both lists by absolute amount descending
3. Greedy pass:
   while creditors and debtors remain:
     transfer = min(creditor.amount, debtor.amount)
     record: debtor pays creditor `transfer`
     subtract transfer from both
     if either reaches 0, advance that pointer
4. Return list of { from, to, amount } transfers
```

This greedy algorithm produces the minimum number of transfers for most real-world cases. It is not guaranteed optimal for all inputs, but for groups of under 20 people it performs identically to the optimal solution.

### Currency Rounding

```js
// VND: round up to nearest 1,000 (psychological cleanliness)
Math.ceil(amount / 1000) * 1000

// USD: round to 2 decimal places
Math.round(amount * 100) / 100
```

The rounding happens at settlement calculation time, not at balance calculation time. This means the per-person summary shows exact shares, but the final payment amounts are rounded. The small rounding errors (typically < 500 VND) are absorbed by the payer.

### `fmtCurrency(n, currency, exchangeRate)`

```js
export function fmtCurrency(n, currency = 'VND', exchangeRate = 25000) {
  const converted = currency === 'USD' ? n / exchangeRate : n
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD',
      minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(converted)
  }
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND',
    maximumFractionDigits: 0 }).format(Math.round(converted))
}
```

`Intl.NumberFormat` handles locale-specific separators (e.g., Vietnamese uses `.` as thousands separator and `,` for decimals — the opposite of English). The browser's built-in API handles this correctly without a library.

---

## 12. UI / UX Analysis

### Design System

The visual language is "dark premium minimalist":
- Background: near-black `#0a0a0b`
- Cards: `#18181d` with `1px solid #252530` borders
- Accent: amber `#f5a623` — used for primary actions, active states, monetary amounts
- Semantic colours: green for positive balances, red for negative, blue for payer labels

The amber accent on a dark background creates high contrast (passes WCAG AA for large text). The colour system is consistent: amber is always "primary action or money", green is always "positive/receive", red is always "negative/owe/delete".

### Layout Patterns

**Sticky header + scrollable content:** Each tab has a fixed header (title, count, add button) and a scrollable body. This is implemented not with `position: sticky` CSS but with a flex column layout: the parent (`App.jsx` content wrapper) is `height: 100vh, overflow: hidden`. The tab root is `height: 100%, flex-direction: column`. The header is `flex-shrink: 0`. The body is `flex: 1, overflow-y: auto`. This pattern is more reliable across browsers than CSS sticky for this use case.

**Bottom sheet on mobile:** The `Modal` component uses `justifyContent: flex-end` on the overlay and removes bottom border radius on the inner panel when on mobile, creating a standard iOS-style bottom sheet. The `Confirm` dialog overrides this with `centered: true` to always appear in the screen center.

**CSS Grid for settlement rows:** The settlement list uses a single CSS grid spanning all rows:
```js
gridTemplateColumns: '20px 1fr 60px 1fr auto'
// checkbox | from-name | arrow | to-name | amount
```
Because all rows share the same grid, the arrow column aligns perfectly regardless of name length — a problem that individual flex rows cannot solve.

### Interaction Patterns

- **Swipe-friendly on mobile:** Edit and delete on participant/bill cards are accessible via Edit/× buttons that are always visible, not hidden behind swipe gestures (unlike native iOS).
- **MultiSelect chip toggle:** Participant selection in the bill form uses touch-friendly chip buttons rather than a multi-select dropdown, which is notoriously hard to use on mobile.
- **Save as Image:** Uses the Web Share API on iOS (`navigator.share({ files: [imageFile] })`), which presents the native iOS share sheet with "Save Image" as the first option. On desktop, it falls back to an `<a download>` click. This means zero friction on iPhone — one tap saves to Photos.

---

## 13. Feature-by-Feature Walkthrough

### Feature 1: Account System

**Implementation:** Supabase Auth with a fake-email pattern. The username `alice` becomes `alice@moneydivider.app`. This is transparent to the user — they only ever see a "Username" field.

**Why not a custom users table?** Supabase Auth provides password hashing, session tokens, JWT rotation, and rate limiting out of the box. Re-implementing any of this would be non-trivial and error-prone.

**Guest mode:** A parallel data path using `localStorage`. The `guestApi` object in `App.jsx` mirrors the shape of the Supabase calls (add/update/delete for participants and bills) but reads/writes to a single JSON blob in `localStorage`. Tab components receive `isGuest` and `guestApi` props and branch accordingly.

### Feature 2: Session / Group Management

Each expense group is a `sessions` row. A user can have multiple groups (different trips, different friend circles). Groups are listed on the session screen with creation date. Deleting a group deletes all associated data via CASCADE.

The session screen also doubles as the "sign out / back to login" point: the sign-out button is at the bottom of the session list.

### Feature 3: Participants

Simple CRUD. The tab displays participants as avatar cards in a responsive grid. On mobile, cards are 1-per-row at narrow widths. Participants are always displayed in alphabetical order (sorted at render time, not at fetch time — the database order is by `created_at`).

Duplicate name prevention is enforced client-side (case-insensitive comparison). There is no server-side unique constraint on `(session_id, name)` — this is a gap in the schema.

### Feature 4: Bills

The most complex CRUD screen. The form has:
- Title (free text)
- Amount (numeric)
- Category (dropdown from a fixed list)
- Paid by (single-select from participants)
- Participants included (MultiSelect chip toggle)
- Notes (optional free text)

The insert operation requires two Supabase calls: one to insert the `bills` row (getting back the new UUID), then one to insert all `bill_participants` rows. The update operation requires a delete-then-reinsert of `bill_participants` because updating a junction table in bulk is simpler this way.

Bills are displayed with the amount formatted in the current currency, the per-person share, the payer name, and the participant list.

### Feature 5: Summary Tab

A read-only view computed entirely from `calculateBalances`. Two tables:
1. Per-person: Paid / Owed / Net / Status badge — sorted alphabetically.
2. Per-bill: amount, payer, participants, share-per-person.

On narrow screens, the first table is horizontally scrollable (`minWidth: 540`). The second table is also scrollable.

### Feature 6: Settlement Tab

The most feature-rich tab:

**Normal mode:** Shows the minimum-transfer list from `calculateSettlements`.

**Collector mode:** When enabled, every person who owes money pays one designated collector, and the collector pays everyone who should receive money. This converts an N-party graph of transfers into a star topology, which may have more transfers but is simpler to execute (everyone Venmos one person). The rows are visually split: payer rows use the normal amber style; payback rows (collector → recipient) are in a dotted amber border box at the top, with blue amount boxes.

**Checkboxes:** Each transfer row has a checkbox. Checking it blurs and dims the row (marking it done). The checkbox cell is always unblurred regardless of the row's blur state so the user can uncheck it.

**Settlement state persistence:** Collector selection and checkbox state are saved to `settlement_state` in Supabase on every change, loaded on every `reload()`. This means the state survives page refresh, tab switching, and cross-device use.

**QR Code:** A click-to-upload image area for the group collector's bank QR code. Stored in-memory only (not in Supabase). On page reload it is lost — this is intentional; users upload it fresh each session as it is only needed at settlement time.

**Save as Image:** `html2canvas` captures the `captureRef` div (settlements + QR, excluding the Save button which is conditionally hidden during capture). A 50ms delay between hiding the button and running `html2canvas` allows React to re-render. The result is shared via Web Share API (mobile) or downloaded (desktop).

---

## 14. Configuration, Environment, and Secrets

### Environment Variables

```
VITE_SUPABASE_URL       → https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY  → eyJhbGciOiJIUzI1NiIsIn...
```

Both are prefixed with `VITE_` which is Vite's convention for variables to embed in the client bundle. This means these values are visible in the compiled JavaScript — they are not secrets in the traditional sense. The anon key is a public credential that identifies the Supabase project; it does not grant admin access. Data security is enforced by RLS, not by keeping the key secret.

**What breaks if misconfigured:**
- Wrong URL: all Supabase calls return network errors; the `isConfigured` check passes but every query fails.
- Wrong anon key: authentication calls return 401; the auth screen appears but login always fails.
- Missing both: `isConfigured` returns false; the `SetupGuide` screen renders instead of the app.

### Docker Runtime Injection

In Docker, the Vite build runs without env vars (no secrets baked in). The `docker-entrypoint.sh` script writes them at container start:

```sh
cat <<EOF > /usr/share/nginx/html/config.js
window.__SUPABASE_URL__ = "${VITE_SUPABASE_URL}";
window.__SUPABASE_ANON_KEY__ = "${VITE_SUPABASE_ANON_KEY}";
EOF
```

`index.html` loads `/config.js` before the app bundle. `supabase.js` reads `window.__SUPABASE_URL__ || import.meta.env.VITE_SUPABASE_URL`, so it works in both dev (env vars) and Docker (window globals) contexts.

### PWA Configuration (`public/manifest.json`)

```json
{
  "name": "MoneyDivider",
  "display": "standalone",
  "background_color": "#0a0a0b",
  "theme_color": "#f5a623",
  "icons": [...]
}
```

`display: standalone` is what makes the PWA hide the Safari URL bar when launched from the home screen. `theme_color` sets the iPhone status bar tint.

---

## 15. Local Development Setup

### Prerequisites

- Node.js v18 or later (v20 recommended)
- A Supabase account (free tier)

### Step-by-Step

```bash
# 1. Clone
git clone https://github.com/quochuythoong/money_divider.git
cd money_divider

# 2. Install dependencies
npm install

# 3. Configure Supabase
cp .env.example .env
# Edit .env: fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 4. Run database schema
# Open Supabase → SQL Editor → paste supabase_schema.sql → Run

# 5. Disable email confirmation
# Supabase → Authentication → Providers → Email → turn off "Confirm email"

# 6. Start dev server
npm run dev
# Opens at http://localhost:5173 with hot module replacement
```

### Expected Dev Experience

Vite's HMR updates the browser within ~50ms of saving a file. State is not preserved across HMR updates for files that export React components (the component remounts). State is preserved for changes to utility files (`calculator.js`, `theme.js`).

---

## 16. Build, Test, Lint, and Release Workflow

### Build

```bash
npm run build
# Output: dist/ folder (static HTML + JS + assets)
# Typical output size: ~300KB JS (gzipped ~90KB)

npm run preview
# Serves dist/ locally at http://localhost:4173
# Tests the production build before deploying
```

### Tests

Not evident in the repository. The calculation engine (`calculator.js`) is a pure function module that would be straightforward to unit test with any test runner. The absence of tests is a known trade-off for a solo-developed MVP.

### Lint / Format

No ESLint or Prettier configuration files are present in the repository. Code style is consistent but not enforced by tooling.

### Release (Vercel)

```bash
git add .
git commit -m "description of change"
git push
# Vercel webhook triggers → build → deploy → live in ~30 seconds
```

Vercel reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from project environment variables configured in the Vercel dashboard. The build command is `npm run build` (auto-detected). The output directory is `dist`.

### Release (Docker)

```bash
docker build -t money-divider .

docker run -p 8080:80 \
  -e VITE_SUPABASE_URL=https://xxxx.supabase.co \
  -e VITE_SUPABASE_ANON_KEY=your_key \
  money-divider
# App available at http://localhost:8080
```

The Dockerfile uses a two-stage build:
1. `node:20-alpine` installs dependencies and runs `npm run build`.
2. `nginx:alpine` copies the `dist/` output and the custom `nginx.conf`.

No secrets are baked into the image. The entrypoint script injects them at runtime from the `-e` flags.

---

## 17. Deployment and Operations

### Vercel (Primary)

- **Free tier** supports this app without restriction for the described usage (10 users, low traffic).
- **Auto-deploys** on every push to the `main` branch.
- **CDN distribution** means static assets are served from edge nodes close to users globally.
- **No server to manage** — Vercel handles scaling, SSL, and uptime.

### Supabase (Database + Auth)

- **Free tier limits:** 500MB database, 50,000 auth users, 500K API requests/month, 5GB bandwidth.
- **Inactivity pause:** Projects on the free tier are paused after 7 days of no activity. Mitigation: configure UptimeRobot to ping the Supabase project URL daily.
- **No migrations system:** Schema changes are applied manually via the SQL editor. This is appropriate for a solo project but would be a problem in a team environment.

### Progressive Web App

iPhone users add the app to their home screen via Safari → Share → Add to Home Screen. The service worker (`public/sw.js`) caches the app shell for offline resilience. The caching strategy is "network first, cache fallback" — Supabase API calls are never cached (they bypass the service worker), ensuring data is always fresh when online.

---

## 18. Security, Reliability, and Performance Considerations

### Authentication Security

- Passwords are hashed by Supabase (bcrypt). The app never sees plaintext passwords after submission.
- JWT sessions expire and auto-refresh via Supabase SDK.
- The fake-email domain (`moneydivider.app`) prevents username enumeration via email bounce.
- No password recovery mechanism is implemented. A forgotten password requires admin intervention in the Supabase dashboard.

### Authorisation

Row Level Security is the authorisation layer. Key properties:
- Users cannot read or write other users' data regardless of client-side behaviour.
- The anon key does not bypass RLS — it is required to have a valid JWT in the `Authorization` header for any authenticated operation.
- Guest mode writes nothing to Supabase, so there is no RLS concern for guests.

### Input Validation

Client-side validation in form components catches:
- Empty required fields
- Non-numeric amounts
- Zero or negative amounts
- Empty participant selection
- Duplicate participant names (case-insensitive)

Database-level validation:
- `amount >= 0` CHECK constraint on `bills.amount`
- Foreign key constraints prevent orphaned records
- `payer_id` RESTRICT prevents deletion of a participant who is a payer

**Gap:** No server-side validation of text field length. A user could submit a title with 10,000 characters. Postgres TEXT columns have no length limit by default, so this would succeed. For a personal-use app this is acceptable; for a public app it would warrant `VARCHAR(n)` constraints.

### Performance

- The calculation engine runs synchronously in the browser. For groups up to ~50 people and ~200 bills, this completes in under 1ms.
- `useMemo` prevents redundant recalculation on unrelated state changes.
- Supabase queries use indexed columns (`session_id` on all child tables).
- The bundle is small (~300KB uncompressed) because there are no heavy dependencies (no UI framework, no charting library, no date library).

### Reliability Risks

- If Supabase is down, the app shows errors and is unusable. There is no offline data mode for authenticated users.
- Race conditions are possible if two devices edit the same session simultaneously — the last writer wins. For a personal-use app with one active user per session, this is acceptable.

---

## 19. Trade-offs and Design Decisions

### Decision 1: Inline styles over CSS classes

**Chosen:** JavaScript style objects from a central theme.
**Alternative:** Tailwind CSS, CSS Modules, or styled-components.
**Why chosen:** For a solo-developed app with a custom design system, inline styles with a theme object provide the fastest iteration speed. No build configuration, no class name management, trivial theming. The cost (no CSS caching, verbose code, no pseudo-class support) is acceptable at this scale.

### Decision 2: No URL routing

**Chosen:** State machine with conditional rendering.
**Alternative:** React Router.
**Why chosen:** The app has 5 distinct screens but no need for bookmarkable URLs, back/forward navigation, or deep linking. React Router would add ~20KB to the bundle and introduce navigation concepts the user never sees. The state machine is simpler to reason about.

### Decision 3: Supabase over a custom backend

**Chosen:** Supabase (hosted Postgres + PostgREST + Auth).
**Alternative:** Express.js API server + PostgreSQL.
**Why chosen:** A custom backend requires server deployment, environment management, authentication implementation, and API design. Supabase provides all of this as a service. The trade-off is vendor lock-in and less control over query behaviour. For a solo developer building a personal tool, the productivity gain is decisive.

### Decision 4: Greedy settlement algorithm

**Chosen:** Sort creditors/debtors by amount, match greedily.
**Alternative:** Optimal graph-based debt simplification (NP-hard in general).
**Why chosen:** For groups under 20 people, the greedy algorithm produces the optimal result in almost all cases. The pathological cases where it fails to find the true minimum require specific debt graphs that almost never occur in real group expenses.

### Decision 5: Collector mode as a separate calculation

**Chosen:** Star topology (everyone → collector → everyone owed).
**Alternative:** Integrate collector preference into the main settlement algorithm.
**Why chosen:** The collector feature is a workflow choice, not a mathematical one. Some groups prefer the simplicity of one designated payer even if it means more transfers. The star topology is intuitive and easy to explain: "everyone Venmoes Huy, Huy pays the rest."

---

## 20. How to Build a Simpler Clone

A learner could build a functional clone — without accounts, without Docker, without collector mode — in a weekend. Here is a practical architecture sketch:

### Scope for the Clone

- Single page, no auth, no Supabase.
- Data stored in `localStorage` only.
- 3 sections: Participants, Bills, Results.
- Same calculation engine (copy `calculator.js` verbatim — it has no dependencies).

### Tech Choices

- React 18 + Vite (same as original)
- No database — serialize state to JSON in `localStorage`
- No external dependencies except React

### Data Model (in memory)

```js
const state = {
  participants: [{ id, name }],
  bills: [{ id, title, amount, payerId, participantIds, category }]
}
```

### Step-by-Step Build Plan

**Step 1:** Set up Vite + React. Create `theme.js` with your colour palette.

**Step 2:** Copy `calculator.js` unchanged. Write a test in the browser console to verify it.

**Step 3:** Build the Participants section: a list of name cards and an "Add" button that opens a text input. Store participants in `useState`.

**Step 4:** Build the Bills section: a form with title, amount, payer dropdown (populated from participants), participant checkboxes, and a submit button. Store bills in `useState`.

**Step 5:** Build the Results section: call `calculateBalances` and `calculateSettlements`, display the output as a list.

**Step 6:** Add `localStorage` persistence: `useEffect` that writes state to `localStorage` on every change, and initialises from `localStorage` on mount.

**Step 7:** Add currency formatting using `Intl.NumberFormat`.

**Step 8:** Style with inline styles from your theme object.

This clone would be ~600 lines of code across 5 files and would correctly solve the core problem. Adding Supabase, auth, and the full UI polish of the original is a natural next step.

---

## 21. Glossary of Project-Specific Terms

**Session / Group:** A named collection of participants and bills. Represents one trip, outing, or shared expense period. Maps to the `sessions` table.

**Bill:** A single expense entry with a total amount, one payer, and a subset of participants who share it. Maps to the `bills` table plus `bill_participants`.

**Payer:** The participant who physically paid for a bill. They are credited the full bill amount in the balance calculation.

**Net balance:** Paid minus Owed for a participant. Positive = they should receive money. Negative = they owe money.

**Settlement:** A minimal list of transfers that brings all net balances to zero.

**Collector mode:** A workflow where one participant collects all payments from debtors and distributes to creditors, rather than peer-to-peer transfers.

**Payback row:** In collector mode, a transfer where the collector pays someone who has a positive net balance. Displayed with a blue amount box and dotted border.

**RLS (Row Level Security):** A Postgres feature where access policies are defined per table. Every query is filtered by the currently authenticated user's ID. No application-level code can bypass it.

**PostgREST:** A tool that automatically generates a RESTful API from a Postgres schema. Used by Supabase to expose database tables as HTTP endpoints.

**anon key:** The Supabase public credential. Identifies the project. Does not grant admin access. Safe to expose in client-side code because RLS controls actual data access.

**PWA (Progressive Web App):** A web app that can be installed to the home screen and behaves like a native app. Requires HTTPS, a manifest file, and a service worker.

**Service worker:** A background script that intercepts network requests. Used here to cache the app shell for offline resilience.

**fake-email pattern:** The practice of constructing a valid email address from a username (e.g., `alice@moneydivider.app`) to satisfy Supabase Auth's email requirement while hiding the email concept from users.

**DM Sans / DM Serif Display:** Google Fonts typefaces. "DM" stands for DeepMind; both were commissioned for legibility. Sans for UI text, Serif Display for headings and monetary figures.

**html2canvas:** A library that renders a DOM element to an HTML Canvas by inspecting computed styles. Used for the "Save as Image" feature.

**Vite:** A build tool for frontend JavaScript. Uses native ES modules for fast development and Rollup for production bundling.

**JWT (JSON Web Token):** A signed token encoding user identity. Supabase issues JWTs on login; the browser sends them as `Authorization: Bearer <token>` headers on every API call.

---

## 22. Appendix: File-Level Notes for Key Files

### `src/engine/calculator.js`

Pure functions only. No imports. Can be copied to any JavaScript environment (Node, browser, Deno) and used identically. The entire financial correctness of the app depends on this file. Functions: `calculateBalances`, `calculateSettlements`, `convertAmount`, `fmtCurrency`, `fmtVND` (legacy wrapper).

### `src/App.jsx`

The application's state machine and data owner. Contains: auth listener setup, session persistence, the `reload` callback (fetches all data for current session), the `saveSettlement` callback, guest mode API, the header JSX (logo, currency toggle, tabs, back button), and the conditional tab rendering. Approximately 250 lines. Growing this file further would be the first candidate for refactoring.

### `supabase_schema.sql`

The complete database contract. All `DROP POLICY IF EXISTS` statements before `CREATE POLICY` ensure idempotent re-execution. All tables use `CASCADE DELETE` on foreign keys pointing to `sessions`, creating a clean deletion chain. Run this once in Supabase's SQL editor; subsequent schema changes (like adding `exchange_rate`) are applied with separate `ALTER TABLE` statements.

### `src/lib/supabase.js`

```js
const url = window.__SUPABASE_URL__ || import.meta.env.VITE_SUPABASE_URL
const key = window.__SUPABASE_ANON_KEY__ || import.meta.env.VITE_SUPABASE_ANON_KEY
export const isConfigured = !!(url && key)
export const supabase = isConfigured ? createClient(url, key) : null
```

The `window.__*` globals are injected by `docker-entrypoint.sh` at container start. The `import.meta.env.*` values are injected by Vite at build time from `.env`. The `null` fallback when unconfigured means any component that calls `supabase.from(...)` will throw — this is caught by the `isConfigured` early return in `App.jsx`.

### `public/sw.js`

Implements a "network first, cache fallback" strategy. Supabase API calls (`supabase.co` domain) bypass the service worker entirely — they are never cached. All other requests (app shell, fonts, icons) are fetched from network first, falling back to cache if offline. On install, the shell (`/` and `/index.html`) is pre-cached. On activate, old cache versions are purged.

### `src/tabs/SettlementTab.jsx`

The most complex component in the codebase (~350 lines). Manages: settlement list computation (two `useMemo` calls), collector mode logic, checkbox state persistence (via `saveSettlement` prop), QR image upload, html2canvas capture, and a CSS grid layout that aligns names and arrows across all rows. The grid trick — one shared grid definition for all rows rather than one flex row per item — is the key insight for the alignment problem.

### `nginx.conf`

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

The `try_files ... /index.html` directive is essential for SPAs. Without it, a user navigating directly to a URL like `/settlements` would receive a 404 from nginx (no file at that path exists). Redirecting all unknown paths to `index.html` lets React handle routing. Since this app has no URL routing, the directive only matters for page refreshes and direct URL entry.

---

*End of lecture. This document reflects the codebase as built through the development session documented in the repository commit history. Any features added after publication may not be reflected here.*

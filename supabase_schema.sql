-- ============================================================
-- MoneyDivider – Supabase Schema
-- Run this in your Supabase project: SQL Editor → New query → Run
-- ============================================================

-- Sessions (a "trip" or "expense group")
create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  currency    text not null default 'VND',
  created_at  timestamptz default now()
);

-- Participants within a session
create table if not exists participants (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  name        text not null,
  created_at  timestamptz default now()
);

-- Bills / expenses
create table if not exists bills (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references sessions(id) on delete cascade,
  title         text not null,
  amount        numeric(14,2) not null check (amount >= 0),
  payer_id      uuid not null references participants(id) on delete restrict,
  category      text not null default 'Other',
  notes         text,
  created_at    timestamptz default now()
);

-- Which participants share a bill (many-to-many)
create table if not exists bill_participants (
  bill_id        uuid not null references bills(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  primary key (bill_id, participant_id)
);

-- Indexes for fast lookups
create index if not exists idx_participants_session on participants(session_id);
create index if not exists idx_bills_session        on bills(session_id);
create index if not exists idx_bill_participants_bill on bill_participants(bill_id);

-- Enable Row Level Security (open policies for MVP – no auth required)
alter table sessions          enable row level security;
alter table participants       enable row level security;
alter table bills              enable row level security;
alter table bill_participants  enable row level security;

create policy "allow all sessions"         on sessions         for all using (true) with check (true);
create policy "allow all participants"     on participants      for all using (true) with check (true);
create policy "allow all bills"            on bills             for all using (true) with check (true);
create policy "allow all bill_participants" on bill_participants for all using (true) with check (true);

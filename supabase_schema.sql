-- ============================================================
-- MoneyDivider – Supabase Schema (clean, run once)
-- ============================================================

-- Tables
create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  currency    text not null default 'VND',
  user_id     uuid references auth.users(id) on delete cascade,
  created_at  timestamptz default now()
);

create table if not exists participants (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  name        text not null,
  created_at  timestamptz default now()
);

create table if not exists bills (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  title       text not null,
  amount      numeric(14,2) not null check (amount >= 0),
  payer_id    uuid not null references participants(id) on delete restrict,
  category    text not null default 'Other',
  notes       text,
  created_at  timestamptz default now()
);

create table if not exists bill_participants (
  bill_id        uuid not null references bills(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  primary key (bill_id, participant_id)
);

-- Indexes
create index if not exists idx_participants_session    on participants(session_id);
create index if not exists idx_bills_session           on bills(session_id);
create index if not exists idx_bill_participants_bill  on bill_participants(bill_id);

-- Enable RLS
alter table sessions          enable row level security;
alter table participants       enable row level security;
alter table bills              enable row level security;
alter table bill_participants  enable row level security;

-- Drop any existing policies cleanly before creating
drop policy if exists "allow all sessions"             on sessions;
drop policy if exists "allow all participants"         on participants;
drop policy if exists "allow all bills"                on bills;
drop policy if exists "allow all bill_participants"    on bill_participants;
drop policy if exists "owner sessions"                 on sessions;
drop policy if exists "owner participants"             on participants;
drop policy if exists "owner bills"                    on bills;
drop policy if exists "owner bill_participants"        on bill_participants;

-- Auth-locked RLS policies
create policy "owner sessions"
  on sessions for all
  using      (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "owner participants"
  on participants for all
  using (
    session_id in (select id from sessions where user_id = auth.uid())
  )
  with check (
    session_id in (select id from sessions where user_id = auth.uid())
  );

create policy "owner bills"
  on bills for all
  using (
    session_id in (select id from sessions where user_id = auth.uid())
  )
  with check (
    session_id in (select id from sessions where user_id = auth.uid())
  );

create policy "owner bill_participants"
  on bill_participants for all
  using (
    bill_id in (
      select b.id from bills b
      join sessions s on s.id = b.session_id
      where s.user_id = auth.uid()
    )
  )
  with check (
    bill_id in (
      select b.id from bills b
      join sessions s on s.id = b.session_id
      where s.user_id = auth.uid()
    )
  );
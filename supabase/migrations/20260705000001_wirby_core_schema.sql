-- Wirby core tables. Every row is owned by a user_id -> auth.users(id) and RLS
-- restricts all access to the authenticated owner (auth.uid()).

-- ============================ lp_items ============================
create table if not exists public.lp_items (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  kind               text not null check (kind in ('subscription','bill','renewal','deadline','warranty','document')),
  title              text not null,
  vendor             text,
  amount             numeric(14,2),
  currency           text not null default 'USD',
  cadence            text not null default 'once' check (cadence in ('weekly','monthly','quarterly','yearly','once')),
  next_due           date,
  remind_days_before integer not null default 7 check (remind_days_before between 0 and 120),
  status             text not null default 'active' check (status in ('active','done','archived')),
  snoozed_until      date,
  notes              text,
  source             jsonb not null,
  confidence         jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists lp_items_user_idx on public.lp_items (user_id);
create index if not exists lp_items_user_status_idx on public.lp_items (user_id, status);

alter table public.lp_items enable row level security;

create policy "lp_items_select_own" on public.lp_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "lp_items_insert_own" on public.lp_items
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "lp_items_update_own" on public.lp_items
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "lp_items_delete_own" on public.lp_items
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ============================ lp_audit ============================
create table if not exists public.lp_audit (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  at           timestamptz not null default now(),
  actor        text not null,
  action       text not null,
  target_id    uuid,
  target_title text,
  detail       text
);
create index if not exists lp_audit_user_at_idx on public.lp_audit (user_id, at desc);

alter table public.lp_audit enable row level security;

-- Audit rows are append-only from the client: insert + read own, no update/delete.
create policy "lp_audit_select_own" on public.lp_audit
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "lp_audit_insert_own" on public.lp_audit
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- ============================ lp_prefs ============================
create table if not exists public.lp_prefs (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  due_soon_alerts   boolean not null default true,
  weekly_digest     boolean not null default true,
  default_lead_days integer not null default 7 check (default_lead_days between 0 and 120),
  email             text not null default '',
  onboarded         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.lp_prefs enable row level security;

create policy "lp_prefs_select_own" on public.lp_prefs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "lp_prefs_insert_own" on public.lp_prefs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "lp_prefs_update_own" on public.lp_prefs
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

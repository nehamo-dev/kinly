-- ─── Families ─────────────────────────────────────────────────────────────────
create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_demo boolean default false,
  created_at timestamptz default now()
);

-- ─── User <> Family membership ────────────────────────────────────────────────
create table user_families (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  family_id uuid references families(id) on delete cascade,
  role text check (role in ('manager', 'member')) default 'manager'
);

-- ─── Members ──────────────────────────────────────────────────────────────────
create table members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families(id) on delete cascade,
  name text not null,
  role text check (role in ('parent', 'child', 'caregiver')) not null,
  date_of_birth date,
  school text,
  grade text,
  avatar_color text
);

-- ─── Activities ───────────────────────────────────────────────────────────────
create table activities (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  family_id uuid references families(id) on delete cascade,
  name text not null,
  days text[],
  time_start time,
  time_end time,
  location text,
  provider_name text,
  status text check (status in ('active', 'paused')) default 'active'
);

-- ─── Occasions ────────────────────────────────────────────────────────────────
create table occasions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  type text check (type in ('birthday', 'anniversary', 'milestone', 'other')) not null,
  label text not null,
  date date not null,
  recurring boolean default true,
  remind_30 boolean default true,
  remind_7 boolean default true,
  remind_1 boolean default true
);

-- ─── Providers ────────────────────────────────────────────────────────────────
create table providers (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families(id) on delete cascade,
  name text not null,
  type text check (type in ('cleaner', 'babysitter', 'tutor', 'contractor', 'other')) not null,
  phone text,
  email text,
  notes text,
  rating integer check (rating between 1 and 5)
);

-- ─── Home services ────────────────────────────────────────────────────────────
create table home_services (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families(id) on delete cascade,
  provider_id uuid references providers(id) on delete set null,
  name text not null,
  frequency text check (frequency in ('weekly','biweekly','monthly','quarterly','annual','custom')) not null,
  custom_days integer,
  last_done date,
  next_due date
);

-- ─── Service history ──────────────────────────────────────────────────────────
create table service_history (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references home_services(id) on delete cascade,
  completed_date date not null
);

-- ─── Shopping ─────────────────────────────────────────────────────────────────
create table shopping_lists (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families(id) on delete cascade,
  name text not null
);

create table shopping_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references shopping_lists(id) on delete cascade,
  name text not null,
  quantity text,
  checked boolean default false
);

-- ─── Events ───────────────────────────────────────────────────────────────────
create table events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  service_id uuid references home_services(id) on delete set null,
  title text not null,
  date date not null,
  time_start time,
  source text check (source in ('manual','gmail','calendar')) default 'manual',
  calendar_event_id text,
  gmail_message_id text
);

-- ─── Tasks ────────────────────────────────────────────────────────────────────
create table tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families(id) on delete cascade,
  event_id uuid references events(id) on delete set null,
  title text not null,
  due_date date,
  tag text check (tag in ('kid','home','occasion','shopping','urgent','other','gmail')),
  done boolean default false,
  source text check (source in ('manual','gmail')) default 'manual'
);

-- ─── Trusted domains ──────────────────────────────────────────────────────────
create table trusted_domains (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families(id) on delete cascade,
  domain text not null,
  linked_member_id uuid references members(id) on delete set null
);

-- ─── Google OAuth connections ─────────────────────────────────────────────────
create table google_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  family_id uuid references families(id) on delete cascade,
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  calendar_connected boolean default false,
  gmail_connected boolean default false
);

-- ─── RLS: enable on all tables ────────────────────────────────────────────────
alter table families enable row level security;
alter table user_families enable row level security;
alter table members enable row level security;
alter table activities enable row level security;
alter table occasions enable row level security;
alter table providers enable row level security;
alter table home_services enable row level security;
alter table service_history enable row level security;
alter table shopping_lists enable row level security;
alter table shopping_items enable row level security;
alter table events enable row level security;
alter table tasks enable row level security;
alter table trusted_domains enable row level security;
alter table google_connections enable row level security;

-- Helper: returns the family_ids the current user belongs to
create or replace function my_family_ids()
returns setof uuid language sql security definer stable as $$
  select family_id from user_families where user_id = auth.uid()
$$;

-- ─── Families RLS ─────────────────────────────────────────────────────────────
create policy "family members can read their family" on families
  for select using (id in (select my_family_ids()));

create policy "family managers can update" on families
  for update using (
    id in (select family_id from user_families where user_id = auth.uid() and role = 'manager')
  );

-- ─── User families RLS ────────────────────────────────────────────────────────
create policy "users see their own memberships" on user_families
  for select using (user_id = auth.uid());

create policy "users can insert their own membership" on user_families
  for insert with check (user_id = auth.uid());

-- ─── Per-family table policy macro ───────────────────────────────────────────
-- Apply to: members, activities, occasions, providers, home_services,
--           service_history (via join), shopping_lists, shopping_items (via join),
--           events, tasks, trusted_domains

create policy "family access only" on members
  for all using (family_id in (select my_family_ids()));

create policy "family access only" on activities
  for all using (family_id in (select my_family_ids()));

create policy "family access only" on occasions
  for all using (family_id in (select my_family_ids()));

create policy "family access only" on providers
  for all using (family_id in (select my_family_ids()));

create policy "family access only" on home_services
  for all using (family_id in (select my_family_ids()));

create policy "family access only" on service_history
  for all using (
    service_id in (select id from home_services where family_id in (select my_family_ids()))
  );

create policy "family access only" on shopping_lists
  for all using (family_id in (select my_family_ids()));

create policy "family access only" on shopping_items
  for all using (
    list_id in (select id from shopping_lists where family_id in (select my_family_ids()))
  );

create policy "family access only" on events
  for all using (family_id in (select my_family_ids()));

create policy "family access only" on tasks
  for all using (family_id in (select my_family_ids()));

create policy "family access only" on trusted_domains
  for all using (family_id in (select my_family_ids()));

create policy "own connections only" on google_connections
  for all using (user_id = auth.uid());

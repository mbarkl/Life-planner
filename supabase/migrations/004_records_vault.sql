-- Records Vault: providers + records tables
-- Run in Supabase SQL Editor

-- Record vault categories (separate from task categories)
create table record_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text not null default '#6366f1',
  icon text,
  is_system boolean default false,
  sort_order int default 0,
  created_at timestamptz default now(),
  unique (user_id, name)
);

-- Providers (businesses, doctors, contractors)
create table providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  record_category_id uuid references record_categories(id) on delete set null,
  specialty text,
  phone text,
  address text,
  notes text,
  would_use_again boolean,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Records (individual events: procedures, repairs, visits)
create table records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  provider_id uuid references providers(id) on delete set null,
  record_category_id uuid references record_categories(id) on delete set null,
  dump_id uuid references dumps(id) on delete set null,
  title text not null,
  description text,
  service_date date not null,
  cost numeric(10, 2),
  follow_up_date date,
  follow_up_notes text,
  follow_up_completed boolean default false,
  outcome text,
  would_use_again boolean,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table record_categories enable row level security;
alter table providers enable row level security;
alter table records enable row level security;

create policy "Users see own record_categories" on record_categories for select using (auth.uid() = user_id);
create policy "Users insert own record_categories" on record_categories for insert with check (auth.uid() = user_id);
create policy "Users update own record_categories" on record_categories for update using (auth.uid() = user_id);
create policy "Users delete own record_categories" on record_categories for delete using (auth.uid() = user_id);

create policy "Users see own providers" on providers for select using (auth.uid() = user_id);
create policy "Users insert own providers" on providers for insert with check (auth.uid() = user_id);
create policy "Users update own providers" on providers for update using (auth.uid() = user_id);
create policy "Users delete own providers" on providers for delete using (auth.uid() = user_id);

create policy "Users see own records" on records for select using (auth.uid() = user_id);
create policy "Users insert own records" on records for insert with check (auth.uid() = user_id);
create policy "Users update own records" on records for update using (auth.uid() = user_id);
create policy "Users delete own records" on records for delete using (auth.uid() = user_id);

-- Indexes
create index idx_records_user_category on records(user_id, record_category_id);
create index idx_records_follow_up on records(user_id, follow_up_date) where follow_up_date is not null and follow_up_completed = false;
create index idx_records_provider on records(user_id, provider_id);
create index idx_providers_user_category on providers(user_id, record_category_id);

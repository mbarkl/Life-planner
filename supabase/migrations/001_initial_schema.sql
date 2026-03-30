-- Life Planner - Initial Schema
-- Run this in your Supabase SQL Editor

-- Categories (seeded defaults + user-created)
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text not null default '#6366f1',
  icon text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Projects (belong to a category)
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id uuid references categories(id) on delete set null,
  name text not null,
  description text,
  status text default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Brain dumps (raw input)
create table dumps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  raw_text text not null,
  processed boolean default false,
  created_at timestamptz default now()
);

-- Items (the organized output)
create table items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  dump_id uuid references dumps(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  type text not null check (type in ('task', 'idea', 'note', 'reference')),
  title text not null,
  body text,
  priority text default 'medium' check (priority in ('high', 'medium', 'low')),
  status text default 'open' check (status in ('open', 'in_progress', 'done', 'dismissed')),
  due_date date,
  suggested_date date,
  ai_confidence float,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Goals (long-term)
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id uuid references categories(id) on delete set null,
  title text not null,
  description text,
  timeframe text check (timeframe in ('weekly', 'monthly', 'quarterly', 'yearly')),
  progress int default 0 check (progress >= 0 and progress <= 100),
  status text default 'active' check (status in ('active', 'completed', 'abandoned')),
  target_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security
alter table categories enable row level security;
alter table projects enable row level security;
alter table dumps enable row level security;
alter table items enable row level security;
alter table goals enable row level security;

-- RLS policies for categories
create policy "Users see own categories" on categories for select using (auth.uid() = user_id);
create policy "Users insert own categories" on categories for insert with check (auth.uid() = user_id);
create policy "Users update own categories" on categories for update using (auth.uid() = user_id);
create policy "Users delete own categories" on categories for delete using (auth.uid() = user_id);

-- RLS policies for projects
create policy "Users see own projects" on projects for select using (auth.uid() = user_id);
create policy "Users insert own projects" on projects for insert with check (auth.uid() = user_id);
create policy "Users update own projects" on projects for update using (auth.uid() = user_id);
create policy "Users delete own projects" on projects for delete using (auth.uid() = user_id);

-- RLS policies for dumps
create policy "Users see own dumps" on dumps for select using (auth.uid() = user_id);
create policy "Users insert own dumps" on dumps for insert with check (auth.uid() = user_id);
create policy "Users update own dumps" on dumps for update using (auth.uid() = user_id);
create policy "Users delete own dumps" on dumps for delete using (auth.uid() = user_id);

-- RLS policies for items
create policy "Users see own items" on items for select using (auth.uid() = user_id);
create policy "Users insert own items" on items for insert with check (auth.uid() = user_id);
create policy "Users update own items" on items for update using (auth.uid() = user_id);
create policy "Users delete own items" on items for delete using (auth.uid() = user_id);

-- RLS policies for goals
create policy "Users see own goals" on goals for select using (auth.uid() = user_id);
create policy "Users insert own goals" on goals for insert with check (auth.uid() = user_id);
create policy "Users update own goals" on goals for update using (auth.uid() = user_id);
create policy "Users delete own goals" on goals for delete using (auth.uid() = user_id);

-- Indexes for performance
create index idx_items_user_status on items(user_id, status);
create index idx_items_user_type on items(user_id, type);
create index idx_items_suggested_date on items(user_id, suggested_date);
create index idx_projects_user_category on projects(user_id, category_id);
create index idx_goals_user_status on goals(user_id, status);

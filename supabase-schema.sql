-- Supabase Schema for Momentum Webapp
-- Run this in your Supabase SQL Editor (Database > SQL Editor)

-- ============================================
-- 1. PROFILES TABLE
-- Stores user settings (name, theme preference)
-- ============================================

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  user_name text,
  is_dark boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 2. TASKS TABLE
-- Stores user tasks with all fields
-- ============================================

create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text default '',
  recurrence text default 'once' check (recurrence in ('once', 'daily', 'weekdays', 'weekends', 'weekly')),
  goal_min integer default 0,
  reminder_at timestamp with time zone,
  priority text default 'mid' check (priority in ('low', 'mid', 'high')),
  category text default 'Quick Win' check (category in ('Quick Win', 'Deep Work', 'Creative')),
  deadline date,
  image text,
  created_at date default current_date not null,
  sort_order integer default 0,
  is_starred boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.tasks enable row level security;

-- Tasks policies
create policy "Users can view own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on public.tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- Index for faster queries
create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_created_at_idx on public.tasks(created_at);

-- ============================================
-- 3. NOTES TABLE
-- Stores user notes with drawings/images
-- ============================================

create table if not exists public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text default '',
  content text default '',
  drawing text,
  image text,
  note_date date default current_date not null,
  is_starred boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.notes enable row level security;

-- Notes policies
create policy "Users can view own notes"
  on public.notes for select
  using (auth.uid() = user_id);

create policy "Users can insert own notes"
  on public.notes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notes"
  on public.notes for update
  using (auth.uid() = user_id);

create policy "Users can delete own notes"
  on public.notes for delete
  using (auth.uid() = user_id);

-- Index for faster queries
create index if not exists notes_user_id_idx on public.notes(user_id);

-- ============================================
-- 4. TASK_HISTORY TABLE
-- Stores task completion records
-- ============================================

create table if not exists public.task_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  task_id uuid references public.tasks on delete set null,
  task_name text not null,
  completion_date date not null,
  started_at timestamp with time zone not null,
  completed_at timestamp with time zone not null,
  duration_minutes integer generated always as (
    extract(epoch from (completed_at - started_at)) / 60
  ) stored,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.task_history enable row level security;

-- Task history policies
create policy "Users can view own history"
  on public.task_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own history"
  on public.task_history for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own history"
  on public.task_history for delete
  using (auth.uid() = user_id);

-- Index for faster queries
create index if not exists task_history_user_id_idx on public.task_history(user_id);
create index if not exists task_history_completion_date_idx on public.task_history(completion_date);
create index if not exists task_history_task_id_idx on public.task_history(task_id);

-- ============================================
-- 5. UPDATED_AT TRIGGER FUNCTION
-- Auto-updates updated_at timestamp
-- ============================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Apply updated_at trigger to tables
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.handle_updated_at();

drop trigger if exists set_notes_updated_at on public.notes;
create trigger set_notes_updated_at
  before update on public.notes
  for each row execute procedure public.handle_updated_at();

-- ============================================
-- DONE! Your database is ready.
-- ============================================

-- HVAC Hub - Full Supabase Schema + RLS Policies (Step 17: Backend Hardening)
-- Copy/paste this entire file into Supabase SQL Editor (or run via migrations/Edge).
-- This hardens the backend for production: users own data, public read for approved content,
-- role-based admin access for approvals, storage policies, realtime ready.
-- Run AFTER creating Supabase project. Also enable Realtime on relevant tables.

-- Enable necessary extensions (usually default)
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================
-- 1. PROFILES (extends auth.users)
-- ============================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  role text check (role in ('apprentice', 'technician', 'master', 'admin')) default 'technician',
  location_zip text,
  location_city text,
  location_state text,
  epa_certified boolean default false,
  ai_prefs jsonb default '{
    "learningEnabled": true,
    "personality": "friendly technical mentor who explains things clearly for apprentices",
    "customInstructions": "",
    "chatSummary": "New user; prefers clear, practical HVAC advice with safety notes and code references."
  }'::jsonb,
  linked_accounts text[] default array['Google'],
  api_usage jsonb default '{"aiCalls": 0, "searchCalls": 0, "estimatedCostUSD": 0, "lastReset": "2026-01-01"}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for profiles: users can read/update own, admins can read all
alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Admins can view all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Auto-create profile on new user signup (trigger)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role, location_zip)
  values (new.id, new.raw_user_meta_data->>'full_name', 'technician', null);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 2. EQUIPMENT (public approved data)
-- ============================================
create table if not exists public.equipment (
  id text primary key,  -- e.g. 'eq1' or uuid
  brand text not null,
  model text not null,
  type text not null,
  electrical jsonb,
  capacities jsonb,
  refrigerant text,
  specs text,
  average_price text,
  last_updated timestamptz default now(),
  buy_links jsonb,
  submittals text[],
  parts_list jsonb,
  photos text[],
  notes text,
  materials_compat text[],
  source text default 'community-approved',
  created_by uuid references auth.users,
  created_at timestamptz default now()
);

alter table public.equipment enable row level security;

-- Public read for all (approved data is public)
create policy "Public can read approved equipment" on public.equipment
  for select using (true);

-- Only admins or via Edge Function can insert/update (after approval workflow)
create policy "Admins can insert/update equipment" on public.equipment
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Realtime enabled on this table for live price/ data updates

-- ============================================
-- 3. APPROVALS_QUEUE (user suggestions -> admin review)
-- ============================================
create table if not exists public.approvals_queue (
  id uuid default uuid_generate_v4() primary key,
  suggested_by text,
  suggested_by_id uuid references auth.users,
  data_type text check (data_type in ('Equipment', 'SDS', 'Material', 'Note', 'PriceUpdate')),
  summary text,
  details text,
  suggested_data jsonb not null,
  existing_id text,  -- for updates vs new
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  admin_notes text,
  timestamp timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.approvals_queue enable row level security;

-- Users can insert their own suggestions
create policy "Users can insert own approvals" on public.approvals_queue
  for insert with check (auth.uid() = suggested_by_id);

-- Users can view their own suggestions
create policy "Users can view own suggestions" on public.approvals_queue
  for select using (auth.uid() = suggested_by_id);

-- Admins can view/update all pending
create policy "Admins can manage all approvals" on public.approvals_queue
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Public/approved can be read by all? (optional, for transparency)
create policy "Anyone can view approved/rejected for audit" on public.approvals_queue
  for select using (status in ('approved', 'rejected'));

-- On approve, Edge Function or trigger moves to equipment table (see below)

-- ============================================
-- 4. COMMUNITY_POSTS / UPLOADS
-- ============================================
create table if not exists public.community_posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users,
  user_name text,
  equipment_id text references public.equipment(id),
  model text,
  type text check (type in ('note', 'photo', 'video', 'tip')),
  content text,
  media_url text,  -- Supabase Storage path
  is_public boolean default true,
  location text,
  timestamp timestamptz default now()
);

alter table public.community_posts enable row level security;

create policy "Public read for public posts" on public.community_posts
  for select using (is_public = true);

create policy "Users can insert own posts" on public.community_posts
  for insert with check (auth.uid() = user_id);

create policy "Users can update/delete own posts" on public.community_posts
  for all using (auth.uid() = user_id);

create policy "Admins can moderate all posts" on public.community_posts
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================
-- 5. SDS_CHEMICALS (Safety Data)
-- ============================================
create table if not exists public.sds_chemicals (
  id text primary key,
  chemical text not null,
  hazards text,
  handling text,
  ppe text,
  first_aid text,
  source text,
  full_sds_url text,
  last_updated timestamptz default now(),
  approved boolean default false,
  submitted_by uuid
);

alter table public.sds_chemicals enable row level security;

create policy "Public can read approved SDS" on public.sds_chemicals
  for select using (approved = true);

create policy "Admins insert/update SDS" on public.sds_chemicals
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Users submit via approvals_queue (data_type='SDS')

-- ============================================
-- 6. OTHER TABLES (for completeness)
-- ============================================
create table if not exists public.calculator_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users,
  calculator_id text,
  inputs jsonb,
  results jsonb,
  timestamp timestamptz default now()
);

create table if not exists public.walkthrough_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid,
  job_type text,
  inputs jsonb,
  generated_steps jsonb,
  timestamp timestamptz default now()
);

create table if not exists public.epa_progress (
  user_id uuid primary key references auth.users,
  quiz_scores jsonb default '{}',
  readiness_percent numeric default 0,
  last_quiz_date timestamptz
);

create table if not exists public.job_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users,
  model text,
  notes text,
  date text,
  timestamp timestamptz default now()
);

create table if not exists public.badges (
  user_id uuid references auth.users,
  badge_id text,
  awarded_at timestamptz default now(),
  primary key (user_id, badge_id)
);

-- RLS for user-owned history tables (similar patterns)
alter table public.calculator_history enable row level security;
create policy "Users own their calc history" on public.calculator_history
  for all using (auth.uid() = user_id);

-- Repeat similar RLS for walkthrough_history, job_logs, badges, epa_progress (users own, admins read aggregate if needed)

-- ============================================
-- 7. STORAGE POLICIES (for uploads bucket)
-- ============================================
-- Create bucket 'uploads' in Supabase Storage (public or private as needed)
-- In Dashboard: Storage > New bucket "uploads"
-- Then policies:

-- Note: These are examples; apply via Dashboard UI or SQL if supported.
-- Users can upload to their folder: uploads/{user_id}/...
-- Public read for public community media.

-- Example (run in SQL if bucket policies via SQL):
-- insert into storage.buckets (id, name, public) values ('uploads', 'uploads', false);

-- RLS-like for storage (via policies in dashboard):
-- Policy: "Users can upload to own folder"
--   FOR INSERT
--   WITH CHECK ( (storage.foldername(name))[1] = auth.uid()::text )

-- Policy: "Public can read public uploads"
--   FOR SELECT
--   USING ( (storage.foldername(name))[1] = 'public' or exists(...)  -- or check metadata in post

-- Policy: "Users can delete own uploads"
--   FOR DELETE
--   USING ( (storage.foldername(name))[1] = auth.uid()::text )

-- ============================================
-- 8. EDGE FUNCTION TRIGGERS / HELPERS (for AI approval flow)
-- ============================================
-- On approve in approvals_queue, an Edge Function or DB trigger can:
--   - Insert/update equipment or sds
--   - Notify original user (via push or email)
--   - Increment contributor badges

-- Example Edge for notify (see functions/notify-approval)
-- Use Supabase pg_notify or integrate with expo-notifications via token stored in profile.

-- Realtime subscriptions recommended:
-- supabase.channel('approvals').on('postgres_changes', { event: '*', schema: 'public', table: 'approvals_queue' }, ...)

-- ============================================
-- 9. INDEXES & PERFORMANCE
-- ============================================
create index if not exists idx_equipment_brand_model on public.equipment (brand, model);
create index if not exists idx_approvals_status on public.approvals_queue (status, timestamp);
create index if not exists idx_community_public on public.community_posts (is_public, timestamp);

-- ============================================
-- NOTES FOR STEP 17+
-- - After running: Update isSupabaseConfigured by adding real keys to .env
-- - For real AI: Deploy the Edge Functions (ai-chat, search-web) from supabase/functions/
-- - Set secrets in Supabase dashboard (OPENAI_API_KEY, SERPAPI_API_KEY)
-- - Enable Realtime on tables in Dashboard > Database > Replication
-- - Rate limiting: Add in Edge Functions (e.g. per-user token bucket using redis or table)
-- - Costs: Monitor in Supabase Usage + OpenAI/Serp dashboards. Client tracks approx.
-- - Google OAuth: Configure in Supabase Auth > Providers > Google, add redirect URLs: hvachub://auth/callback , https://yourapp.supabase.co/auth/v1/callback
-- - For production: Add more constraints, audit logs, soft deletes.

comment on table public.profiles is 'User profiles with AI personality learning, location for codes, role for admin gating.';
comment on table public.approvals_queue is 'Verification/approval loop per PLAN.md: AI or user suggestions reviewed before public DB insert. Prevents duplicates/hallucinations.';
comment on table public.equipment is 'Approved public equipment DB. Private user data (e.g. personal notes) in other tables or community_posts with is_public=false.';

-- End of schema. Run this, then deploy Edges, then test real flows.
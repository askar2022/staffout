-- =====================================================
-- StaffOut Database Schema
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Organizations (schools / tenants)
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  contact_email text,
  reply_to_email text,
  summary_send_time text default '08:00',
  timezone text default 'America/New_York',
  created_at timestamptz default now()
);

-- Profiles (admin users, linked to Supabase Auth)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  full_name text,
  role text default 'admin',
  created_at timestamptz default now()
);

-- Notification recipients per organization
create table if not exists notification_recipients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  email text not null,
  type text not null, -- 'all_staff', 'admin', 'reception', 'hr'
  receives_summary boolean default true,
  receives_instant boolean default true,
  created_at timestamptz default now()
);

-- Staff members directory
create table if not exists staff_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  full_name text not null,
  email text,
  position text,
  campus text,
  supervisor_name text,
  supervisor_email text,
  is_active boolean default true,
  pto_balance numeric default null,
  created_at timestamptz default now()
);

-- Absence submissions
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  staff_id uuid references staff_members(id) on delete set null,
  staff_name text not null,
  staff_email text,
  position text,
  campus text,
  supervisor_email text,
  supervisor_name text,
  status text not null check (status in ('absent', 'late', 'leaving_early', 'appointment', 'personal_day')),
  date date not null default current_date,
  end_date date default null,
  expected_arrival text,
  leave_time text,
  reason_category text check (reason_category in ('sick', 'personal', 'family', 'medical', 'other')),
  notes text,
  pto_hours_deducted numeric default null,
  lesson_plan_url text default null,
  submitted_at timestamptz default now(),
  summary_included boolean default false,
  instant_sent boolean default false
);

-- PTO deduction settings per organization
create table if not exists pto_deduction_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  status text not null,
  hours_per_day numeric not null default 0,
  created_at timestamptz default now(),
  unique(organization_id, status)
);

-- Email logs
create table if not exists email_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  type text not null check (type in ('summary', 'instant', 'supervisor')),
  sent_at timestamptz default now(),
  recipients text[],
  subject text,
  submission_id uuid references submissions(id) on delete set null,
  success boolean default true,
  error_message text
);

-- =====================================================
-- Row Level Security
-- =====================================================

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table staff_members enable row level security;
alter table submissions enable row level security;
alter table email_logs enable row level security;
alter table notification_recipients enable row level security;

-- Profiles: users can read/update own profile
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Organizations: admins can view/edit their own org
create policy "Admins can view own organization"
  on organizations for select
  using (id in (select organization_id from profiles where id = auth.uid()));

create policy "Admins can update own organization"
  on organizations for update
  using (id in (select organization_id from profiles where id = auth.uid()));

-- Staff members: admins can manage their org's staff
create policy "Admins can manage staff"
  on staff_members for all
  using (organization_id in (select organization_id from profiles where id = auth.uid()));

-- Submissions: admins can view their org's submissions; anyone can insert
create policy "Admins can view submissions"
  on submissions for select
  using (organization_id in (select organization_id from profiles where id = auth.uid()));

create policy "Anyone can submit"
  on submissions for insert with check (true);

-- Email logs: admins can view their org's logs
create policy "Admins can view email logs"
  on email_logs for all
  using (organization_id in (select organization_id from profiles where id = auth.uid()));

-- Notification recipients: admins can manage
create policy "Admins can manage recipients"
  on notification_recipients for all
  using (organization_id in (select organization_id from profiles where id = auth.uid()));

-- =====================================================
-- Handle new user signup (auto-create profile)
-- =====================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

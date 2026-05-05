alter table submissions add column if not exists decision_note text default null;
alter table submissions add column if not exists decision_last_updated_by_role text default null;

create table if not exists submission_decision_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_name text,
  actor_role text not null check (actor_role in ('supervisor', 'hr_admin')),
  action text not null check (action in ('approve_pto', 'approve_unpaid', 'deny')),
  approval_status text not null check (approval_status in ('pending', 'approved', 'denied')),
  pay_type text check (pay_type in ('pto', 'unpaid')),
  pto_hours_deducted numeric default null,
  note text,
  created_at timestamptz default now()
);

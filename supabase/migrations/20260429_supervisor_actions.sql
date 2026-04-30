alter table submissions add column if not exists requested_pay_type text default 'pto';
alter table submissions add column if not exists pay_type text default 'pto';
alter table submissions add column if not exists approval_status text default 'pending';
alter table submissions add column if not exists pto_hours_requested numeric default null;
alter table submissions add column if not exists supervisor_action_at timestamptz default null;
alter table submissions add column if not exists supervisor_action_by text default null;
alter table submissions add column if not exists supervisor_note text default null;
alter table submissions add column if not exists action_token text default null;
alter table submissions add column if not exists hr_excused boolean default false;
alter table submissions add column if not exists hr_note text default null;

create unique index if not exists submissions_action_token_idx
  on submissions(action_token)
  where action_token is not null;

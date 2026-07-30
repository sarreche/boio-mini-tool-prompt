create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null
    check (request_type in ('free_access', 'support')),
  name text not null
    check (char_length(name) between 2 and 120),
  email text not null
    check (char_length(email) between 3 and 320),
  message text not null
    check (char_length(message) between 10 and 2000),
  locale text not null default 'es'
    check (locale in ('es', 'en')),
  source text not null default 'login_contact_form'
    check (source in ('login_contact_form')),
  status text not null default 'pending'
    check (status in ('pending', 'in_review', 'approved', 'rejected', 'closed')),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  resolution_note text
    check (resolution_note is null or char_length(resolution_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint access_requests_review_consistency_check
    check (
      (status = 'pending' and reviewed_at is null and reviewed_by is null)
      or status <> 'pending'
    )
);

create index access_requests_status_created_idx
  on public.access_requests (status, created_at);

create index access_requests_email_created_idx
  on public.access_requests (lower(email), created_at desc);

create trigger access_requests_set_updated_at
  before update on public.access_requests
  for each row execute function app_private.set_updated_at();

alter table public.access_requests enable row level security;

revoke all on public.access_requests from anon, authenticated;
grant all on public.access_requests to service_role;

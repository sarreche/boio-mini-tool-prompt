create schema if not exists app_private;

revoke all on schema app_private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale text not null default 'es' check (locale in ('es', 'en')),
  timezone text not null default 'America/Montevideo',
  analytics_content_opt_out boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app_private.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin', 'root')),
  assigned_by uuid references auth.users (id) on delete set null,
  assigned_at timestamptz not null default now()
);

create index user_roles_assigned_by_idx
  on app_private.user_roles (assigned_by);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_-]*$'),
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plan_entitlements (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  capability text not null check (capability ~ '^[a-z][a-z0-9_.-]*$'),
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, capability)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete restrict,
  status text not null check (
    status in ('pending', 'active', 'past_due', 'cancelled', 'expired')
  ),
  provider text not null default 'manual' check (provider in ('manual', 'gumroad')),
  provider_subscription_id text,
  purchaser_email text,
  starts_at timestamptz,
  current_period_ends_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (provider = 'manual')
    or (provider = 'gumroad' and provider_subscription_id is not null)
  )
);

create unique index subscriptions_provider_reference_key
  on public.subscriptions (provider, provider_subscription_id)
  where provider_subscription_id is not null;
create index subscriptions_user_status_idx
  on public.subscriptions (user_id, status);
create index subscriptions_plan_id_idx
  on public.subscriptions (plan_id);

create table app_private.subscription_events (
  id bigint generated always as identity primary key,
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  from_status text,
  to_status text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index subscription_events_subscription_occurred_idx
  on app_private.subscription_events (subscription_id, occurred_at desc);
create index subscription_events_actor_idx
  on app_private.subscription_events (actor_user_id);

create table public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  capability text not null check (capability ~ '^[a-z][a-z0-9_.-]*$'),
  value jsonb not null,
  reason text,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > starts_at)
);

create index user_entitlements_user_capability_idx
  on public.user_entitlements (user_id, capability);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_-]*$'),
  is_premium boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_translations (
  task_id uuid not null references public.tasks (id) on delete cascade,
  locale text not null check (locale in ('es', 'en')),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (task_id, locale)
);

create table public.premium_trial_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  reason text,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now()
);

create index premium_trial_grants_user_idx
  on public.premium_trial_grants (user_id);
create index premium_trial_grants_task_idx
  on public.premium_trial_grants (task_id);
create index premium_trial_grants_granted_by_idx
  on public.premium_trial_grants (granted_by);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  initial_task_id uuid references public.tasks (id) on delete set null,
  title text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);
create index conversations_user_active_idx
  on public.conversations (user_id, updated_at desc)
  where archived_at is null;
create index conversations_initial_task_idx
  on public.conversations (initial_task_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant', 'tool')),
  content text not null,
  sequence_number integer not null check (sequence_number >= 0),
  created_at timestamptz not null default now(),
  unique (conversation_id, sequence_number)
);

create index messages_user_id_idx on public.messages (user_id);
create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  message_id uuid references public.messages (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  original_filename text not null,
  media_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index attachments_user_id_idx on public.attachments (user_id);
create index attachments_conversation_id_idx on public.attachments (conversation_id);
create index attachments_message_id_idx on public.attachments (message_id);

create table public.executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  task_id uuid references public.tasks (id) on delete set null,
  request_message_id uuid references public.messages (id) on delete set null,
  response_message_id uuid references public.messages (id) on delete set null,
  regeneration_of_id uuid references public.executions (id) on delete set null,
  status text not null check (status in ('pending', 'succeeded', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  error_code text,
  created_at timestamptz not null default now(),
  check (
    (status = 'pending' and completed_at is null)
    or (status in ('succeeded', 'failed') and completed_at is not null)
  )
);

create index executions_user_created_idx
  on public.executions (user_id, created_at desc);
create index executions_conversation_idx
  on public.executions (conversation_id, created_at);
create index executions_task_idx on public.executions (task_id);
create index executions_request_message_idx
  on public.executions (request_message_id);
create index executions_response_message_idx
  on public.executions (response_message_id);
create index executions_regeneration_of_idx
  on public.executions (regeneration_of_id);

create table app_private.ai_providers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app_private.ai_models (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references app_private.ai_providers (id) on delete cascade,
  code text not null,
  display_name text not null,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, code)
);

create table app_private.model_routing_rules (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references app_private.ai_models (id) on delete cascade,
  priority integer not null check (priority >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (priority)
);

create index model_routing_rules_model_idx
  on app_private.model_routing_rules (model_id);

create table public.execution_attempts (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references public.executions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider_code text not null,
  model_code text not null,
  attempt_number integer not null check (attempt_number > 0),
  status text not null check (status in ('pending', 'succeeded', 'failed')),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  error_code text,
  error_detail text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (execution_id, attempt_number),
  check (
    (status = 'pending' and completed_at is null)
    or (status in ('succeeded', 'failed') and completed_at is not null)
  )
);

create index execution_attempts_user_created_idx
  on public.execution_attempts (user_id, created_at desc);
create index execution_attempts_provider_model_idx
  on public.execution_attempts (provider_code, model_code, created_at desc);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  execution_id uuid not null references public.executions (id) on delete cascade,
  plan_id uuid references public.plans (id) on delete set null,
  event_type text not null default 'inference',
  units integer not null default 1 check (units >= 0),
  billable boolean not null default true,
  period_start date not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (execution_id, event_type)
);

create index usage_events_user_period_idx
  on public.usage_events (user_id, period_start, occurred_at);
create index usage_events_plan_period_idx
  on public.usage_events (plan_id, period_start);

create table public.premium_trial_usages (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references public.premium_trial_grants (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete restrict,
  execution_id uuid not null unique references public.executions (id) on delete cascade,
  used_at timestamptz not null default now()
);

create index premium_trial_usages_user_idx
  on public.premium_trial_usages (user_id, used_at);
create index premium_trial_usages_grant_idx
  on public.premium_trial_usages (grant_id);
create index premium_trial_usages_task_idx
  on public.premium_trial_usages (task_id);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  message_id uuid not null unique references public.messages (id) on delete cascade,
  is_helpful boolean not null,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ratings_user_created_idx
  on public.ratings (user_id, created_at desc);

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'requested' check (
    status in ('requested', 'in_progress', 'completed', 'cancelled', 'failed')
  ),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  handled_by uuid references auth.users (id) on delete set null,
  notes text
);

create unique index account_deletion_requests_open_user_key
  on public.account_deletion_requests (user_id)
  where status in ('requested', 'in_progress');
create index account_deletion_requests_user_idx
  on public.account_deletion_requests (user_id);
create index account_deletion_requests_handled_by_idx
  on public.account_deletion_requests (handled_by);

create table app_private.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  result text not null check (result in ('success', 'failure', 'denied')),
  before_data jsonb,
  after_data jsonb,
  request_id text,
  ip_address inet,
  user_agent text,
  occurred_at timestamptz not null default now()
);

create index audit_logs_actor_occurred_idx
  on app_private.audit_logs (actor_user_id, occurred_at desc);
create index audit_logs_resource_occurred_idx
  on app_private.audit_logs (resource_type, resource_id, occurred_at desc);
create index audit_logs_occurred_idx
  on app_private.audit_logs (occurred_at desc);

create function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function app_private.set_updated_at();
create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function app_private.set_updated_at();
create trigger plan_entitlements_set_updated_at
  before update on public.plan_entitlements
  for each row execute function app_private.set_updated_at();
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function app_private.set_updated_at();
create trigger user_entitlements_set_updated_at
  before update on public.user_entitlements
  for each row execute function app_private.set_updated_at();
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function app_private.set_updated_at();
create trigger task_translations_set_updated_at
  before update on public.task_translations
  for each row execute function app_private.set_updated_at();
create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function app_private.set_updated_at();
create trigger ratings_set_updated_at
  before update on public.ratings
  for each row execute function app_private.set_updated_at();
create trigger ai_providers_set_updated_at
  before update on app_private.ai_providers
  for each row execute function app_private.set_updated_at();
create trigger ai_models_set_updated_at
  before update on app_private.ai_models
  for each row execute function app_private.set_updated_at();
create trigger model_routing_rules_set_updated_at
  before update on app_private.model_routing_rules
  for each row execute function app_private.set_updated_at();

create function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  insert into app_private.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function app_private.set_updated_at() from public, anon, authenticated;
revoke all on function app_private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_user();

insert into public.profiles (id)
select id
from auth.users
on conflict (id) do nothing;

insert into app_private.user_roles (user_id, role)
select id, 'user'
from auth.users
on conflict (user_id) do nothing;

update app_private.user_roles
set role = 'root',
    assigned_at = now()
where user_id = (
  select id
  from auth.users
  where lower(email) = lower('sarreche+root@gmail.com')
);

do $$
begin
  if not exists (
    select 1
    from auth.users
    where lower(email) = lower('sarreche+root@gmail.com')
  ) then
    raise exception 'Initial root user sarreche+root@gmail.com was not found';
  end if;
end;
$$;

insert into public.plans (code, name, description)
values
  ('free', 'Free', 'Plan gratuito con límites configurables.'),
  ('paid', 'Paid', 'Plan pago con capacidades configurables.');

insert into public.plan_entitlements (plan_id, capability, value)
select id, capability, value
from public.plans
cross join (
  values
    ('monthly_uses', '{"configured": false, "limit": null}'::jsonb),
    ('premium_trials', '{"configured": false, "limit": null}'::jsonb),
    ('conversation_export', '{"enabled": false}'::jsonb),
    ('attachments', '{"enabled": false}'::jsonb)
) as defaults(capability, value)
where code = 'free';

insert into public.plan_entitlements (plan_id, capability, value)
select id, capability, value
from public.plans
cross join (
  values
    ('monthly_uses', '{"configured": false, "limit": null}'::jsonb),
    ('premium_trials', '{"configured": false, "limit": null}'::jsonb),
    ('conversation_export', '{"enabled": true}'::jsonb),
    ('attachments', '{"enabled": false}'::jsonb)
) as defaults(capability, value)
where code = 'paid';

insert into app_private.ai_providers (code, name)
values
  ('openrouter', 'OpenRouter'),
  ('huggingface', 'Hugging Face');

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_entitlements enable row level security;
alter table public.tasks enable row level security;
alter table public.task_translations enable row level security;
alter table public.premium_trial_grants enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;
alter table public.executions enable row level security;
alter table public.execution_attempts enable row level security;
alter table public.usage_events enable row level security;
alter table public.premium_trial_usages enable row level security;
alter table public.ratings enable row level security;
alter table public.account_deletion_requests enable row level security;

alter table app_private.user_roles enable row level security;
alter table app_private.subscription_events enable row level security;
alter table app_private.ai_providers enable row level security;
alter table app_private.ai_models enable row level security;
alter table app_private.model_routing_rules enable row level security;
alter table app_private.audit_logs enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, locale, timezone, analytics_content_opt_out)
  on public.profiles to authenticated;
grant select on public.plans, public.plan_entitlements to authenticated;
grant select on public.subscriptions, public.user_entitlements to authenticated;
grant select on public.tasks, public.task_translations to authenticated;
grant select on public.premium_trial_grants, public.premium_trial_usages to authenticated;
grant select, insert, update on public.conversations to authenticated;
grant select, insert on public.messages, public.attachments to authenticated;
grant select on public.executions, public.execution_attempts, public.usage_events to authenticated;
grant select, insert, update on public.ratings to authenticated;
grant select, insert on public.account_deletion_requests to authenticated;

grant usage on schema app_private to service_role;
grant all on all tables in schema app_private to service_role;
grant all on all sequences in schema app_private to service_role;
grant execute on function app_private.set_updated_at() to service_role;
grant execute on function app_private.handle_new_user() to service_role;
grant all on all tables in schema public to service_role;

create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy plans_select_active
  on public.plans for select
  to authenticated
  using (is_active);
create policy plan_entitlements_select_active
  on public.plan_entitlements for select
  to authenticated
  using (
    exists (
      select 1
      from public.plans
      where plans.id = plan_entitlements.plan_id
        and plans.is_active
    )
  );

create policy subscriptions_select_own
  on public.subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);
create policy user_entitlements_select_own
  on public.user_entitlements for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy tasks_select_active
  on public.tasks for select
  to authenticated
  using (is_active);
create policy task_translations_select_active
  on public.task_translations for select
  to authenticated
  using (
    exists (
      select 1
      from public.tasks
      where tasks.id = task_translations.task_id
        and tasks.is_active
    )
  );

create policy premium_trial_grants_select_own
  on public.premium_trial_grants for select
  to authenticated
  using ((select auth.uid()) = user_id);
create policy premium_trial_usages_select_own
  on public.premium_trial_usages for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy conversations_select_own
  on public.conversations for select
  to authenticated
  using ((select auth.uid()) = user_id);
create policy conversations_insert_own
  on public.conversations for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
create policy conversations_update_own
  on public.conversations for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy messages_select_own
  on public.messages for select
  to authenticated
  using ((select auth.uid()) = user_id);
create policy messages_insert_own
  on public.messages for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.conversations
      where conversations.id = messages.conversation_id
        and conversations.user_id = (select auth.uid())
    )
  );

create policy attachments_select_own
  on public.attachments for select
  to authenticated
  using ((select auth.uid()) = user_id);
create policy attachments_insert_own
  on public.attachments for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.conversations
      where conversations.id = attachments.conversation_id
        and conversations.user_id = (select auth.uid())
    )
    and (
      message_id is null
      or exists (
        select 1
        from public.messages
        where messages.id = attachments.message_id
          and messages.conversation_id = attachments.conversation_id
          and messages.user_id = (select auth.uid())
      )
    )
  );

create policy executions_select_own
  on public.executions for select
  to authenticated
  using ((select auth.uid()) = user_id);
create policy execution_attempts_select_own
  on public.execution_attempts for select
  to authenticated
  using ((select auth.uid()) = user_id);
create policy usage_events_select_own
  on public.usage_events for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy ratings_select_own
  on public.ratings for select
  to authenticated
  using ((select auth.uid()) = user_id);
create policy ratings_insert_own
  on public.ratings for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.messages
      where messages.id = ratings.message_id
        and messages.user_id = (select auth.uid())
        and messages.role = 'assistant'
    )
  );
create policy ratings_update_own
  on public.ratings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.messages
      where messages.id = ratings.message_id
        and messages.user_id = (select auth.uid())
        and messages.role = 'assistant'
    )
  );

create policy account_deletion_requests_select_own
  on public.account_deletion_requests for select
  to authenticated
  using ((select auth.uid()) = user_id);
create policy account_deletion_requests_insert_own
  on public.account_deletion_requests for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'requested'
    and handled_by is null
    and completed_at is null
  );

alter table app_private.ai_providers
  add column base_url text,
  add column token_env_var text;

update app_private.ai_providers
set base_url = case code
      when 'openrouter' then 'https://openrouter.ai/api/v1/chat/completions'
      when 'huggingface' then 'https://router.huggingface.co/v1/chat/completions'
    end,
    token_env_var = case code
      when 'openrouter' then 'OPENROUTER_TOKEN'
      when 'huggingface' then 'HUGGINGFACE_TOKEN'
    end
where code in ('openrouter', 'huggingface');

alter table app_private.ai_providers
  alter column base_url set not null,
  alter column token_env_var set not null,
  add constraint ai_providers_base_url_https_check
    check (base_url ~ '^https://'),
  add constraint ai_providers_token_env_var_check
    check (token_env_var ~ '^[A-Z][A-Z0-9_]*$');

alter table app_private.model_routing_rules
  drop constraint model_routing_rules_priority_key,
  add column route_code text not null default 'default',
  add constraint model_routing_rules_route_code_check
    check (route_code ~ '^[a-z][a-z0-9_-]*$'),
  add constraint model_routing_rules_route_priority_key
    unique (route_code, priority);

create index model_routing_rules_active_route_idx
  on app_private.model_routing_rules (route_code, priority)
  where is_active;

alter table public.execution_attempts
  add column model_id uuid references app_private.ai_models (id) on delete set null;

create index execution_attempts_model_id_idx
  on public.execution_attempts (model_id);

insert into app_private.ai_models (
  provider_id,
  code,
  display_name,
  metadata
)
select
  providers.id,
  models.code,
  models.display_name,
  models.metadata
from (
  values
    (
      'openrouter',
      'deepseek/deepseek-chat-v3.1:free',
      'DeepSeek Chat v3.1 (Free)',
      '{"tier":"free","type":"chat"}'::jsonb
    ),
    (
      'openrouter',
      'qwen/qwen3-coder:free',
      'Qwen3 Coder (Free)',
      '{"tier":"free","type":"chat"}'::jsonb
    ),
    (
      'openrouter',
      'openai/gpt-oss-20b:free',
      'GPT OSS 20B (Free)',
      '{"tier":"free","type":"chat"}'::jsonb
    ),
    (
      'huggingface',
      'HuggingFaceH4/zephyr-7b-beta:featherless-ai',
      'Zephyr 7B Beta',
      '{"tier":"free","type":"chat"}'::jsonb
    ),
    (
      'huggingface',
      'mistralai/Mistral-7B-Instruct-v0.2:featherless-ai',
      'Mistral 7B Instruct v0.2',
      '{"tier":"free","type":"chat"}'::jsonb
    )
) as models(provider_code, code, display_name, metadata)
join app_private.ai_providers as providers
  on providers.code = models.provider_code
on conflict (provider_id, code) do update
set display_name = excluded.display_name,
    metadata = excluded.metadata,
    is_active = true,
    updated_at = now();

insert into app_private.model_routing_rules (
  model_id,
  route_code,
  priority
)
select
  models.id,
  'default',
  route_entries.priority
from (
  values
    ('openrouter', 'deepseek/deepseek-chat-v3.1:free', 10),
    ('openrouter', 'qwen/qwen3-coder:free', 20),
    ('openrouter', 'openai/gpt-oss-20b:free', 30),
    ('huggingface', 'HuggingFaceH4/zephyr-7b-beta:featherless-ai', 40),
    ('huggingface', 'mistralai/Mistral-7B-Instruct-v0.2:featherless-ai', 50)
) as route_entries(provider_code, model_code, priority)
join app_private.ai_providers as providers
  on providers.code = route_entries.provider_code
join app_private.ai_models as models
  on models.provider_id = providers.id
 and models.code = route_entries.model_code
on conflict (route_code, priority) do update
set model_id = excluded.model_id,
    is_active = true,
    updated_at = now();

create view public.active_model_routes
with (security_invoker = true)
as
select
  routing.route_code,
  routing.priority,
  models.id as model_id,
  models.code as model_code,
  models.display_name,
  models.metadata,
  providers.code as provider_code,
  providers.base_url,
  providers.token_env_var
from app_private.model_routing_rules as routing
join app_private.ai_models as models
  on models.id = routing.model_id
join app_private.ai_providers as providers
  on providers.id = models.provider_id
where routing.is_active
  and models.is_active
  and providers.is_active;

revoke all on public.active_model_routes from public, anon, authenticated;
grant select on public.active_model_routes to service_role;

create function public.complete_inference_execution(
  p_execution_id uuid,
  p_attempt_id uuid,
  p_owner_user_id uuid,
  p_applied_plan_id uuid,
  p_attempt_duration_ms integer,
  p_attempt_input_tokens integer default null,
  p_attempt_output_tokens integer default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  affected_rows integer;
  completed_time timestamptz := now();
begin
  update public.execution_attempts
  set status = 'succeeded',
      input_tokens = p_attempt_input_tokens,
      output_tokens = p_attempt_output_tokens,
      latency_ms = p_attempt_duration_ms,
      completed_at = completed_time
  where id = p_attempt_id
    and execution_id = p_execution_id
    and user_id = p_owner_user_id
    and status = 'pending';

  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception 'Pending inference attempt was not found';
  end if;

  update public.executions
  set status = 'succeeded',
      completed_at = completed_time,
      duration_ms = greatest(
        0,
        floor(extract(epoch from (completed_time - started_at)) * 1000)::integer
      )
  where id = p_execution_id
    and user_id = p_owner_user_id
    and status = 'pending';

  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception 'Pending inference execution was not found';
  end if;

  insert into public.usage_events (
    user_id,
    execution_id,
    plan_id,
    event_type,
    units,
    billable,
    period_start
  )
  values (
    p_owner_user_id,
    p_execution_id,
    p_applied_plan_id,
    'inference',
    1,
    true,
    date_trunc('month', completed_time at time zone 'UTC')::date
  );
end;
$$;

revoke all on function public.complete_inference_execution(
  uuid,
  uuid,
  uuid,
  uuid,
  integer,
  integer,
  integer
) from public, anon, authenticated;
grant execute on function public.complete_inference_execution(
  uuid,
  uuid,
  uuid,
  uuid,
  integer,
  integer,
  integer
) to service_role;

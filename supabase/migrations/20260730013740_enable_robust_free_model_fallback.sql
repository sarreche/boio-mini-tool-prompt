-- Keep GPT OSS 20B as the preferred model and add two zero-cost OpenRouter
-- alternatives. The free router dynamically selects from currently available
-- free models, avoiding reliance on stale individual catalog entries.
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
      'openai/gpt-oss-120b:free',
      'GPT OSS 120B (Free)',
      '{"tier":"free","type":"chat"}'::jsonb
    ),
    (
      'openrouter',
      'openrouter/free',
      'OpenRouter Free Models Router',
      '{"tier":"free","type":"chat","dynamic":true}'::jsonb
    )
) as models(provider_code, code, display_name, metadata)
join app_private.ai_providers as providers
  on providers.code = models.provider_code
on conflict (provider_id, code) do update
set display_name = excluded.display_name,
    metadata = excluded.metadata,
    is_active = true,
    updated_at = now();

delete from app_private.model_routing_rules
where route_code = 'default';

insert into app_private.model_routing_rules (
  model_id,
  route_code,
  priority,
  is_active
)
select
  models.id,
  'default',
  desired.priority,
  true
from (
  values
    ('openai/gpt-oss-20b:free', 10),
    ('openai/gpt-oss-120b:free', 20),
    ('openrouter/free', 30)
) as desired(model_code, priority)
join app_private.ai_providers as providers
  on providers.code = 'openrouter'
join app_private.ai_models as models
  on models.provider_id = providers.id
 and models.code = desired.model_code
on conflict (route_code, priority) do update
set model_id = excluded.model_id,
    is_active = true,
    updated_at = now();

-- Keep the fallback catalog available, but make GPT OSS the only active model
-- for the default route until the other free endpoints are reliable again.
update app_private.model_routing_rules
set
  priority = priority + 1000000,
  is_active = false,
  updated_at = now()
where route_code = 'default';

update app_private.model_routing_rules as routing
set
  priority = desired.priority,
  is_active = desired.is_active,
  updated_at = now()
from app_private.ai_models as models
join app_private.ai_providers as providers
  on providers.id = models.provider_id
join (
  values
    ('openrouter', 'openai/gpt-oss-20b:free', 10, true),
    ('openrouter', 'deepseek/deepseek-chat-v3.1:free', 20, false),
    ('openrouter', 'qwen/qwen3-coder:free', 30, false),
    ('huggingface', 'HuggingFaceH4/zephyr-7b-beta:featherless-ai', 40, false),
    ('huggingface', 'mistralai/Mistral-7B-Instruct-v0.2:featherless-ai', 50, false)
) as desired(provider_code, model_code, priority, is_active)
  on desired.provider_code = providers.code
  and desired.model_code = models.code
where routing.route_code = 'default'
  and routing.model_id = models.id;

alter function public.update_updated_at_column() set search_path = '';
revoke all on function public.update_updated_at_column() from public, anon, authenticated;

alter table public.conversations
  add constraint conversations_id_user_key unique (id, user_id);

alter table public.messages
  add constraint messages_id_user_key unique (id, user_id),
  add constraint messages_id_conversation_user_key
    unique (id, conversation_id, user_id),
  drop constraint messages_conversation_id_fkey,
  add constraint messages_conversation_user_fkey
    foreign key (conversation_id, user_id)
    references public.conversations (id, user_id)
    on delete cascade;

alter table public.attachments
  drop constraint attachments_conversation_id_fkey,
  drop constraint attachments_message_id_fkey,
  add constraint attachments_conversation_user_fkey
    foreign key (conversation_id, user_id)
    references public.conversations (id, user_id)
    on delete cascade,
  add constraint attachments_message_conversation_user_fkey
    foreign key (message_id, conversation_id, user_id)
    references public.messages (id, conversation_id, user_id)
    on delete set null (message_id);

alter table public.executions
  add constraint executions_id_user_key unique (id, user_id),
  add constraint executions_id_user_task_key unique (id, user_id, task_id),
  drop constraint executions_conversation_id_fkey,
  drop constraint executions_request_message_id_fkey,
  drop constraint executions_response_message_id_fkey,
  drop constraint executions_regeneration_of_id_fkey,
  add constraint executions_conversation_user_fkey
    foreign key (conversation_id, user_id)
    references public.conversations (id, user_id)
    on delete set null (conversation_id),
  add constraint executions_request_message_context_fkey
    foreign key (request_message_id, conversation_id, user_id)
    references public.messages (id, conversation_id, user_id)
    on delete set null (request_message_id),
  add constraint executions_response_message_context_fkey
    foreign key (response_message_id, conversation_id, user_id)
    references public.messages (id, conversation_id, user_id)
    on delete set null (response_message_id),
  add constraint executions_regeneration_user_fkey
    foreign key (regeneration_of_id, user_id)
    references public.executions (id, user_id)
    on delete set null (regeneration_of_id),
  add constraint executions_messages_require_conversation_check
    check (
      (request_message_id is null and response_message_id is null)
      or conversation_id is not null
    );

alter table public.execution_attempts
  drop constraint execution_attempts_execution_id_fkey,
  add constraint execution_attempts_execution_user_fkey
    foreign key (execution_id, user_id)
    references public.executions (id, user_id)
    on delete cascade;

alter table public.usage_events
  drop constraint usage_events_execution_id_fkey,
  add constraint usage_events_execution_user_fkey
    foreign key (execution_id, user_id)
    references public.executions (id, user_id)
    on delete cascade;

alter table public.premium_trial_grants
  add constraint premium_trial_grants_id_user_task_key
    unique (id, user_id, task_id);

alter table public.premium_trial_usages
  drop constraint premium_trial_usages_grant_id_fkey,
  drop constraint premium_trial_usages_execution_id_fkey,
  add constraint premium_trial_usages_grant_user_task_fkey
    foreign key (grant_id, user_id, task_id)
    references public.premium_trial_grants (id, user_id, task_id)
    on delete restrict,
  add constraint premium_trial_usages_execution_user_task_fkey
    foreign key (execution_id, user_id, task_id)
    references public.executions (id, user_id, task_id)
    on delete cascade;

alter table public.ratings
  drop constraint ratings_message_id_fkey,
  add constraint ratings_message_user_fkey
    foreign key (message_id, user_id)
    references public.messages (id, user_id)
    on delete cascade;

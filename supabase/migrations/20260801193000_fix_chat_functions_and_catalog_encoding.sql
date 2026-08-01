update public.task_translations set
  name = case when name ~ '[ÃÂ]' then convert_from(convert_to(name, 'LATIN1'), 'UTF8') else name end,
  description = case when description ~ '[ÃÂ]' then convert_from(convert_to(description, 'LATIN1'), 'UTF8') else description end,
  system_prompt = case when system_prompt ~ '[ÃÂ]' then convert_from(convert_to(system_prompt, 'LATIN1'), 'UTF8') else system_prompt end,
  user_prompt_template = case when user_prompt_template ~ '[ÃÂ]' then convert_from(convert_to(user_prompt_template, 'LATIN1'), 'UTF8') else user_prompt_template end;

update public.task_category_translations set
  name = case when name ~ '[ÃÂ]' then convert_from(convert_to(name, 'LATIN1'), 'UTF8') else name end,
  description = case when description ~ '[ÃÂ]' then convert_from(convert_to(description, 'LATIN1'), 'UTF8') else description end;

create or replace function public.begin_chat_execution(
  p_owner_user_id uuid, p_conversation_id uuid, p_task_id uuid,
  p_input text, p_title text, p_client_request_id uuid, p_regeneration_of_id uuid default null
) returns table(conversation_id uuid, request_message_id uuid, execution_id uuid)
language plpgsql security invoker set search_path = '' as $$
declare v_conversation_id uuid; v_message_id uuid; v_execution_id uuid; v_sequence integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_user_id::text || ':' || p_client_request_id::text, 0)
  );
  select e.conversation_id, e.request_message_id, e.id
    into v_conversation_id, v_message_id, v_execution_id
  from public.executions e where e.user_id=p_owner_user_id and e.client_request_id=p_client_request_id;
  if found then return query select v_conversation_id, v_message_id, v_execution_id; return; end if;

  if p_regeneration_of_id is not null then
    select e.conversation_id, e.request_message_id into v_conversation_id, v_message_id
    from public.executions e
    where e.id=p_regeneration_of_id and e.user_id=p_owner_user_id
      and e.conversation_id=p_conversation_id and e.request_message_id is not null;
    if not found then raise exception 'regeneration_not_found'; end if;
  elsif p_conversation_id is null then
    insert into public.conversations(user_id, initial_task_id, title)
      values(p_owner_user_id,p_task_id,left(nullif(trim(p_title),''),120)) returning id into v_conversation_id;
  else
    select c.id into v_conversation_id from public.conversations c
      where c.id=p_conversation_id and c.user_id=p_owner_user_id and c.archived_at is null for update;
    if not found then raise exception 'conversation_not_found'; end if;
  end if;
  perform 1 from public.conversations c where c.id=v_conversation_id for update;
  if p_regeneration_of_id is null then
    select coalesce(max(m.sequence_number),-1)+1 into v_sequence
      from public.messages m where m.conversation_id=v_conversation_id;
    insert into public.messages(conversation_id,user_id,role,content,sequence_number)
      values(v_conversation_id,p_owner_user_id,'user',p_input,v_sequence) returning id into v_message_id;
  end if;
  insert into public.executions(user_id,conversation_id,task_id,request_message_id,regeneration_of_id,status,client_request_id)
    values(p_owner_user_id,v_conversation_id,p_task_id,v_message_id,p_regeneration_of_id,'pending',p_client_request_id)
    returning id into v_execution_id;
  update public.conversations c set updated_at=now() where c.id=v_conversation_id;
  return query select v_conversation_id,v_message_id,v_execution_id;
end $$;

create or replace function public.complete_chat_execution(
 p_execution_id uuid, p_attempt_id uuid, p_owner_user_id uuid, p_applied_plan_id uuid,
 p_response text, p_attempt_duration_ms integer, p_attempt_input_tokens integer, p_attempt_output_tokens integer
) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_conversation_id uuid; v_response_id uuid; v_sequence integer; v_billable boolean;
begin
 select e.conversation_id, e.regeneration_of_id is null into v_conversation_id,v_billable
 from public.executions e
 where e.id=p_execution_id and e.user_id=p_owner_user_id and e.status='pending' for update;
 if not found then raise exception 'execution_not_pending'; end if;
 perform 1 from public.conversations c where c.id=v_conversation_id and c.user_id=p_owner_user_id for update;
 select coalesce(max(m.sequence_number),-1)+1 into v_sequence
   from public.messages m where m.conversation_id=v_conversation_id;
 insert into public.messages(conversation_id,user_id,role,content,sequence_number)
  values(v_conversation_id,p_owner_user_id,'assistant',p_response,v_sequence) returning id into v_response_id;
 update public.execution_attempts a set status='succeeded',latency_ms=p_attempt_duration_ms,
  input_tokens=p_attempt_input_tokens,output_tokens=p_attempt_output_tokens,completed_at=now()
  where a.id=p_attempt_id and a.execution_id=p_execution_id and a.user_id=p_owner_user_id and a.status='pending';
 update public.executions e set status='succeeded',response_message_id=v_response_id,completed_at=now(),
  duration_ms=(extract(epoch from (now()-e.started_at))*1000)::integer
  where e.id=p_execution_id and e.user_id=p_owner_user_id;
 insert into public.usage_events(user_id,execution_id,plan_id,billable,period_start)
  values(p_owner_user_id,p_execution_id,p_applied_plan_id,v_billable,date_trunc('month',now())::date);
 update public.conversations c set updated_at=now() where c.id=v_conversation_id;
 return v_response_id;
end $$;

revoke all on function public.begin_chat_execution(uuid,uuid,uuid,text,text,uuid,uuid) from public, anon, authenticated;
revoke all on function public.complete_chat_execution(uuid,uuid,uuid,uuid,text,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.begin_chat_execution(uuid,uuid,uuid,text,text,uuid,uuid) to service_role;
grant execute on function public.complete_chat_execution(uuid,uuid,uuid,uuid,text,integer,integer,integer) to service_role;

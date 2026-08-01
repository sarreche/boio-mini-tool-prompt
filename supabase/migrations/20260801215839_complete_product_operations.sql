-- Product operations completion: entitlements, quota reservations, private files,
-- subscription history and idempotent account deletion support.

create table app_private.usage_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_request_id uuid not null,
  task_id uuid references public.tasks(id) on delete restrict,
  plan_id uuid references public.plans(id) on delete set null,
  trial_grant_id uuid references public.premium_trial_grants(id) on delete restrict,
  period_start date not null,
  status text not null default 'reserved' check (status in ('reserved','consumed')),
  expires_at timestamptz not null default now() + interval '15 minutes',
  created_at timestamptz not null default now(),
  unique(user_id, client_request_id)
);

create index usage_reservations_user_period_idx
  on app_private.usage_reservations(user_id, period_start, status);

create table app_private.deletion_operations (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null unique,
  request_id uuid,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  metrics jsonb not null default '{}'::jsonb,
  status text not null default 'prepared' check (status in ('prepared','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app_private.usage_reservations enable row level security;
alter table app_private.deletion_operations enable row level security;
revoke all on app_private.usage_reservations, app_private.deletion_operations from public, anon, authenticated;
grant all on app_private.usage_reservations, app_private.deletion_operations to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('chat-attachments','chat-attachments',false,1048576,array['text/plain','text/markdown'])
on conflict(id) do update set public=false,file_size_limit=1048576,
  allowed_mime_types=array['text/plain','text/markdown'];

-- Storage is accessed only by server routes. Ownership remains enforced again in
-- public.attachments and no browser role receives bucket policies.

create or replace function public.get_effective_product_access(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_plan public.plans%rowtype;
  v_timezone text;
  v_monthly jsonb := '{"configured":false,"limit":null}'::jsonb;
  v_trials jsonb := '{"configured":false,"limit":null}'::jsonb;
  v_attachments jsonb := '{"enabled":false}'::jsonb;
  v_export jsonb := '{"enabled":false}'::jsonb;
  v_period date;
  v_used integer;
begin
  select p.* into v_plan from public.subscriptions s join public.plans p on p.id=s.plan_id
   where s.user_id=p_user_id and s.status='active'
     and (s.current_period_ends_at is null or s.current_period_ends_at>now())
   order by s.created_at desc limit 1;
  if not found then select * into v_plan from public.plans where code='free' and is_active limit 1; end if;
  select coalesce(timezone,'UTC') into v_timezone from public.profiles where id=p_user_id;
  v_timezone := coalesce(v_timezone,'UTC');
  v_period := date_trunc('month', now() at time zone v_timezone)::date;
  v_monthly:=coalesce((select value from public.plan_entitlements where plan_id=v_plan.id and capability='monthly_uses'),v_monthly);
  v_trials:=coalesce((select value from public.plan_entitlements where plan_id=v_plan.id and capability='premium_trials'),v_trials);
  v_attachments:=coalesce((select value from public.plan_entitlements where plan_id=v_plan.id and capability='attachments'),v_attachments);
  v_export:=coalesce((select value from public.plan_entitlements where plan_id=v_plan.id and capability='conversation_export'),v_export);
  v_monthly:=coalesce((select value from public.user_entitlements where user_id=p_user_id and capability='monthly_uses' and starts_at<=now() and (expires_at is null or expires_at>now()) order by created_at desc limit 1),v_monthly);
  v_trials:=coalesce((select value from public.user_entitlements where user_id=p_user_id and capability='premium_trials' and starts_at<=now() and (expires_at is null or expires_at>now()) order by created_at desc limit 1),v_trials);
  v_attachments:=coalesce((select value from public.user_entitlements where user_id=p_user_id and capability='attachments' and starts_at<=now() and (expires_at is null or expires_at>now()) order by created_at desc limit 1),v_attachments);
  v_export:=coalesce((select value from public.user_entitlements where user_id=p_user_id and capability='conversation_export' and starts_at<=now() and (expires_at is null or expires_at>now()) order by created_at desc limit 1),v_export);
  select coalesce(sum(units),0)::integer into v_used from public.usage_events where user_id=p_user_id and billable and period_start=v_period;
  return jsonb_build_object('planId',v_plan.id,'planCode',v_plan.code,'timezone',v_timezone,'periodStart',v_period,
    'monthlyUses',v_monthly,'used',v_used,'attachments',v_attachments,'conversationExport',v_export,'premiumTrials',v_trials);
end $$;

create or replace function public.reserve_product_access(
  p_user_id uuid,p_task_id uuid,p_client_request_id uuid,p_is_regeneration boolean default false
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_access jsonb; v_task public.tasks%rowtype; v_limit integer; v_used integer; v_reserved integer; v_grant uuid; v_period date;
begin
  if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'user_not_found'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,0));
  select jsonb_build_object('allowed',true,'replayed',true,'access',public.get_effective_product_access(p_user_id)) into v_access
   from app_private.usage_reservations where user_id=p_user_id and client_request_id=p_client_request_id;
  if found then return v_access; end if;
  v_access:=public.get_effective_product_access(p_user_id); v_period:=(v_access->>'periodStart')::date;
  select * into v_task from public.tasks where id=p_task_id;
  if v_task.is_premium and v_access->>'planCode'<>'paid' then
    if not coalesce((v_access#>>'{premiumTrials,configured}')::boolean,false) then
      return jsonb_build_object('allowed',false,'code','premium_required','access',v_access);
    end if;
    select g.id into v_grant from public.premium_trial_grants g where g.user_id=p_user_id and g.task_id=p_task_id
      and (select count(*) from public.premium_trial_usages u where u.grant_id=g.id)<g.quantity
      and (select count(*) from app_private.usage_reservations r where r.trial_grant_id=g.id and r.status='reserved' and r.expires_at>now())
          +(select count(*) from public.premium_trial_usages u where u.grant_id=g.id)<g.quantity
      order by g.granted_at for update skip locked limit 1;
    if v_grant is null then return jsonb_build_object('allowed',false,'code','premium_trial_exhausted','access',v_access); end if;
  end if;
  if not p_is_regeneration and coalesce((v_access#>>'{monthlyUses,configured}')::boolean,false) then
    v_limit:=(v_access#>>'{monthlyUses,limit}')::integer; v_used:=coalesce((v_access->>'used')::integer,0);
    select count(*) into v_reserved from app_private.usage_reservations where user_id=p_user_id and period_start=v_period and status='reserved' and expires_at>now();
    if v_limit is not null and v_used+v_reserved>=v_limit then return jsonb_build_object('allowed',false,'code','monthly_limit_reached','access',v_access); end if;
  end if;
  insert into app_private.usage_reservations(user_id,client_request_id,task_id,plan_id,trial_grant_id,period_start)
  values(p_user_id,p_client_request_id,p_task_id,(v_access->>'planId')::uuid,v_grant,v_period);
  return jsonb_build_object('allowed',true,'code','allowed','access',v_access);
end $$;

create or replace function public.consume_product_reservation(p_execution_id uuid,p_user_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_res app_private.usage_reservations%rowtype;
begin
 select r.* into v_res from app_private.usage_reservations r join public.executions e
   on e.user_id=r.user_id and e.client_request_id=r.client_request_id
   where e.id=p_execution_id and e.user_id=p_user_id for update;
 if not found then return; end if;
 update app_private.usage_reservations set status='consumed' where id=v_res.id;
 if v_res.trial_grant_id is not null then
  insert into public.premium_trial_usages(grant_id,user_id,task_id,execution_id)
  values(v_res.trial_grant_id,p_user_id,v_res.task_id,p_execution_id) on conflict(execution_id) do nothing;
 end if;
end $$;

create or replace function public.release_product_reservation(p_execution_id uuid,p_user_id uuid)
returns void language sql security definer set search_path='' as $$
 delete from app_private.usage_reservations r using public.executions e
 where e.id=p_execution_id and e.user_id=p_user_id and r.user_id=e.user_id
   and r.client_request_id=e.client_request_id and r.status='reserved';
$$;

create or replace function public.record_subscription_change(
 p_actor_user_id uuid,p_subscription_id uuid,p_values jsonb,p_request_id text,p_ip inet,p_user_agent text
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_role text; v_before jsonb; v_after jsonb; v_id uuid:=p_subscription_id;
begin
 select role into v_role from app_private.user_roles where user_id=p_actor_user_id;
 if v_role not in ('admin','root') then
  insert into app_private.audit_logs(actor_user_id,action,resource_type,resource_id,result,request_id,ip_address,user_agent)
  values(p_actor_user_id,'subscription.save','subscription',p_subscription_id::text,'denied',p_request_id,p_ip,p_user_agent);
  raise exception 'admin_required';
 end if;
 if p_subscription_id is not null then select to_jsonb(s) into v_before from public.subscriptions s where id=p_subscription_id for update; end if;
 if v_id is null then
  insert into public.subscriptions(user_id,plan_id,status,provider,provider_subscription_id,purchaser_email,starts_at,current_period_ends_at)
  values((p_values->>'user_id')::uuid,(p_values->>'plan_id')::uuid,p_values->>'status',p_values->>'provider',nullif(p_values->>'provider_subscription_id',''),nullif(p_values->>'purchaser_email',''),nullif(p_values->>'starts_at','')::timestamptz,nullif(p_values->>'current_period_ends_at','')::timestamptz)
  returning id into v_id;
 else
  update public.subscriptions set plan_id=(p_values->>'plan_id')::uuid,status=p_values->>'status',provider=p_values->>'provider',
   provider_subscription_id=nullif(p_values->>'provider_subscription_id',''),purchaser_email=nullif(p_values->>'purchaser_email',''),
   starts_at=nullif(p_values->>'starts_at','')::timestamptz,current_period_ends_at=nullif(p_values->>'current_period_ends_at','')::timestamptz where id=v_id;
 end if;
 select to_jsonb(s) into v_after from public.subscriptions s where id=v_id;
 insert into app_private.subscription_events(subscription_id,event_type,from_status,to_status,metadata,actor_user_id)
 values(v_id,case when v_before is null then 'created' else 'updated' end,v_before->>'status',v_after->>'status',
  jsonb_build_object('provider',v_after->>'provider','plan_id',v_after->>'plan_id'),p_actor_user_id);
 insert into app_private.audit_logs(actor_user_id,action,resource_type,resource_id,result,before_data,after_data,request_id,ip_address,user_agent)
 values(p_actor_user_id,'subscription.save','subscription',v_id::text,'success',v_before-'purchaser_email',v_after-'purchaser_email',p_request_id,p_ip,p_user_agent);
 return v_id;
end $$;

create or replace function public.revoke_user_sessions(p_actor_user_id uuid,p_target_user_id uuid,p_request_id text,p_ip inet,p_user_agent text)
returns void language plpgsql security definer set search_path='' as $$
declare v_role text;
begin
 select role into v_role from app_private.user_roles where user_id=p_actor_user_id;
 if v_role not in ('admin','root') then raise exception 'admin_required'; end if;
 delete from auth.sessions where user_id=p_target_user_id;
 insert into app_private.audit_logs(actor_user_id,action,resource_type,resource_id,result,request_id,ip_address,user_agent)
 values(p_actor_user_id,'user.sessions.revoke','user',p_target_user_id::text,'success',p_request_id,p_ip,p_user_agent);
end $$;

create or replace function public.grant_premium_trials(
 p_actor_user_id uuid,p_user_id uuid,p_task_id uuid,p_quantity integer,p_reason text,p_request_id text,p_ip inet,p_user_agent text
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_role text; v_id uuid; v_limit integer; v_total integer;
begin
 select role into v_role from app_private.user_roles where user_id=p_actor_user_id;
 if v_role not in ('admin','root') then raise exception 'admin_required'; end if;
 if p_quantity<=0 then raise exception 'invalid_quantity'; end if;
 select (pe.value->>'limit')::integer into v_limit from public.plans p join public.plan_entitlements pe on pe.plan_id=p.id and pe.capability='premium_trials' where p.code='free' and coalesce((pe.value->>'configured')::boolean,false);
 if v_limit is null then raise exception 'premium_trials_not_configured'; end if;
 select coalesce(sum(quantity),0) into v_total from public.premium_trial_grants where user_id=p_user_id;
 if v_total+p_quantity>v_limit then raise exception 'premium_trial_limit_exceeded'; end if;
 insert into public.premium_trial_grants(user_id,task_id,quantity,reason,granted_by) values(p_user_id,p_task_id,p_quantity,nullif(trim(p_reason),''),p_actor_user_id) returning id into v_id;
 insert into app_private.audit_logs(actor_user_id,action,resource_type,resource_id,result,after_data,request_id,ip_address,user_agent)
 values(p_actor_user_id,'premium_trial.grant','premium_trial_grant',v_id::text,'success',jsonb_build_object('user_id',p_user_id,'task_id',p_task_id,'quantity',p_quantity),p_request_id,p_ip,p_user_agent);
 return v_id;
end $$;

-- Paid defaults. Commercial quantities deliberately remain unconfigured.
update public.plan_entitlements pe set value='{"enabled":true}'::jsonb
from public.plans p where p.id=pe.plan_id and p.code='paid' and pe.capability='attachments';

create or replace function public.complete_chat_execution(
 p_execution_id uuid,p_attempt_id uuid,p_owner_user_id uuid,p_applied_plan_id uuid,
 p_response text,p_attempt_duration_ms integer,p_attempt_input_tokens integer,p_attempt_output_tokens integer
) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_conversation_id uuid;v_response_id uuid;v_sequence integer;v_billable boolean;v_period date;
begin
 select conversation_id,regeneration_of_id is null into v_conversation_id,v_billable from public.executions where id=p_execution_id and user_id=p_owner_user_id and status='pending' for update;
 if not found then raise exception 'execution_not_pending';end if;
 perform 1 from public.conversations where id=v_conversation_id and user_id=p_owner_user_id for update;
 select coalesce(max(sequence_number),-1)+1 into v_sequence from public.messages where conversation_id=v_conversation_id;
 insert into public.messages(conversation_id,user_id,role,content,sequence_number) values(v_conversation_id,p_owner_user_id,'assistant',p_response,v_sequence) returning id into v_response_id;
 update public.execution_attempts set status='succeeded',latency_ms=p_attempt_duration_ms,input_tokens=p_attempt_input_tokens,output_tokens=p_attempt_output_tokens,completed_at=now() where id=p_attempt_id and execution_id=p_execution_id and user_id=p_owner_user_id and status='pending';
 update public.executions set status='succeeded',response_message_id=v_response_id,completed_at=now(),duration_ms=(extract(epoch from(now()-started_at))*1000)::integer where id=p_execution_id and user_id=p_owner_user_id;
 select r.period_start into v_period from app_private.usage_reservations r join public.executions e on e.user_id=r.user_id and e.client_request_id=r.client_request_id where e.id=p_execution_id;
 insert into public.usage_events(user_id,execution_id,plan_id,billable,period_start) values(p_owner_user_id,p_execution_id,p_applied_plan_id,v_billable,coalesce(v_period,date_trunc('month',now())::date));
 perform public.consume_product_reservation(p_execution_id,p_owner_user_id);
 update public.conversations set updated_at=now() where id=v_conversation_id;
 return v_response_id;
end $$;

create or replace function public.fail_chat_execution(p_execution_id uuid,p_owner_user_id uuid,p_error_code text)
returns void language plpgsql security invoker set search_path='' as $$
begin
 update public.executions set status='failed',completed_at=now(),duration_ms=(extract(epoch from(now()-started_at))*1000)::integer,error_code=p_error_code where id=p_execution_id and user_id=p_owner_user_id and status='pending';
 perform public.release_product_reservation(p_execution_id,p_owner_user_id);
end $$;

revoke all on function public.get_effective_product_access(uuid) from public,anon,authenticated;
revoke all on function public.reserve_product_access(uuid,uuid,uuid,boolean) from public,anon,authenticated;
revoke all on function public.consume_product_reservation(uuid,uuid) from public,anon,authenticated;
revoke all on function public.release_product_reservation(uuid,uuid) from public,anon,authenticated;
revoke all on function public.record_subscription_change(uuid,uuid,jsonb,text,inet,text) from public,anon,authenticated;
revoke all on function public.grant_premium_trials(uuid,uuid,uuid,integer,text,text,inet,text) from public,anon,authenticated;
revoke all on function public.revoke_user_sessions(uuid,uuid,text,inet,text) from public,anon,authenticated;
grant execute on function public.get_effective_product_access(uuid) to service_role;
grant execute on function public.reserve_product_access(uuid,uuid,uuid,boolean) to service_role;
grant execute on function public.consume_product_reservation(uuid,uuid) to service_role;
grant execute on function public.release_product_reservation(uuid,uuid) to service_role;
grant execute on function public.record_subscription_change(uuid,uuid,jsonb,text,inet,text) to service_role;
grant execute on function public.grant_premium_trials(uuid,uuid,uuid,integer,text,text,inet,text) to service_role;
grant execute on function public.revoke_user_sessions(uuid,uuid,text,inet,text) to service_role;

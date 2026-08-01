create or replace function public.admin_mutate_entity(
 p_actor_user_id uuid,p_entity text,p_id uuid,p_values jsonb,p_request_id text,p_ip inet,p_user_agent text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_role text;v_before jsonb;v_after jsonb;v_id uuid:=p_id;v_action text:=p_entity||'.save';
begin
 select role into v_role from app_private.user_roles where user_id=p_actor_user_id;
 if v_role not in('admin','root') then
  insert into app_private.audit_logs(actor_user_id,action,resource_type,resource_id,result,request_id,ip_address,user_agent) values(p_actor_user_id,v_action,p_entity,p_id::text,'denied',p_request_id,p_ip,p_user_agent);
  return jsonb_build_object('ok',false,'code','admin_required');
 end if;
 case p_entity
 when 'profile' then
  select to_jsonb(p) into v_before from public.profiles p where id=p_id for update;
  update public.profiles set display_name=nullif(p_values->>'display_name',''),locale=p_values->>'locale',timezone=p_values->>'timezone' where id=p_id returning to_jsonb(profiles) into v_after;
 when 'access_request' then
  select to_jsonb(r) into v_before from public.access_requests r where id=p_id for update;
  update public.access_requests set status=p_values->>'status',resolution_note=nullif(p_values->>'resolution_note',''),reviewed_by=p_actor_user_id,reviewed_at=now() where id=p_id returning to_jsonb(access_requests) into v_after;
 when 'plan_entitlement' then
  select to_jsonb(e) into v_before from public.plan_entitlements e where plan_id=p_id and capability=p_values->>'capability' for update;
  insert into public.plan_entitlements(plan_id,capability,value) values(p_id,p_values->>'capability',p_values->'value') on conflict(plan_id,capability) do update set value=excluded.value returning to_jsonb(plan_entitlements) into v_after;
 when 'user_entitlement' then
  insert into public.user_entitlements(user_id,capability,value,reason,expires_at) values((p_values->>'user_id')::uuid,p_values->>'capability',p_values->'value',nullif(p_values->>'reason',''),nullif(p_values->>'expires_at','')::timestamptz) returning id,to_jsonb(user_entitlements) into v_id,v_after;
 when 'task' then
  select to_jsonb(t) into v_before from public.tasks t where id=p_id for update;
  update public.tasks set is_active=(p_values->>'is_active')::boolean,is_premium=(p_values->>'is_premium')::boolean,sort_order=(p_values->>'sort_order')::integer where id=p_id returning to_jsonb(tasks) into v_after;
 when 'task_translation' then
  select to_jsonb(t) into v_before from public.task_translations t where task_id=p_id and locale=p_values->>'locale' for update;
  insert into public.task_translations(task_id,locale,name,description,user_prompt_template,system_prompt) values(p_id,p_values->>'locale',p_values->>'name',nullif(p_values->>'description',''),p_values->>'user_prompt_template',p_values->>'system_prompt') on conflict(task_id,locale) do update set name=excluded.name,description=excluded.description,user_prompt_template=excluded.user_prompt_template,system_prompt=excluded.system_prompt,prompt_version=public.task_translations.prompt_version+1 returning to_jsonb(task_translations) into v_after;
 when 'plan' then
  if p_id is null then insert into public.plans(code,name,description,is_active) values(p_values->>'code',p_values->>'name',nullif(p_values->>'description',''),coalesce((p_values->>'is_active')::boolean,true)) returning id,to_jsonb(plans) into v_id,v_after;
  else select to_jsonb(p) into v_before from public.plans p where id=p_id for update;update public.plans set name=p_values->>'name',description=nullif(p_values->>'description',''),is_active=(p_values->>'is_active')::boolean where id=p_id returning to_jsonb(plans) into v_after;end if;
 when 'category' then
  if p_id is null then insert into public.task_categories(code,sort_order,is_active) values(p_values->>'code',(p_values->>'sort_order')::integer,coalesce((p_values->>'is_active')::boolean,true)) returning id,to_jsonb(task_categories) into v_id,v_after;
  else select to_jsonb(c) into v_before from public.task_categories c where id=p_id for update;update public.task_categories set sort_order=(p_values->>'sort_order')::integer,is_active=(p_values->>'is_active')::boolean where id=p_id returning to_jsonb(task_categories) into v_after;end if;
 when 'provider' then
  if p_id is null then insert into app_private.ai_providers(code,name,is_active) values(p_values->>'code',p_values->>'name',coalesce((p_values->>'is_active')::boolean,true)) returning id,to_jsonb(ai_providers) into v_id,v_after;
  else select to_jsonb(p) into v_before from app_private.ai_providers p where id=p_id for update;update app_private.ai_providers set name=p_values->>'name',is_active=(p_values->>'is_active')::boolean,updated_at=now() where id=p_id returning to_jsonb(ai_providers) into v_after;end if;
 when 'model' then
  if p_id is null then insert into app_private.ai_models(provider_id,code,display_name,is_active) values((p_values->>'provider_id')::uuid,p_values->>'code',p_values->>'display_name',coalesce((p_values->>'is_active')::boolean,true)) returning id,to_jsonb(ai_models) into v_id,v_after;
  else select to_jsonb(m) into v_before from app_private.ai_models m where id=p_id for update;update app_private.ai_models set display_name=p_values->>'display_name',is_active=(p_values->>'is_active')::boolean,updated_at=now() where id=p_id returning to_jsonb(ai_models) into v_after;end if;
 else return jsonb_build_object('ok',false,'code','unsupported_entity');
 end case;
 insert into app_private.audit_logs(actor_user_id,action,resource_type,resource_id,result,before_data,after_data,request_id,ip_address,user_agent)
 values(p_actor_user_id,v_action,p_entity,v_id::text,'success',v_before-'system_prompt'-'user_prompt_template',v_after-'system_prompt'-'user_prompt_template',p_request_id,p_ip,p_user_agent);
 return jsonb_build_object('ok',true,'id',v_id);
exception when others then
 raise;
end $$;

revoke all on function public.admin_mutate_entity(uuid,text,uuid,jsonb,text,inet,text) from public,anon,authenticated;
grant execute on function public.admin_mutate_entity(uuid,text,uuid,jsonb,text,inet,text) to service_role;

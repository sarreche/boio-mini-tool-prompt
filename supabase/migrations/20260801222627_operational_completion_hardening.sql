create or replace function public.prepare_user_deletion(p_actor_user_id uuid,p_target_user_id uuid,p_request_id text,p_ip inet,p_user_agent text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_role text;v_target_role text;v_operation uuid;v_metrics jsonb;
begin
 select role into v_role from app_private.user_roles where user_id=p_actor_user_id;
 if v_role<>'root' or p_actor_user_id=p_target_user_id then raise exception 'root_required';end if;
 select role into v_target_role from app_private.user_roles where user_id=p_target_user_id for update;
 if v_target_role='root' and (select count(*) from app_private.user_roles where role='root')<=1 then raise exception 'last_root';end if;
 select id into v_operation from app_private.deletion_operations where target_user_id=p_target_user_id for update;
 if found then return v_operation;end if;
 v_metrics:=jsonb_build_object(
  'executions',(select count(*) from public.executions where user_id=p_target_user_id),
  'uses',(select coalesce(sum(units),0) from public.usage_events where user_id=p_target_user_id),
  'input_tokens',(select coalesce(sum(input_tokens),0) from public.execution_attempts where user_id=p_target_user_id),
  'output_tokens',(select coalesce(sum(output_tokens),0) from public.execution_attempts where user_id=p_target_user_id)
 );
 insert into app_private.deletion_operations(target_user_id,request_id,actor_user_id,metrics)
 values(p_target_user_id,(select id from public.account_deletion_requests where user_id=p_target_user_id and status in('requested','in_progress') order by requested_at limit 1),p_actor_user_id,v_metrics) returning id into v_operation;
 insert into app_private.user_access_controls(user_id,suspended_at,suspension_reason,suspended_by)
 values(p_target_user_id,now(),'permanent_deletion',p_actor_user_id) on conflict(user_id) do update set suspended_at=now(),suspension_reason='permanent_deletion',suspended_by=p_actor_user_id,updated_at=now();
 update public.account_deletion_requests set status='in_progress',handled_by=p_actor_user_id where user_id=p_target_user_id and status='requested';
 delete from auth.sessions where user_id=p_target_user_id;
 return v_operation;
end $$;

create or replace function public.finalize_user_deletion(p_actor_user_id uuid,p_operation_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_operation app_private.deletion_operations%rowtype;v_item record;
begin
 select * into v_operation from app_private.deletion_operations where id=p_operation_id and actor_user_id=p_actor_user_id for update;
 if not found then raise exception 'deletion_operation_not_found';end if;
 for v_item in select key,value from jsonb_each_text(v_operation.metrics) loop
  insert into app_private.anonymous_daily_metrics(metric_date,metric_key,dimension,value) values(current_date,v_item.key,'all',v_item.value::numeric)
  on conflict(metric_date,metric_key,dimension) do update set value=app_private.anonymous_daily_metrics.value+excluded.value;
 end loop;
 delete from app_private.deletion_operations where id=p_operation_id;
 insert into app_private.audit_logs(actor_user_id,action,resource_type,result,after_data)
 values(p_actor_user_id,'user.delete','user','success',jsonb_build_object('anonymous_metrics_preserved',true));
end $$;

create or replace function public.fail_user_deletion(p_actor_user_id uuid,p_operation_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 update app_private.deletion_operations set status='failed',updated_at=now() where id=p_operation_id and actor_user_id=p_actor_user_id;
 insert into app_private.audit_logs(actor_user_id,action,resource_type,result) values(p_actor_user_id,'user.delete','user','failure');
end $$;

revoke all on function public.prepare_user_deletion(uuid,uuid,text,inet,text) from public,anon,authenticated;
revoke all on function public.finalize_user_deletion(uuid,uuid) from public,anon,authenticated;
revoke all on function public.fail_user_deletion(uuid,uuid) from public,anon,authenticated;
grant execute on function public.prepare_user_deletion(uuid,uuid,text,inet,text) to service_role;
grant execute on function public.finalize_user_deletion(uuid,uuid) to service_role;
grant execute on function public.fail_user_deletion(uuid,uuid) to service_role;

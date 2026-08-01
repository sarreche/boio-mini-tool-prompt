-- Integrated admin/root panel. Private authorization data remains outside the Data API.

create table app_private.user_access_controls (
  user_id uuid primary key references auth.users (id) on delete cascade,
  suspended_at timestamptz,
  suspended_by uuid references auth.users (id) on delete set null,
  suspension_reason text,
  updated_at timestamptz not null default now(),
  check (suspended_at is not null or (suspended_by is null and suspension_reason is null))
);

create table app_private.operational_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_.-]*$'),
  value jsonb not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into app_private.operational_settings (key, value)
values
  ('alerts.model_failure', '{"rate": 0.10, "minimum_attempts": 20, "window_hours": 24}'::jsonb),
  ('alerts.pending_request', '{"age_hours": 24}'::jsonb);

create table app_private.anonymous_daily_metrics (
  metric_date date not null,
  metric_key text not null,
  dimension jsonb not null default '{}'::jsonb,
  value bigint not null default 0,
  primary key (metric_date, metric_key, dimension)
);

create or replace function public.get_admin_context(p_actor_user_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when r.role in ('admin','root') then jsonb_build_object(
    'userId', r.user_id, 'role', r.role,
    'suspended', a.suspended_at is not null
  ) else null end
  from app_private.user_roles r
  left join app_private.user_access_controls a on a.user_id = r.user_id
  where r.user_id = p_actor_user_id;
$$;

create or replace function public.set_user_access(
  p_actor_user_id uuid, p_target_user_id uuid, p_suspended boolean, p_reason text,
  p_request_id text default null, p_ip inet default null, p_user_agent text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare v_role text; v_target_role text; v_before jsonb; v_after jsonb;
begin
  select role into v_role from app_private.user_roles where user_id = p_actor_user_id;
  select role into v_target_role from app_private.user_roles where user_id = p_target_user_id;
  if v_role not in ('admin','root') or (v_target_role = 'root' and v_role <> 'root') or p_actor_user_id = p_target_user_id then
    insert into app_private.audit_logs(actor_user_id,action,resource_type,resource_id,result,request_id,ip_address,user_agent)
    values(p_actor_user_id,'user.access.update','user',p_target_user_id::text,'denied',p_request_id,p_ip,p_user_agent);
    raise exception 'not authorized';
  end if;
  select to_jsonb(a) into v_before from app_private.user_access_controls a where user_id = p_target_user_id;
  insert into app_private.user_access_controls(user_id,suspended_at,suspended_by,suspension_reason)
  values(p_target_user_id,case when p_suspended then now() end,case when p_suspended then p_actor_user_id end,case when p_suspended then nullif(trim(p_reason),'') end)
  on conflict(user_id) do update set suspended_at=excluded.suspended_at,suspended_by=excluded.suspended_by,suspension_reason=excluded.suspension_reason;
  select to_jsonb(a) into v_after from app_private.user_access_controls a where user_id = p_target_user_id;
  insert into app_private.audit_logs(actor_user_id,action,resource_type,resource_id,result,before_data,after_data,request_id,ip_address,user_agent)
  values(p_actor_user_id,'user.access.update','user',p_target_user_id::text,'success',v_before,v_after,p_request_id,p_ip,p_user_agent);
end; $$;

create or replace function public.set_user_role(
  p_actor_user_id uuid, p_target_user_id uuid, p_role text,
  p_request_id text default null, p_ip inet default null, p_user_agent text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare v_actor_role text; v_old_role text; v_roots integer;
begin
  select role into v_actor_role from app_private.user_roles where user_id=p_actor_user_id;
  select role into v_old_role from app_private.user_roles where user_id=p_target_user_id for update;
  select count(*) into v_roots from app_private.user_roles where role='root';
  if v_actor_role <> 'root' or p_role not in ('user','admin','root') or p_actor_user_id=p_target_user_id or (v_old_role='root' and v_roots<=1) then
    insert into app_private.audit_logs(actor_user_id,action,resource_type,resource_id,result,request_id,ip_address,user_agent)
    values(p_actor_user_id,'user.role.update','user',p_target_user_id::text,'denied',p_request_id,p_ip,p_user_agent);
    raise exception 'not authorized';
  end if;
  update app_private.user_roles set role=p_role,assigned_by=p_actor_user_id,assigned_at=now() where user_id=p_target_user_id;
  insert into app_private.audit_logs(actor_user_id,action,resource_type,resource_id,result,before_data,after_data,request_id,ip_address,user_agent)
  values(p_actor_user_id,'user.role.update','user',p_target_user_id::text,'success',jsonb_build_object('role',v_old_role),jsonb_build_object('role',p_role),p_request_id,p_ip,p_user_agent);
end; $$;

create or replace function public.write_admin_audit(
  p_actor_user_id uuid, p_action text, p_resource_type text, p_resource_id text,
  p_result text, p_before jsonb default null, p_after jsonb default null,
  p_request_id text default null, p_ip inet default null, p_user_agent text default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from app_private.user_roles where user_id=p_actor_user_id and role in ('admin','root')) then raise exception 'not authorized'; end if;
  insert into app_private.audit_logs(actor_user_id,action,resource_type,resource_id,result,before_data,after_data,request_id,ip_address,user_agent)
  values(p_actor_user_id,p_action,p_resource_type,p_resource_id,p_result,p_before,p_after,p_request_id,p_ip,p_user_agent);
end; $$;

create or replace function public.get_admin_private_data(p_actor_user_id uuid, p_kind text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_role text;
begin
  select role into v_role from app_private.user_roles where user_id=p_actor_user_id;
  if v_role not in ('admin','root') then raise exception 'not authorized'; end if;
  if p_kind='roles' then return coalesce((select jsonb_agg(to_jsonb(r)) from app_private.user_roles r),'[]'::jsonb); end if;
  if p_kind='access' then return coalesce((select jsonb_agg(to_jsonb(a)) from app_private.user_access_controls a),'[]'::jsonb); end if;
  if p_kind='models' then return jsonb_build_object(
    'providers',coalesce((select jsonb_agg(to_jsonb(p) order by p.name) from app_private.ai_providers p),'[]'::jsonb),
    'models',coalesce((select jsonb_agg(to_jsonb(m) order by m.display_name) from app_private.ai_models m),'[]'::jsonb),
    'routes',coalesce((select jsonb_agg(to_jsonb(r) order by r.route_code,r.priority) from app_private.model_routing_rules r),'[]'::jsonb)); end if;
  if p_kind='settings' and v_role='root' then return coalesce((select jsonb_object_agg(s.key,s.value) from app_private.operational_settings s),'{}'::jsonb); end if;
  if p_kind='audit' then return coalesce((select jsonb_agg(to_jsonb(a) order by a.occurred_at desc) from (select * from app_private.audit_logs l where v_role='root' or l.actor_user_id=p_actor_user_id order by occurred_at desc limit 250) a),'[]'::jsonb); end if;
  raise exception 'not authorized';
end; $$;

revoke all on function public.get_admin_context(uuid) from public, anon, authenticated;
revoke all on function public.set_user_access(uuid,uuid,boolean,text,text,inet,text) from public, anon, authenticated;
revoke all on function public.set_user_role(uuid,uuid,text,text,inet,text) from public, anon, authenticated;
revoke all on function public.write_admin_audit(uuid,text,text,text,text,jsonb,jsonb,text,inet,text) from public, anon, authenticated;
revoke all on function public.get_admin_private_data(uuid,text) from public, anon, authenticated;
grant execute on function public.get_admin_context(uuid) to service_role;
grant execute on function public.set_user_access(uuid,uuid,boolean,text,text,inet,text) to service_role;
grant execute on function public.set_user_role(uuid,uuid,text,text,inet,text) to service_role;
grant execute on function public.write_admin_audit(uuid,text,text,text,text,jsonb,jsonb,text,inet,text) to service_role;
grant execute on function public.get_admin_private_data(uuid,text) to service_role;

create or replace function public.get_user_access_status(p_user_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('suspended', coalesce(a.suspended_at is not null, false))
  from (select p_user_id as user_id) u
  left join app_private.user_access_controls a on a.user_id=u.user_id;
$$;

create or replace function public.update_model_route(
  p_actor_user_id uuid, p_rule_id uuid, p_active boolean, p_priority integer,
  p_request_id text default null, p_ip inet default null, p_user_agent text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare v_role text; v_route text; v_before jsonb;
begin
  select role into v_role from app_private.user_roles where user_id=p_actor_user_id;
  if v_role not in ('admin','root') then raise exception 'not authorized'; end if;
  select route_code,to_jsonb(r) into v_route,v_before from app_private.model_routing_rules r where id=p_rule_id for update;
  if not p_active and not exists(select 1 from app_private.model_routing_rules where route_code=v_route and is_active and id<>p_rule_id) then raise exception 'route must keep one active model'; end if;
  update app_private.model_routing_rules set is_active=p_active,priority=p_priority where id=p_rule_id;
  insert into app_private.audit_logs(actor_user_id,action,resource_type,resource_id,result,before_data,after_data,request_id,ip_address,user_agent)
  values(p_actor_user_id,'model.route.update','model_route',p_rule_id::text,'success',v_before,jsonb_build_object('is_active',p_active,'priority',p_priority),p_request_id,p_ip,p_user_agent);
end; $$;

create or replace function public.update_operational_setting(
  p_actor_user_id uuid, p_key text, p_value jsonb,
  p_request_id text default null, p_ip inet default null, p_user_agent text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare v_before jsonb;
begin
  if not exists(select 1 from app_private.user_roles where user_id=p_actor_user_id and role='root') then raise exception 'not authorized'; end if;
  select value into v_before from app_private.operational_settings where key=p_key for update;
  insert into app_private.operational_settings(key,value,updated_by) values(p_key,p_value,p_actor_user_id)
  on conflict(key) do update set value=excluded.value,updated_by=excluded.updated_by,updated_at=now();
  insert into app_private.audit_logs(actor_user_id,action,resource_type,resource_id,result,before_data,after_data,request_id,ip_address,user_agent)
  values(p_actor_user_id,'setting.update','setting',p_key,'success',v_before,p_value,p_request_id,p_ip,p_user_agent);
end; $$;

create or replace function public.consolidate_user_metrics_for_deletion(p_actor_user_id uuid, p_target_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_actor_user_id=p_target_user_id or not exists(select 1 from app_private.user_roles where user_id=p_actor_user_id and role='root') then raise exception 'not authorized'; end if;
  insert into app_private.anonymous_daily_metrics(metric_date,metric_key,dimension,value)
  select e.created_at::date,'deleted_user.executions',jsonb_build_object('status',e.status),count(*)
  from public.executions e where e.user_id=p_target_user_id group by e.created_at::date,e.status
  on conflict(metric_date,metric_key,dimension) do update set value=app_private.anonymous_daily_metrics.value+excluded.value;
  insert into app_private.audit_logs(actor_user_id,action,resource_type,result,after_data)
  values(p_actor_user_id,'user.delete.consolidate','user','success',jsonb_build_object('anonymous_metrics',true));
end; $$;

revoke all on function public.get_user_access_status(uuid) from public,anon,authenticated;
revoke all on function public.update_model_route(uuid,uuid,boolean,integer,text,inet,text) from public,anon,authenticated;
revoke all on function public.update_operational_setting(uuid,text,jsonb,text,inet,text) from public,anon,authenticated;
revoke all on function public.consolidate_user_metrics_for_deletion(uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_user_access_status(uuid) to service_role;
grant execute on function public.update_model_route(uuid,uuid,boolean,integer,text,inet,text) to service_role;
grant execute on function public.update_operational_setting(uuid,text,jsonb,text,inet,text) to service_role;
grant execute on function public.consolidate_user_metrics_for_deletion(uuid,uuid) to service_role;

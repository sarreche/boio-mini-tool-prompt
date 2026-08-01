create or replace function public.get_anonymous_dashboard_metrics(p_actor_user_id uuid,p_start date,p_end date)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_role text;
begin select role into v_role from app_private.user_roles where user_id=p_actor_user_id;if v_role not in('admin','root')then return '{}'::jsonb;end if;return coalesce((select jsonb_object_agg(metric_key,total)from(select metric_key,sum(value)total from app_private.anonymous_daily_metrics where metric_date between p_start and p_end group by metric_key)s),'{}'::jsonb);end $$;
revoke all on function public.get_anonymous_dashboard_metrics(uuid,date,date)from public,anon,authenticated;
grant execute on function public.get_anonymous_dashboard_metrics(uuid,date,date)to service_role;

create or replace function public.admin_create_task(p_actor_user_id uuid,p_code text,p_category_id uuid,p_sort_order integer,p_request_id text,p_ip inet,p_user_agent text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_role text;v_id uuid;
begin select role into v_role from app_private.user_roles where user_id=p_actor_user_id;if v_role not in('admin','root')then raise exception 'admin_required';end if;
insert into public.tasks(code,category_id,sort_order,is_active,is_premium)values(p_code,p_category_id,greatest(p_sort_order,0),false,false)returning id into v_id;
insert into app_private.audit_logs(actor_user_id,action,resource_type,resource_id,result,after_data,request_id,ip_address,user_agent)values(p_actor_user_id,'task.create','task',v_id::text,'success',jsonb_build_object('code',p_code,'category_id',p_category_id,'sort_order',p_sort_order),p_request_id,p_ip,p_user_agent);return v_id;end $$;
create or replace function public.admin_save_category_translation(p_actor_user_id uuid,p_category_id uuid,p_locale text,p_name text,p_description text,p_request_id text,p_ip inet,p_user_agent text)
returns void language plpgsql security definer set search_path='' as $$
declare v_role text;v_before jsonb;v_after jsonb;
begin select role into v_role from app_private.user_roles where user_id=p_actor_user_id;if v_role not in('admin','root')then raise exception 'admin_required';end if;select to_jsonb(t)into v_before from public.task_category_translations t where category_id=p_category_id and locale=p_locale for update;insert into public.task_category_translations(category_id,locale,name,description)values(p_category_id,p_locale,p_name,nullif(p_description,''))on conflict(category_id,locale)do update set name=excluded.name,description=excluded.description returning to_jsonb(task_category_translations)into v_after;insert into app_private.audit_logs(actor_user_id,action,resource_type,resource_id,result,before_data,after_data,request_id,ip_address,user_agent)values(p_actor_user_id,'category.translation.save','category',p_category_id::text,'success',v_before,v_after,p_request_id,p_ip,p_user_agent);end $$;
revoke all on function public.admin_create_task(uuid,text,uuid,integer,text,inet,text)from public,anon,authenticated;
revoke all on function public.admin_save_category_translation(uuid,uuid,text,text,text,text,inet,text)from public,anon,authenticated;
grant execute on function public.admin_create_task(uuid,text,uuid,integer,text,inet,text)to service_role;
grant execute on function public.admin_save_category_translation(uuid,uuid,text,text,text,text,inet,text)to service_role;

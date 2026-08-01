create table public.task_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_-]*$'),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_category_translations (
  category_id uuid not null references public.task_categories (id) on delete cascade,
  locale text not null check (locale in ('es', 'en')),
  name text not null,
  description text,
  primary key (category_id, locale)
);

alter table public.tasks
  add column category_id uuid references public.task_categories (id) on delete set null;
create index tasks_category_sort_idx on public.tasks (category_id, sort_order) where is_active;

alter table public.task_translations
  add column system_prompt text not null default '',
  add column user_prompt_template text not null default '{{input}}',
  add column prompt_version integer not null default 1 check (prompt_version > 0);

alter table public.executions
  add column client_request_id uuid;
create unique index executions_user_client_request_key
  on public.executions (user_id, client_request_id)
  where client_request_id is not null;

alter table public.task_categories enable row level security;
alter table public.task_category_translations enable row level security;

revoke all on public.task_categories, public.task_category_translations from anon, authenticated;
grant select on public.task_categories, public.task_category_translations to authenticated;
grant all on public.task_categories, public.task_category_translations to service_role;

create policy task_categories_select_active on public.task_categories
  for select to authenticated using (is_active);
create policy task_category_translations_select_active on public.task_category_translations
  for select to authenticated using (
    exists (select 1 from public.task_categories c where c.id = category_id and c.is_active)
  );

insert into public.task_categories (code, sort_order) values
  ('understand_summarize', 10), ('write_reply', 20), ('create_organize', 30)
on conflict (code) do update set sort_order = excluded.sort_order, is_active = true;

insert into public.task_category_translations (category_id, locale, name, description)
select c.id, v.locale, v.name, v.description
from public.task_categories c
join (values
  ('understand_summarize','es','Entender y resumir','Transformá información en claridad.'),
  ('understand_summarize','en','Understand and summarize','Turn information into clarity.'),
  ('write_reply','es','Escribir y responder','Mejorá tus textos y comunicaciones.'),
  ('write_reply','en','Write and respond','Improve your writing and communications.'),
  ('create_organize','es','Crear y organizar','Generá ideas y poné en orden tus planes.'),
  ('create_organize','en','Create and organize','Generate ideas and organize your plans.')
) v(code, locale, name, description) on v.code = c.code
on conflict (category_id, locale) do update set name=excluded.name, description=excluded.description;

insert into public.tasks (code, category_id, sort_order)
select v.code, c.id, v.sort_order
from (values
 ('explain_simple','understand_summarize',10),('summarize','understand_summarize',20),
 ('translate','understand_summarize',30),('quick_guide','understand_summarize',40),
 ('improve_writing','write_reply',10),('brief_email','write_reply',20),
 ('polite_reply','write_reply',30),('one_minute_speech','write_reply',40),
 ('creative_ideas','create_organize',10),('short_story','create_organize',20),
 ('checklist','create_organize',30),('cook_with','create_organize',40)
) v(code, category_code, sort_order)
join public.task_categories c on c.code=v.category_code
on conflict (code) do update set category_id=excluded.category_id, sort_order=excluded.sort_order, is_active=true;

insert into public.task_translations
  (task_id, locale, name, description, system_prompt, user_prompt_template, prompt_version)
select t.id, v.locale, v.name, v.description, v.system_prompt, v.template, 1
from public.tasks t
join (values
 ('explain_simple','es','Explicar simple','Entendé un tema con palabras simples.','Sos un asistente claro y práctico en español.','Explica esto como si tuviera 10 años:\n\n{{input}}'),
 ('explain_simple','en','Explain simply','Understand a topic in simple words.','You are a clear and practical assistant. Respond in English.','Explain this like I am 10 years old:\n\n{{input}}'),
 ('summarize','es','Resumir','Obtené lo esencial en cinco puntos.','Sos un asistente claro y práctico en español.','Resume en 5 puntos:\n\n{{input}}'),
 ('summarize','en','Summarize','Get the essentials in five points.','You are a clear and practical assistant. Respond in English.','Summarize in 5 points:\n\n{{input}}'),
 ('translate','es','Traducir a inglés','Traducí de forma clara y natural.','Sos un asistente claro y práctico en español.','Traduce al inglés:\n\n{{input}}'),
 ('translate','en','Translate to Spanish','Translate clearly and naturally.','You are a clear and practical assistant. Respond in English.','Translate to Spanish:\n\n{{input}}'),
 ('quick_guide','es','Guía rápida','Conseguí pasos breves y prácticos.','Sos un asistente claro y práctico en español.','Dame una guía rápida para:\n\n{{input}}'),
 ('quick_guide','en','Quick guide','Get short, practical steps.','You are a clear and practical assistant. Respond in English.','Give me a quick guide for:\n\n{{input}}'),
 ('improve_writing','es','Mejorar redacción','Hacé tu texto más claro y correcto.','Sos un asistente claro y práctico en español.','Reescribe de forma clara y neutral:\n\n{{input}}'),
 ('improve_writing','en','Improve writing','Make your text clearer and correct.','You are a clear and practical assistant. Respond in English.','Rewrite this clearly and neutrally:\n\n{{input}}'),
 ('brief_email','es','Correo breve','Redactá un correo claro y profesional.','Sos un asistente claro y práctico en español.','Redacta un email corto y profesional sobre:\n\n{{input}}'),
 ('brief_email','en','Brief email','Write a clear professional email.','You are a clear and practical assistant. Respond in English.','Write a short professional email about:\n\n{{input}}'),
 ('polite_reply','es','WhatsApp amable','Respondé con el tono adecuado.','Sos un asistente claro y práctico en español.','Ayudame a contestar un mensaje de WhatsApp de manera amable:\n\n{{input}}'),
 ('polite_reply','en','Polite reply','Reply with the right tone.','You are a clear and practical assistant. Respond in English.','Help me reply politely to a WhatsApp message:\n\n{{input}}'),
 ('one_minute_speech','es','Speech de 1 minuto','Prepará una presentación breve.','Sos un asistente claro y práctico en español.','Ayúdame a preparar un speech de 1 minuto para presentar:\n\n{{input}}'),
 ('one_minute_speech','en','1-minute speech','Prepare a short presentation.','You are a clear and practical assistant. Respond in English.','Help me prepare a 1-minute speech about:\n\n{{input}}'),
 ('creative_ideas','es','Ideas creativas','Explorá nuevas ideas y soluciones.','Sos un asistente claro y práctico en español.','Dame 10 ideas creativas sobre:\n\n{{input}}'),
 ('creative_ideas','en','Creative ideas','Explore new ideas and solutions.','You are a clear and practical assistant. Respond in English.','Give me 10 creative ideas about:\n\n{{input}}'),
 ('short_story','es','Cuentos cortos','Creá una historia breve.','Sos un asistente claro y práctico en español.','Inventa un cuento corto para contar a un niño de [edad]:\n\n{{input}}'),
 ('short_story','en','Short story','Create a brief story.','You are a clear and practical assistant. Respond in English.','Make up a short story for a child of [age]:\n\n{{input}}'),
 ('checklist','es','Checklist','Armá una lista para no olvidar nada.','Sos un asistente claro y práctico en español.','Dame un checklist de cosas a considerar para:\n\n{{input}}'),
 ('checklist','en','Checklist','Make a list so nothing is forgotten.','You are a clear and practical assistant. Respond in English.','Give me a checklist of things to consider for:\n\n{{input}}'),
 ('cook_with','es','Cocinar con...','Usá los ingredientes que ya tenés.','Sos un asistente claro y práctico en español.','Decime qué puedo cocinar con estos ingredientes:\n\n{{input}}'),
 ('cook_with','en','Cook with...','Use the ingredients you already have.','You are a clear and practical assistant. Respond in English.','Tell me what I can cook with these ingredients:\n\n{{input}}')
) v(code, locale, name, description, system_prompt, template) on v.code=t.code
on conflict (task_id, locale) do update set
 name=excluded.name, description=excluded.description, system_prompt=excluded.system_prompt,
 user_prompt_template=excluded.user_prompt_template, prompt_version=excluded.prompt_version;

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
    select e.conversation_id, e.request_message_id
      into v_conversation_id, v_message_id
    from public.executions e
    where e.id=p_regeneration_of_id and e.user_id=p_owner_user_id
      and e.conversation_id=p_conversation_id and e.request_message_id is not null;
    if not found then raise exception 'regeneration_not_found'; end if;
  elsif p_conversation_id is null then
    insert into public.conversations(user_id, initial_task_id, title)
      values(p_owner_user_id,p_task_id,left(nullif(trim(p_title),''),120)) returning id into v_conversation_id;
  else
    select id into v_conversation_id from public.conversations
      where id=p_conversation_id and user_id=p_owner_user_id and archived_at is null for update;
    if not found then raise exception 'conversation_not_found'; end if;
  end if;
  perform 1 from public.conversations where id=v_conversation_id for update;
  if p_regeneration_of_id is null then
    select coalesce(max(sequence_number),-1)+1 into v_sequence from public.messages where conversation_id=v_conversation_id;
    insert into public.messages(conversation_id,user_id,role,content,sequence_number)
      values(v_conversation_id,p_owner_user_id,'user',p_input,v_sequence) returning id into v_message_id;
  end if;
  insert into public.executions(user_id,conversation_id,task_id,request_message_id,regeneration_of_id,status,client_request_id)
    values(p_owner_user_id,v_conversation_id,p_task_id,v_message_id,p_regeneration_of_id,'pending',p_client_request_id)
    returning id into v_execution_id;
  update public.conversations set updated_at=now() where id=v_conversation_id;
  return query select v_conversation_id,v_message_id,v_execution_id;
end $$;

create or replace function public.complete_chat_execution(
 p_execution_id uuid, p_attempt_id uuid, p_owner_user_id uuid, p_applied_plan_id uuid,
 p_response text, p_attempt_duration_ms integer, p_attempt_input_tokens integer, p_attempt_output_tokens integer
) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_conversation_id uuid; v_response_id uuid; v_sequence integer; v_billable boolean;
begin
 select conversation_id, regeneration_of_id is null into v_conversation_id,v_billable from public.executions
  where id=p_execution_id and user_id=p_owner_user_id and status='pending' for update;
 if not found then raise exception 'execution_not_pending'; end if;
 perform 1 from public.conversations where id=v_conversation_id and user_id=p_owner_user_id for update;
 select coalesce(max(sequence_number),-1)+1 into v_sequence from public.messages where conversation_id=v_conversation_id;
 insert into public.messages(conversation_id,user_id,role,content,sequence_number)
  values(v_conversation_id,p_owner_user_id,'assistant',p_response,v_sequence) returning id into v_response_id;
 update public.execution_attempts set status='succeeded',latency_ms=p_attempt_duration_ms,
  input_tokens=p_attempt_input_tokens,output_tokens=p_attempt_output_tokens,completed_at=now()
  where id=p_attempt_id and execution_id=p_execution_id and user_id=p_owner_user_id and status='pending';
 update public.executions set status='succeeded',response_message_id=v_response_id,completed_at=now(),
  duration_ms=(extract(epoch from (now()-started_at))*1000)::integer
  where id=p_execution_id and user_id=p_owner_user_id;
 insert into public.usage_events(user_id,execution_id,plan_id,billable,period_start)
  values(p_owner_user_id,p_execution_id,p_applied_plan_id,v_billable,date_trunc('month',now())::date);
 update public.conversations set updated_at=now() where id=v_conversation_id;
 return v_response_id;
end $$;

create or replace function public.fail_chat_execution(p_execution_id uuid,p_owner_user_id uuid,p_error_code text)
returns void language sql security invoker set search_path='' as $$
 update public.executions set status='failed',completed_at=now(),
 duration_ms=(extract(epoch from (now()-started_at))*1000)::integer,error_code=p_error_code
 where id=p_execution_id and user_id=p_owner_user_id and status='pending';
$$;

revoke all on function public.begin_chat_execution(uuid,uuid,uuid,text,text,uuid,uuid) from public, anon, authenticated;
revoke all on function public.complete_chat_execution(uuid,uuid,uuid,uuid,text,integer,integer,integer) from public, anon, authenticated;
revoke all on function public.fail_chat_execution(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.begin_chat_execution(uuid,uuid,uuid,text,text,uuid,uuid) to service_role;
grant execute on function public.complete_chat_execution(uuid,uuid,uuid,uuid,text,integer,integer,integer) to service_role;
grant execute on function public.fail_chat_execution(uuid,uuid,text) to service_role;

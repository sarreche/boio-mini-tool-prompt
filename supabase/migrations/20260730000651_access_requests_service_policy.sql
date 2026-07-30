create policy access_requests_service_role_all
  on public.access_requests
  for all
  to service_role
  using (true)
  with check (true);

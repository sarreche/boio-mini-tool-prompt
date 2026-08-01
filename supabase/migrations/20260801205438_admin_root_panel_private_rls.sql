alter table app_private.user_access_controls enable row level security;
alter table app_private.operational_settings enable row level security;
alter table app_private.anonymous_daily_metrics enable row level security;

revoke all on app_private.user_access_controls,
  app_private.operational_settings,
  app_private.anonymous_daily_metrics
from public, anon, authenticated;

grant all on app_private.user_access_controls,
  app_private.operational_settings,
  app_private.anonymous_daily_metrics
to service_role;

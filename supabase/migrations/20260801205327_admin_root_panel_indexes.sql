create index user_access_controls_suspended_by_idx
  on app_private.user_access_controls (suspended_by)
  where suspended_by is not null;

create index operational_settings_updated_by_idx
  on app_private.operational_settings (updated_by)
  where updated_by is not null;

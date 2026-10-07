alter table app.workspace_intelligence_modules
  drop constraint if exists workspace_intelligence_modules_module_key_check;

alter table app.workspace_intelligence_modules
  add constraint workspace_intelligence_modules_module_key_check
  check (
    module_key in (
      'history',
      'rosie-competitive',
      'devil-supplier',
      'movie-metadata',
      'scheduled-jobs',
      'source-policy',
      'business-integrations'
    )
  );

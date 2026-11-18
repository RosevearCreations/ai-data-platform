create table if not exists app.master_build420_accessibility_device_network_evidence (
  evidence_id text primary key,
  app_id text not null check (app_id in ('ai-data-platform','rosevear-ai-hub','rosevear-comms-hub','icamp','yw','devilndove','rosiedazzlers')),
  dimension text not null check (dimension in (
    'DESKTOP','TABLET','MOBILE','KEYBOARD_FOCUS','CONTRAST_FORCED_COLORS',
    'REDUCED_MOTION','LOADING_ERROR_STATES','OFFLINE_DEGRADED_NETWORK','RECOVERY_BEHAVIOR'
  )),
  state text not null check (state in ('PASS','PARTIAL','FAILED')),
  acceptance_percent numeric(5,2) not null check (acceptance_percent between 0 and 100),
  critical_failure_count integer not null check (critical_failure_count>=0),
  test_run_count integer not null check (test_run_count>0),
  viewport_observed_width_px integer not null default 0 check (viewport_observed_width_px>=0),
  touch_target_min_px integer not null default 0 check (touch_target_min_px>=0),
  critical_horizontal_overflow boolean not null default false,
  keyboard_only_workflow_complete boolean not null default false,
  visible_focus_verified boolean not null default false,
  screen_reader_semantics_verified boolean not null default false,
  forced_colors_verified boolean not null default false,
  contrast_aa_verified boolean not null default false,
  reduced_motion_verified boolean not null default false,
  loading_state_verified boolean not null default false,
  empty_state_verified boolean not null default false,
  error_state_verified boolean not null default false,
  retry_safe boolean not null default false,
  offline_behavior_verified boolean not null default false,
  degraded_network_verified boolean not null default false,
  recovery_preserves_data boolean not null default false,
  no_duplicate_effects boolean not null default false,
  evidence_digest text not null check (evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  source_owned boolean not null,
  synthetic_evidence boolean not null,
  owner_reviewed boolean not null,
  independently_verified boolean not null,
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  recorded_at timestamptz not null default now(),
  check (expires_at>observed_at),
  check (state='PASS' or acceptance_percent<90 or critical_failure_count>0),
  check (not synthetic_evidence),
  check (
    dimension not in ('DESKTOP','TABLET','MOBILE') or not critical_horizontal_overflow
  ),
  check (
    dimension<>'DESKTOP' or viewport_observed_width_px>=1024
  ),
  check (
    dimension<>'TABLET' or (viewport_observed_width_px>=768 and viewport_observed_width_px<1024)
  ),
  check (
    dimension<>'MOBILE' or (
      viewport_observed_width_px>=320 and viewport_observed_width_px<768 and touch_target_min_px>=44
    )
  ),
  check (
    dimension<>'KEYBOARD_FOCUS' or (
      keyboard_only_workflow_complete and visible_focus_verified and screen_reader_semantics_verified
    )
  ),
  check (
    dimension<>'CONTRAST_FORCED_COLORS' or (forced_colors_verified and contrast_aa_verified)
  ),
  check (dimension<>'REDUCED_MOTION' or reduced_motion_verified),
  check (
    dimension<>'LOADING_ERROR_STATES' or (
      loading_state_verified and empty_state_verified and error_state_verified and retry_safe
    )
  ),
  check (
    dimension<>'OFFLINE_DEGRADED_NETWORK' or (
      offline_behavior_verified and degraded_network_verified and retry_safe and no_duplicate_effects
    )
  ),
  check (
    dimension<>'RECOVERY_BEHAVIOR' or (
      recovery_preserves_data and retry_safe and no_duplicate_effects
    )
  )
);

create index if not exists master_b420_app_dimension_idx
 on app.master_build420_accessibility_device_network_evidence(app_id,dimension,observed_at desc);

alter table app.master_build420_accessibility_device_network_evidence enable row level security;
alter table app.master_build420_accessibility_device_network_evidence force row level security;

create policy master_b420_runtime_select on app.master_build420_accessibility_device_network_evidence
 for select to ai_data_runtime using (app.current_master_sysop_role() in ('owner','operator'));
create policy master_b420_protected_select on app.master_build420_accessibility_device_network_evidence
 for select to ai_data_protected_runtime using (true);
create policy master_b420_protected_insert on app.master_build420_accessibility_device_network_evidence
 for insert to ai_data_protected_runtime with check (
   source_owned and not synthetic_evidence and owner_reviewed and independently_verified
 );

grant select on app.master_build420_accessibility_device_network_evidence to ai_data_runtime;
grant select,insert on app.master_build420_accessibility_device_network_evidence to ai_data_protected_runtime;
revoke insert,update,delete on app.master_build420_accessibility_device_network_evidence from ai_data_runtime;
revoke update,delete on app.master_build420_accessibility_device_network_evidence from ai_data_protected_runtime;

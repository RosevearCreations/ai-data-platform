-- Build 333 — Route Performance, Core Web Vitals & Rendering Diagnostics
-- Extends the existing append-only RUM vocabulary with one bounded app-specific
-- hydration-ready timing. No raw URL, DOM, form, customer or credential data is added.

alter table app.experience_telemetry_events
  drop constraint if exists experience_telemetry_events_metric_key_check;

alter table app.experience_telemetry_events
  add constraint experience_telemetry_events_metric_key_check
  check (
    metric_key in (
      'navigation_load_ms',
      'fcp_ms',
      'lcp_ms',
      'cls_score',
      'inp_ms',
      'hydration_ready_ms',
      'route_transition_ms',
      'long_task_ms'
    )
  );

alter table app.experience_telemetry_events
  drop constraint if exists experience_telemetry_events_sample_kind_check;

alter table app.experience_telemetry_events
  add constraint experience_telemetry_events_sample_kind_check
  check (
    sample_kind in (
      'navigation',
      'paint',
      'layout',
      'interaction',
      'hydration',
      'route-transition',
      'long-task'
    )
  );

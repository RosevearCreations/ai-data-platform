alter table app.production_learning_cycle_snapshots
  add column if not exists observation_context text not null default 'legacy';

alter table app.production_learning_cycle_snapshots
  drop constraint if exists production_learning_cycle_snapshots_cycle_key_check;

alter table app.production_learning_cycle_snapshots
  add constraint production_learning_cycle_snapshots_cycle_key_check
  check (cycle_key in ('build-036','build-038'));

alter table app.production_learning_cycle_snapshots
  drop constraint if exists production_learning_cycle_snapshots_observation_context_check;

alter table app.production_learning_cycle_snapshots
  add constraint production_learning_cycle_snapshots_observation_context_check
  check (observation_context in ('legacy','build-038-runtime'));

create index if not exists production_learning_cycle_snapshots_cycle_idx
  on app.production_learning_cycle_snapshots(
    workspace_id,cycle_key,observation_context,generated_at desc
  );

export type RetentionClassKey =
  | "sync-payloads"
  | "intelligence-modules"
  | "barcode-terminal"
  | "remote-terminal"
  | "intelligence-audit"
  | "remote-provider-audit"
  | "connector-audit"
  | "operational-outcomes"
  | "production-learning-snapshots"
  | "integration-delivery-audit"
  | "retention-control-audit";

export type RetentionDisposition =
  | "manual-archive"
  | "bounded-delete"
  | "retain-protected"
  | "bounded-in-place";

export interface RetentionClassDefinition {
  key: RetentionClassKey;
  label: string;
  budgetBytes: number;
  retentionDays: number | null;
  disposition: RetentionDisposition;
  protectedEvidence: boolean;
  description: string;
}

export const RETENTION_CLASSES: readonly RetentionClassDefinition[] = [
  {
    key: "sync-payloads",
    label: "Synchronized payloads",
    budgetBytes: 8 * 1024 * 1024,
    retentionDays: 180,
    disposition: "manual-archive",
    protectedEvidence: false,
    description:
      "Active payloads remain available; old tombstones are previewed for manual archive rather than silently deleted."
  },
  {
    key: "intelligence-modules",
    label: "Intelligence modules",
    budgetBytes: 8 * 1024 * 1024,
    retentionDays: null,
    disposition: "bounded-in-place",
    protectedEvidence: false,
    description:
      "Current module snapshots stay bounded by their schema-level retention limits."
  },
  {
    key: "barcode-terminal",
    label: "Reviewed barcode intake",
    budgetBytes: 4 * 1024 * 1024,
    retentionDays: 90,
    disposition: "bounded-delete",
    protectedEvidence: false,
    description:
      "Only approved/rejected captures older than 90 days are eligible; pending captures are never auto-cleaned."
  },
  {
    key: "remote-terminal",
    label: "Terminal remote jobs/results",
    budgetBytes: 8 * 1024 * 1024,
    retentionDays: 30,
    disposition: "bounded-delete",
    protectedEvidence: false,
    description:
      "Only terminal jobs older than 30 days are eligible; associated result payloads are deleted by the job foreign-key cascade."
  },
  {
    key: "intelligence-audit",
    label: "Intelligence approval audit",
    budgetBytes: 4 * 1024 * 1024,
    retentionDays: null,
    disposition: "retain-protected",
    protectedEvidence: true,
    description: "Append-only approval/export audit is excluded from Build 034 destructive cleanup."
  },
  {
    key: "remote-provider-audit",
    label: "Remote provider audit",
    budgetBytes: 4 * 1024 * 1024,
    retentionDays: null,
    disposition: "retain-protected",
    protectedEvidence: true,
    description: "Provider control/run evidence is excluded from Build 034 destructive cleanup."
  },
  {
    key: "connector-audit",
    label: "Connector grants & audit",
    budgetBytes: 4 * 1024 * 1024,
    retentionDays: null,
    disposition: "retain-protected",
    protectedEvidence: true,
    description: "Connector configuration and append-only execution evidence are protected."
  },
  {
    key: "operational-outcomes",
    label: "Operational outcomes",
    budgetBytes: 4 * 1024 * 1024,
    retentionDays: 180,
    disposition: "retain-protected",
    protectedEvidence: true,
    description:
      "Append-only sync/repair outcomes keep their existing database-enforced 180-day / 2,000-event family bound."
  },
  {
    key: "production-learning-snapshots",
    label: "Production-learning snapshots",
    budgetBytes: 1 * 1024 * 1024,
    retentionDays: 365,
    disposition: "retain-protected",
    protectedEvidence: true,
    description:
      "Changed-evidence snapshots keep their existing 365-day / 60-snapshot bound."
  },
  {
    key: "integration-delivery-audit",
    label: "Integration delivery audit",
    budgetBytes: 4 * 1024 * 1024,
    retentionDays: 365,
    disposition: "retain-protected",
    protectedEvidence: true,
    description:
      "Consumer handshakes, acknowledgements and replay receipts are protected from Build 034 cleanup."
  },
  {
    key: "retention-control-audit",
    label: "Retention control audit",
    budgetBytes: 1 * 1024 * 1024,
    retentionDays: null,
    disposition: "retain-protected",
    protectedEvidence: true,
    description: "Cleanup approval/revocation and before/after run evidence are themselves append-only."
  }
] as const;

export const RETENTION_BUDGETS = Object.fromEntries(
  RETENTION_CLASSES.map((item) => [item.key, item.budgetBytes])
) as Record<RetentionClassKey, number>;

export function retentionBudgetBreaches(
  measuredBytes: Partial<Record<RetentionClassKey, number>>,
  budgets: Partial<Record<RetentionClassKey, number>> = RETENTION_BUDGETS
) {
  return RETENTION_CLASSES.filter((item) => {
    const measured = Math.max(0, Number(measuredBytes[item.key] ?? 0));
    const budget = Math.max(1, Number(budgets[item.key] ?? item.budgetBytes));
    return measured > budget;
  }).map((item) => item.key);
}

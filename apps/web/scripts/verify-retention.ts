import {
  RETENTION_BUDGETS,
  RETENTION_CLASSES,
  retentionBudgetBreaches
} from "../lib/retention";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(RETENTION_CLASSES.length >= 10, "Build 034 lost retention classes.");
assert(
  RETENTION_CLASSES.every((item) => item.budgetBytes > 0),
  "Every retention class requires a positive storage budget."
);
assert(
  RETENTION_CLASSES.filter((item) => item.protectedEvidence).every(
    (item) => item.disposition === "retain-protected"
  ),
  "Protected evidence must never be marked for Build 034 destructive cleanup."
);
assert(
  RETENTION_CLASSES.filter((item) => item.disposition === "bounded-delete").every(
    (item) => (item.retentionDays ?? 0) > 0
  ),
  "Every bounded-delete class requires an age threshold."
);

const below = Object.fromEntries(
  RETENTION_CLASSES.map((item) => [item.key, Math.max(0, item.budgetBytes - 1)])
);
assert(
  retentionBudgetBreaches(below).length === 0,
  "Below-budget evidence should not produce a breach."
);

const over = {
  ...below,
  "barcode-terminal": RETENTION_BUDGETS["barcode-terminal"] + 1
};
assert(
  retentionBudgetBreaches(over).join(",") === "barcode-terminal",
  "Build 034 budget breach detection is incorrect."
);

console.log(
  "Build 034 retention classes, protected-evidence exceptions, bounded-delete age gates and storage budgets passed."
);

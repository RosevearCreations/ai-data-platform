import {
  buildDataReviewRows,
  dataReviewSourceFingerprint,
  normalizeDataReviewEdits,
  summarizeDataReviewRows
} from "../lib/data-review-workbench";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const payload = {
  recipeName: "Build 048 fixture",
  rows: [
    { name: "  Alpha   Item  ", price: "$10", note: "" },
    { name: "Alpha Item", price: "$10", note: "" },
    { name: " Beta Item ", price: "$12", note: "  observed   value " }
  ]
};

const rows = buildDataReviewRows(payload);
assert(rows.length === 3, "Build 048 must preserve bounded source rows.");
assert(rows[0].cleaned.name === "Alpha Item", "Whitespace cleanup must be deterministic.");
assert(rows[0].changedFields === 1, "Changed-field count must identify cleaned values.");
assert(rows[1].duplicateOf === rows[0].id, "Cleaned duplicate rows must be identified.");
assert(rows[1].included === false, "Automatic duplicate candidates must default excluded.");
assert(
  rows[2].cleaned.note === "observed value",
  "Nested row string cleanup must trim and collapse whitespace."
);

const summary = summarizeDataReviewRows(rows);
assert(summary.rows === 3, "Review summary row count mismatch.");
assert(summary.included === 2, "Duplicate default exclusion mismatch.");
assert(summary.duplicateRows === 1, "Duplicate summary mismatch.");
assert(summary.cleanupRows === 2, "Cleanup summary mismatch.");

const edited = normalizeDataReviewEdits(
  rows,
  rows.map((row) => ({
    id: row.id,
    included: row.id !== rows[2].id,
    cleaned:
      row.id === rows[0].id
        ? { ...row.cleaned, price: "$10.00" }
        : row.cleaned
  }))
);
assert(edited[0].cleaned.price === "$10.00", "Manual cleaned-row edit must survive.");
assert(edited[2].included === false, "Explicit row exclusion must survive.");

let unknownRowBlocked = false;
try {
  normalizeDataReviewEdits(rows, [
    ...rows.slice(0, 2).map((row) => ({
      id: row.id,
      included: row.included,
      cleaned: row.cleaned
    })),
    { id: "fabricated-row", included: true, cleaned: { value: "bad" } }
  ]);
} catch {
  unknownRowBlocked = true;
}
assert(unknownRowBlocked, "Review edits must not add fabricated row IDs.");

let allExcludedBlocked = false;
try {
  normalizeDataReviewEdits(
    rows,
    rows.map((row) => ({ id: row.id, included: false, cleaned: row.cleaned }))
  );
} catch {
  allExcludedBlocked = true;
}
assert(allExcludedBlocked, "Approval drafts must retain at least one included row.");

assert(
  dataReviewSourceFingerprint(payload) === dataReviewSourceFingerprint({
    rows: payload.rows,
    recipeName: payload.recipeName
  }),
  "Source fingerprint must be canonical across object key order."
);

console.log(
  "Build 048 deterministic cleanup, duplicate detection, bounded edits and source fingerprints passed."
);

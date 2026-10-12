import {
  approvedPublicationFingerprint,
  buildApprovedPublicationRows,
  renderPublicationCsv,
  safePublicationFilename
} from "../lib/approved-dataset-publishing";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const reviewRows = [
  {
    id: "row-1",
    included: true,
    cleaned: {
      name: "Alpha, Inc.",
      meta: { b: 2, a: 1 },
      note: "line one\nline two"
    }
  },
  {
    id: "row-2",
    included: false,
    cleaned: {
      name: "Excluded",
      meta: { value: false }
    }
  },
  {
    id: "row-3",
    included: true,
    cleaned: {
      name: 'Quote "Example"',
      price: 12.5
    }
  }
];

const snapshot = buildApprovedPublicationRows(reviewRows);
assert(snapshot.rows.length === 2, "Build 049 must publish included approved rows only.");
assert(
  snapshot.fieldOrder.join("|") === "name|meta|note|price",
  "Build 049 field order must follow first observed approved fields."
);
assert(
  snapshot.rows[0].name === "Alpha, Inc.",
  "Build 049 must preserve the approved cleaned value exactly."
);

const csv = renderPublicationCsv(snapshot.rows, snapshot.fieldOrder);
assert(csv.startsWith('"name","meta","note","price"'), "CSV header order mismatch.");
assert(csv.includes('"Alpha, Inc."'), "CSV comma escaping failed.");
assert(csv.includes('"Quote ""Example"""'), "CSV quote escaping failed.");
assert(csv.includes('"{""a"":1,""b"":2}"'), "Nested CSV values must use canonical JSON.");
assert(csv.includes('"line one\nline two"'), "CSV newline value must remain quoted.");

const fingerprintA = approvedPublicationFingerprint({
  reviewId: "review-1",
  sourceDatasetId: "dataset-1",
  sourceServerVersion: 2,
  sourceFingerprint: "source-fingerprint",
  fieldOrder: snapshot.fieldOrder,
  rows: snapshot.rows
});
const fingerprintB = approvedPublicationFingerprint({
  sourceFingerprint: "source-fingerprint",
  sourceServerVersion: 2,
  sourceDatasetId: "dataset-1",
  reviewId: "review-1",
  rows: snapshot.rows.map((row) => ({ ...row })),
  fieldOrder: [...snapshot.fieldOrder]
});
assert(fingerprintA === fingerprintB, "Publication fingerprint must be canonical.");

assert(
  safePublicationFilename("Approved / Dataset: 2026", "12345678-aaaa-bbbb-cccc-123456789000") ===
    "approved-dataset-2026-12345678",
  "Safe publication filename normalization failed."
);

let noRowsBlocked = false;
try {
  buildApprovedPublicationRows([
    { id: "row-1", included: false, cleaned: { name: "No" } }
  ]);
} catch {
  noRowsBlocked = true;
}
assert(noRowsBlocked, "Build 049 must reject publications with no included approved rows.");

console.log(
  "Build 049 approved-row snapshot, canonical fingerprint, CSV export and filename verification passed."
);

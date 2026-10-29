import { readFile } from "node:fs/promises";

import {
  filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const now = 1_800_000_000_000;
  const repairAudit: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
    { version: 1, auditId: "repair-recent", createdAt: now - 60 * 60 * 1000, requestedPresetId: "retired-a", recoveredPresetId: "all", reason: "Recent recovery." },
    { version: 1, auditId: "repair-week", createdAt: now - 3 * 24 * 60 * 60 * 1000, requestedPresetId: "retired-b", recoveredPresetId: "recent-7d", reason: "Weekly recovery." },
    { version: 1, auditId: "repair-old", createdAt: now - 10 * 24 * 60 * 60 * 1000, requestedPresetId: "retired-c", recoveredPresetId: "all", reason: "Old recovery." }
  ];

  assert(
    filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repairAudit, "24h", now).length === 1 &&
    filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repairAudit, "7d", now).length === 2 &&
    filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repairAudit, "all", now).length === 3,
    "Build 221 repair recovery filtering must support all, 24h and 7d."
  );

  const recovered = recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired-renewal-view");
  const valid = recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-7d");
  assert(
    recovered.recovered && recovered.presetId === "all" && !valid.recovered && valid.presetId === "recent-7d",
    "Build 221 renewal preset recovery must fail safe to All preset recoveries."
  );

  const receiptAudit: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
    { version: 1, auditId: "receipt-alpha", createdAt: now, requestedPresetId: "retired-alpha", recoveredPresetId: "all", reason: "Recovered alpha receipt preset." },
    { version: 1, auditId: "receipt-beta", createdAt: now - 1000, requestedPresetId: "retired-beta", recoveredPresetId: "recent-7d", reason: "Recovered beta receipt preset." }
  ];
  assert(
    searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(receiptAudit, "alpha")[0]?.auditId === "receipt-alpha" &&
    searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(receiptAudit, "recent-7d")[0]?.auditId === "receipt-beta",
    "Build 221 receipt recovery search must match IDs, preset IDs and reasons."
  );

  const [shell, pkg, verify220, ql246Doc, ql246Verifier, build221Doc, ql246Core] = await Promise.all([
    source("../app/application-shell.tsx"),
    source("../package.json"),
    source("./verify-build-220-repair-recovery-audit-renewal-persistence-receipt-filtering.ts"),
    source("../../../docs/ROSEVEAR_QL246_SIX_APP_SOURCE_PROOF_HANDOFF.md"),
    source("./ql246-verify-source-proofs.mjs"),
    source("../../../docs/BUILD_221_REPAIR_FILTERING_RENEWAL_RECOVERY_RECEIPT_SEARCH_QL246_FINAL_GATE.md"),
    source("./ql246-source-proof.mjs")
  ]);

  assert(shell.includes("Marble Standard"), "Current shell must retain the Marble Standard design system.");
  assert(verify220.includes('shell.includes("Marble Standard")'), "Build 220 verifier must remain forward-compatible.");
  assert(pkg.includes("verify-build-221-repair-filtering-renewal-recovery-receipt-search-ql246-final-gate.ts"), "Build 221 verifier must run in the application test chain.");

  for (const token of ["ai-data-platform", "devilndove", "rosiedazzlers", "yw", "icamp", "rosevear-ai-hub", "docs/integration/ql246-source-proof.json", "owner_authorization", "NOT_GIVEN", "connection_state", "DISCONNECTED"]) {
    assert(ql246Doc.includes(token), "QL-246 handoff missing required token: " + token);
  }
  assert(
    ql246Doc.includes('allowed_methods') && ql246Doc.includes('["GET"]') &&
    ql246Doc.includes('/api/integration/v1/health') &&
    ql246Doc.includes('/api/integration/v1/capabilities'),
    "QL-246 source proof must remain GET-only health/capabilities."
  );
  assert(
    ql246Verifier.includes("fetch-public-proof") &&
    ql246Core.includes("HOLD_FETCH_NOT_AUTHORIZED") &&
    ql246Core.includes("SIX_PUBLIC_SOURCES_VERIFIED_EXTERNAL_TESTS_PENDING_HELD"),
    "QL-246 verifier must remain explicit, operator-invoked and HOLD after source-only verification."
  );

  const docLower = build221Doc.toLowerCase();
  for (const token of ["not_given", "disconnected", "no live provider connection", "no automatic workflow transition", "authenticated gateway"]) {
    assert(docLower.includes(token), "Build 221 documentation missing safety boundary: " + token);
  }

  console.log("Build 221 recovery continuation and QL-246 final source-proof gate verification passed.");
}

void main();

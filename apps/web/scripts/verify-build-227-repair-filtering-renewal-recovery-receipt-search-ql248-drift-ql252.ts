import { readFile } from "node:fs/promises";
import {
  filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit
} from "../lib/navigation-preferences";

function ensure(c: unknown, m: string): asserts c { if (!c) throw new Error(m); }
async function source(r: string) { return readFile(new URL(r, import.meta.url), "utf8"); }

async function main() {
  const now = 1_800_000_000_000;
  const repair = [
    { version: 1, auditId: "recent", createdAt: now - 3600000, requestedPresetId: "old-a", recoveredPresetId: "all", reason: "Recent." },
    { version: 1, auditId: "week", createdAt: now - 3 * 86400000, requestedPresetId: "old-b", recoveredPresetId: "recent-7d", reason: "Week." },
    { version: 1, auditId: "old", createdAt: now - 10 * 86400000, requestedPresetId: "old-c", recoveredPresetId: "all", reason: "Old." }
  ] as any;
  ensure(filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repair, "24h", now).length === 1, "repair 24h filter");
  ensure(filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repair, "7d", now).length === 2, "repair 7d filter");

  const renewal = recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired");
  ensure(renewal.recovered && renewal.presetId === "all", "renewal preset recovery");

  const receipt = [
    { version: 1, auditId: "receipt-a", createdAt: now, requestedPresetId: "retired-a", recoveredPresetId: "all", reason: "Recovered alpha." },
    { version: 1, auditId: "receipt-b", createdAt: now - 1000, requestedPresetId: "retired-b", recoveredPresetId: "recent-7d", reason: "Recovered beta." }
  ] as any;
  ensure(searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(receipt, "alpha")[0]?.auditId === "receipt-a", "receipt search");

  const [shell, pkg, proofSource, ql246Verify, blocker, statusRaw, doc] = await Promise.all([
    source("../app/application-shell.tsx"),
    source("../package.json"),
    source("./ql246-source-proof.mjs"),
    source("./verify-ql246-independent-six-app-source-proof.mjs"),
    source("../../../docs/ROSEVEAR_QL252_AI_DATA_PLATFORM_SOURCE_PROOF_BLOCKER.md"),
    source("../../../docs/integration/ql252-ai-data-platform-public-proof-status.json"),
    source("../../../docs/BUILD_227_REPAIR_FILTERING_RENEWAL_RECOVERY_RECEIPT_SEARCH_QL248_DRIFT_QL252.md")
  ]);

  ensure(shell.includes("Build 227 · Marble Standard"), "Build 227 shell label");
  ensure(pkg.includes("verify-build-227-repair-filtering-renewal-recovery-receipt-search-ql248-drift-ql252.ts"), "Build 227 verifier registration");

  for (const t of ["reconcileQl248ExportDigest", "detectQl248ImmutableOriginDrift", "HOLD_EXPORT_DIGEST_DRIFT", "HOLD_SIX_SOURCE_IMMUTABLE_ORIGIN_DRIFT"]) ensure(proofSource.includes(t), "missing " + t);
  ensure(ql246Verify.includes("exported-origin digest reconciliation") && ql246Verify.includes("SIX_SOURCE_IMMUTABLE_ORIGIN_NO_DRIFT_AUTH_TESTING_HELD"), "QL-248 drift fixtures");

  const status = JSON.parse(statusRaw);
  ensure(status.application_name === "AI Data Platform", "status application");
  ensure(status.source_sha_A === "037b18247e59cb68d1f7ca5d7149595bd7487957", "status source A");
  ensure(status.source_ci_run_url === "NOT_AVAILABLE", "status CI truthfulness");
  ensure(status.proof_commit_sha_B === "NOT_AVAILABLE", "status proof B truthfulness");
  ensure(status.immutable_public_proof_url === "404", "status public proof 404");
  ensure(status.actual_gateway_test === "NOT_RUN" && status.connection_state === "DISCONNECTED" && status.owner_test_decision === "NOT_GIVEN", "status safety state");

  const lower = (blocker + doc).toLowerCase();
  for (const t of ["does **not** fabricate", "not_available", "404", "phase-b", "not_run", "disconnected"]) ensure(lower.includes(t), "QL-252 boundary " + t);

  console.log("Build 227 recovery, QL-248 drift reconciliation and QL-252 blocker verification passed.");
}
void main();

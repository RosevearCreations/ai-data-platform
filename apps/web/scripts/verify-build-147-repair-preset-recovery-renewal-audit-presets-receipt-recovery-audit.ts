import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntry,
  interfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetById,
  prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntry,
  recoverInterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const repairRecovered =
    recoverInterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId(
      "retired-repair-view"
    );
  const repairValid =
    recoverInterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId(
      "recent-7d"
    );
  assert(
    repairRecovered.recovered &&
      repairRecovered.presetId === "all" &&
      repairRecovered.reason?.includes("no longer supported") &&
      !repairValid.recovered &&
      repairValid.presetId === "recent-7d",
    "Build 147 repair-ledger preset recovery must repair unsupported persisted IDs to All preset recoveries."
  );

  const renewalPresetIds =
    INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(
      (preset) => preset.id
    );
  assert(
    renewalPresetIds.join(",") ===
      "all,recent-24h,recent-7d,recovered-all,recovery-reasons" &&
      interfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetById("recent-24h").ageFilter === "24h" &&
      interfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetById("recent-7d").ageFilter === "7d" &&
      interfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetById("recovered-all").query === "all" &&
      interfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetById("recovery-reasons").query === "recovered",
    "Build 147 renewal recovery-audit search presets must map deterministic age/search views."
  );

  const first =
    createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntry({
      auditId: "receipt-repair-1",
      createdAt: 1_800_000_000_000,
      requestedPresetId: "retired-receipt-view",
      recoveredPresetId: "all",
      reason: "Recovered because the saved preset is no longer supported."
    });
  const second =
    createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntry({
      auditId: "receipt-repair-2",
      createdAt: 1_800_000_001_000,
      requestedPresetId: "retired-receipt-view-2",
      recoveredPresetId: "recent-7d",
      reason: "Recovered to a supported preset."
    });

  const ledger: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntryV1[] =
    prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntry(
      prependInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntry(
        [],
        first
      ),
      second
    );

  assert(
    ledger.length === 2 &&
      ledger[0]?.auditId === "receipt-repair-2" &&
      ledger[1]?.auditId === "receipt-repair-1",
    "Build 147 receipt recovery audit ledger must retain newest-first recovery evidence."
  );

  const [insights, shell, css, help, pkg, verify146, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-146-recovery-preset-persistence-renewal-search-receipt-recovery.ts"),
    source("../../../docs/BUILD_147_REPAIR_PRESET_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESETS_RECEIPT_RECOVERY_AUDIT.md")
  ]);

  for (const token of [
    "readRecoveryAuditPresetRecoveryAuditSearchPresetRecovery",
    "recoveryAuditPresetRecoveryAuditSearchPresetRecoveryNotice",
    "INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map",
    "applyRenewalSearchPresetRecoveryAuditSearchPreset",
    "readReceiptRecoveryAuditSearchPresetRecoveryAudit",
    "writeReceiptRecoveryAuditSearchPresetRecoveryAudit",
    "receiptRecoveryAuditSearchPresetRecoveryAudit"
  ]) {
    assert(insights.includes(token), "Build 147 Insights UI missing: " + token);
  }

  assert(
    insights.includes("writeRecoveryAuditPresetRecoveryAuditSearchPreset(") &&
      insights.includes("Recovery-audit repair preset recovered") &&
      insights.includes("setRenewalHistoryPresetRecoveryAuditSearchPresetId(null)") &&
      insights.includes("createInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntry") &&
      insights.includes("Export preset recovery audit") &&
      insights.includes("Clear preset recovery audit"),
    "Build 147 must visibly recover repair presets, support renewal audit search presets, and retain/export receipt recovery preset repair evidence."
  );

  for (const selector of [
    ".interfaceRecoveryAuditRepairPresetRecovery",
    ".interfaceRenewalPresetRecoveryAuditSearchPresets",
    ".interfaceReceiptRecoveryAuditPresetRecoveryAuditList"
  ]) {
    assert(css.includes(selector), "Build 147 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-recovery",
    "renewal-search-preset-recovery-audit-search-presets",
    "receipt-recovery-audit-search-preset-recovery-audit"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 147 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 147 repair preset recovery, renewal recovery audit search presets & receipt recovery preset recovery audit"
    ),
    "Help Center must register the Build 147 help group."
  );

  assert(
    shell.includes("Build 147 · Marble Standard"),
    "Build 147 shell must expose the current interface build."
  );

  assert(
    verify146.includes('shell.includes("Marble Standard")') &&
      !verify146.includes('shell.includes("Build 146 · Marble Standard")'),
    "Build 146 verifier must remain forward-compatible after the Build 147 shell label."
  );

  assert(
    pkg.includes("verify-build-147-repair-preset-recovery-renewal-audit-presets-receipt-recovery-audit.ts"),
    "Build 147 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit recovery search preset recovery") &&
      docLower.includes("renewal search preset recovery audit search presets") &&
      docLower.includes("receipt recovery audit search preset recovery audit") &&
      docLower.includes("manual") &&
      docLower.includes("rls"),
    "Build 147 documentation must preserve browser-local evidence and workflow authority boundaries."
  );

  console.log(
    "Build 147 repair preset recovery, renewal audit search presets and receipt recovery audit verification passed."
  );
}

void main();

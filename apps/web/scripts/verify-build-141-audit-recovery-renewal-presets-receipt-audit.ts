import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_FORMAT,
  INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
  INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESETS,
  MAX_INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT,
  createInterfaceReceiptPresetRecoveryAuditEntry,
  interfaceRecoveryRenewalHistorySearchPresetById,
  parseInterfaceReceiptPresetRecoveryAudit,
  prependInterfaceReceiptPresetRecoveryAuditEntry,
  recoverInterfaceRecoveryAuditSearchPresetId,
  serializeInterfaceReceiptPresetRecoveryAudit
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const validAuditPreset = recoverInterfaceRecoveryAuditSearchPresetId(
    "favorites"
  );
  const invalidAuditPreset = recoverInterfaceRecoveryAuditSearchPresetId(
    "retired-audit-preset"
  );
  const missingAuditPreset = recoverInterfaceRecoveryAuditSearchPresetId(null);

  assert(
    validAuditPreset.presetId === "favorites" &&
      !validAuditPreset.recovered &&
      invalidAuditPreset.presetId === "all" &&
      invalidAuditPreset.recovered &&
      Boolean(invalidAuditPreset.reason?.includes("All recoveries")) &&
      missingAuditPreset.presetId === "all" &&
      !missingAuditPreset.recovered,
    "Build 141 audit-preset recovery must self-heal unsupported saved IDs while treating missing state as the normal All recoveries default."
  );

  const renewalPresetIds = INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESETS.map(
    (preset) => preset.id
  );
  assert(
    renewalPresetIds.join(",") ===
      "all,expired,stale,legacy,favorites" &&
      interfaceRecoveryRenewalHistorySearchPresetById("all").freshnessFilter ===
        "all" &&
      interfaceRecoveryRenewalHistorySearchPresetById("expired")
        .freshnessFilter === "expired" &&
      interfaceRecoveryRenewalHistorySearchPresetById("stale")
        .freshnessFilter === "stale" &&
      interfaceRecoveryRenewalHistorySearchPresetById("legacy")
        .freshnessFilter === "unknown" &&
      interfaceRecoveryRenewalHistorySearchPresetById("favorites").query ===
        "favorites",
    "Build 141 renewal-history search presets must map common operator views deterministically."
  );

  let audit = [] as ReturnType<
    typeof createInterfaceReceiptPresetRecoveryAuditEntry
  >[];
  for (
    let index = 0;
    index < MAX_INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT + 3;
    index += 1
  ) {
    audit = prependInterfaceReceiptPresetRecoveryAuditEntry(
      audit,
      createInterfaceReceiptPresetRecoveryAuditEntry({
        auditId: "receipt-recovery-" + index,
        createdAt: 1_700_000_000_000 + index,
        requestedPresetId: "retired-" + index,
        recoveredPresetId: "all",
        reason:
          "Receipt search preset recovered to All receipts because the saved preset ID is no longer supported."
      })
    );
  }

  assert(
    audit.length === MAX_INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT &&
      audit[0]?.auditId ===
        "receipt-recovery-" + (MAX_INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT + 2) &&
      audit.at(-1)?.auditId === "receipt-recovery-3",
    "Build 141 receipt-preset recovery audit must remain newest-first and bounded to ten entries."
  );

  const deduped = prependInterfaceReceiptPresetRecoveryAuditEntry(
    audit,
    audit[2]
  );
  assert(
    deduped.length === MAX_INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT &&
      deduped[0]?.auditId === audit[2]?.auditId &&
      new Set(deduped.map((entry) => entry.auditId)).size === deduped.length,
    "Build 141 receipt-preset recovery audit must move an existing event to the front without duplicate IDs."
  );

  const parsedAudit = parseInterfaceReceiptPresetRecoveryAudit(
    serializeInterfaceReceiptPresetRecoveryAudit(deduped)
  );
  assert(
    parsedAudit.ok &&
      parsedAudit.audit.format === INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_FORMAT &&
      parsedAudit.audit.entries.length === deduped.length &&
      parsedAudit.audit.entries[0]?.requestedPresetId ===
        deduped[0]?.requestedPresetId,
    "Build 141 receipt-preset recovery audit must round-trip through its versioned local format."
  );

  assert(
    INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_STORAGE_KEY.includes(
      "receipt-preset-recovery-audit"
    ),
    "Build 141 receipt-preset recovery audit must use a dedicated browser-local namespace."
  );

  const [preferencesLib, insights, shell, css, help, pkg, verify140, doc] =
    await Promise.all([
      source("../lib/navigation-preferences.ts"),
      source("../app/NavigationInsights.tsx"),
      source("../app/application-shell.tsx"),
      source("../app/globals.css"),
      source("../app/help/help-content.ts"),
      source("../package.json"),
      source("./verify-build-140-audit-persistence-renewal-search-recovery.ts"),
      source("../../../docs/BUILD_141_AUDIT_PRESET_RECOVERY_RENEWAL_PRESETS_RECEIPT_RECOVERY_AUDIT.md")
    ]);

  for (const token of [
    "recoverInterfaceRecoveryAuditSearchPresetId",
    "InterfaceRecoveryAuditSearchPresetRecovery",
    "INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESETS",
    "interfaceRecoveryRenewalHistorySearchPresetById",
    "INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_FORMAT",
    "MAX_INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT",
    "createInterfaceReceiptPresetRecoveryAuditEntry",
    "prependInterfaceReceiptPresetRecoveryAuditEntry",
    "parseInterfaceReceiptPresetRecoveryAudit"
  ]) {
    assert(
      preferencesLib.includes(token),
      "Build 141 preference library missing: " + token
    );
  }

  for (const token of [
    "readRecoveryAuditSearchPresetRecovery",
    "recoveryAuditPresetRecoveryNotice",
    "Recovery audit preset recovered",
    "writeRecoveryAuditSearchPreset(auditPresetRecovery.presetId)",
    "Renewal history search presets",
    "INTERFACE_RECOVERY_RENEWAL_HISTORY_SEARCH_PRESETS.map",
    "applyRecoveryRenewalHistorySearchPreset",
    "renewalHistorySearchPresetId",
    "Receipt preset recovery audit",
    "readReceiptPresetRecoveryAudit",
    "writeReceiptPresetRecoveryAudit",
    "Export recovery audit",
    "Clear recovery audit"
  ]) {
    assert(insights.includes(token), "Build 141 Insights UI missing: " + token);
  }

  assert(
    insights.includes("setRecoveryAuditPresetRecoveryNotice(auditPresetRecovery.reason)") &&
      insights.includes("setRecoveryAuditPresetRecoveryNotice(null)") &&
      insights.includes("setRenewalHistorySearchPresetId(null)") &&
      insights.includes("createInterfaceReceiptPresetRecoveryAuditEntry") &&
      insights.includes("prependInterfaceReceiptPresetRecoveryAuditEntry") &&
      insights.includes("setReceiptPresetRecoveryAudit(receiptRecoveryAudit)") &&
      insights.includes(
        "window.localStorage.removeItem(\n        INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_STORAGE_KEY"
      ),
    "Build 141 must wire audit-preset recovery, renewal preset exit and receipt-recovery audit persistence/reset behavior."
  );

  for (const selector of [
    ".interfaceAuditPresetRecovery",
    ".interfaceRenewalHistorySearchPresets",
    ".interfaceReceiptPresetRecoveryAudit",
    ".interfaceReceiptPresetRecoveryAuditList"
  ]) {
    assert(css.includes(selector), "Build 141 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-preset-recovery",
    "renewal-history-search-presets",
    "receipt-preset-recovery-audit"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 141 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 141 recovery audit preset recovery, renewal history search presets & receipt preset recovery audit"
    ),
    "Help Center must register the Build 141 help group."
  );

  assert(
    shell.includes("Marble Standard"),
    "Build 141 shell must preserve Marble Standard as later interface builds advance."
  );

  assert(
    verify140.includes('shell.includes("Marble Standard")') &&
      !verify140.includes('shell.includes("Build 140 · Marble Standard")'),
    "Build 140 verifier must remain forward-compatible after the Build 141 shell label."
  );

  assert(
    pkg.includes("verify-build-141-audit-recovery-renewal-presets-receipt-audit.ts"),
    "Build 141 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit preset recovery") &&
      docLower.includes("renewal history search presets") &&
      docLower.includes("receipt preset recovery audit") &&
      docLower.includes("ten") &&
      docLower.includes("view-only") &&
      docLower.includes("rls"),
    "Build 141 documentation must preserve local-only recovery, preset and audit boundaries."
  );

  console.log(
    "Build 141 audit preset recovery, renewal search presets and receipt preset recovery audit verification passed."
  );
}

void main();

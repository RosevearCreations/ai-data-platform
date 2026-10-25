import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT,
  INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY,
  MAX_INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT,
  createInterfaceRecoveryAuditPresetRecoveryAuditEntry,
  createInterfaceRecoveryRenewalSearchPresetRecoveryAuditEntry,
  interfaceReceiptPresetRecoveryAuditSearchPresetById,
  parseInterfaceRecoveryRenewalSearchPresetRecoveryAudit,
  prependInterfaceRecoveryRenewalSearchPresetRecoveryAuditEntry,
  searchInterfaceRecoveryAuditPresetRecoveryAudit,
  serializeInterfaceRecoveryRenewalSearchPresetRecoveryAudit
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const recoveryAudit = [
    createInterfaceRecoveryAuditPresetRecoveryAuditEntry({
      auditId: "audit-alpha",
      createdAt: 1_800_000_000_000,
      requestedPresetId: "retired-favorites",
      recoveredPresetId: "all",
      reason: "Recovery audit preset recovered to All recoveries."
    }),
    createInterfaceRecoveryAuditPresetRecoveryAuditEntry({
      auditId: "audit-beta",
      createdAt: 1_799_999_999_999,
      requestedPresetId: "retired-filter-selection",
      recoveredPresetId: "all",
      reason: "Filter selection preset was no longer supported."
    })
  ];

  assert(
    searchInterfaceRecoveryAuditPresetRecoveryAudit(
      recoveryAudit,
      "audit-alpha"
    )[0]?.auditId === "audit-alpha" &&
      searchInterfaceRecoveryAuditPresetRecoveryAudit(
        recoveryAudit,
        "retired-filter-selection"
      )[0]?.auditId === "audit-beta" &&
      searchInterfaceRecoveryAuditPresetRecoveryAudit(
        recoveryAudit,
        "ALL"
      ).length === 2 &&
      searchInterfaceRecoveryAuditPresetRecoveryAudit(
        recoveryAudit,
        "no longer supported"
      )[0]?.auditId === "audit-beta" &&
      searchInterfaceRecoveryAuditPresetRecoveryAudit(
        recoveryAudit,
        "missing"
      ).length === 0,
    "Build 144 recovery-audit recovery search must match audit ID, requested preset, recovered preset and reason case-insensitively."
  );

  let renewalAudit = [] as ReturnType<
    typeof createInterfaceRecoveryRenewalSearchPresetRecoveryAuditEntry
  >[];

  for (
    let index = 0;
    index < MAX_INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT + 3;
    index += 1
  ) {
    renewalAudit =
      prependInterfaceRecoveryRenewalSearchPresetRecoveryAuditEntry(
        renewalAudit,
        createInterfaceRecoveryRenewalSearchPresetRecoveryAuditEntry({
          auditId: "renewal-recovery-" + index,
          createdAt: 1_800_000_000_000 + index,
          requestedPresetId: "retired-renewal-" + index,
          recoveredPresetId: "all",
          reason:
            "Renewal history search preset recovered to All renewals because the saved preset ID is no longer supported."
        })
      );
  }

  assert(
    renewalAudit.length ===
      MAX_INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT &&
      renewalAudit[0]?.auditId ===
        "renewal-recovery-" +
          (MAX_INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT + 2) &&
      renewalAudit.at(-1)?.auditId === "renewal-recovery-3",
    "Build 144 renewal search preset recovery audit must stay newest-first and bounded to ten entries."
  );

  const renewalDeduped =
    prependInterfaceRecoveryRenewalSearchPresetRecoveryAuditEntry(
      renewalAudit,
      renewalAudit[2]
    );
  assert(
    renewalDeduped.length ===
      MAX_INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT &&
      renewalDeduped[0]?.auditId === renewalAudit[2]?.auditId &&
      new Set(renewalDeduped.map((entry) => entry.auditId)).size ===
        renewalDeduped.length,
    "Build 144 renewal search preset recovery audit must deduplicate by audit ID."
  );

  const parsedRenewalAudit =
    parseInterfaceRecoveryRenewalSearchPresetRecoveryAudit(
      serializeInterfaceRecoveryRenewalSearchPresetRecoveryAudit(
        renewalDeduped
      )
    );
  assert(
    parsedRenewalAudit.ok &&
      parsedRenewalAudit.audit.format ===
        INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT &&
      parsedRenewalAudit.audit.entries.length === renewalDeduped.length &&
      parsedRenewalAudit.audit.entries[0]?.requestedPresetId ===
        renewalDeduped[0]?.requestedPresetId &&
      INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY.includes(
        "renewal-search-preset-recovery-audit"
      ),
    "Build 144 renewal search preset recovery audit must round-trip through its versioned local format and dedicated namespace."
  );

  const receiptPresetIds =
    INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(
      (preset) => preset.id
    );
  assert(
    receiptPresetIds.join(",") ===
      "all,recent-24h,recent-7d,recovered-all,recovery-reasons" &&
      interfaceReceiptPresetRecoveryAuditSearchPresetById("all").ageFilter ===
        "all" &&
      interfaceReceiptPresetRecoveryAuditSearchPresetById("recent-24h")
        .ageFilter === "24h" &&
      interfaceReceiptPresetRecoveryAuditSearchPresetById("recent-7d")
        .ageFilter === "7d" &&
      interfaceReceiptPresetRecoveryAuditSearchPresetById("recovered-all")
        .query === "all" &&
      interfaceReceiptPresetRecoveryAuditSearchPresetById("recovery-reasons")
        .query === "recovered",
    "Build 144 receipt recovery audit search presets must map deterministic age/search combinations."
  );

  const [preferencesLib, insights, shell, css, help, pkg, verify143, doc] =
    await Promise.all([
      source("../lib/navigation-preferences.ts"),
      source("../app/NavigationInsights.tsx"),
      source("../app/application-shell.tsx"),
      source("../app/globals.css"),
      source("../app/help/help-content.ts"),
      source("../package.json"),
      source("./verify-build-143-audit-recovery-filter-renewal-recovery-receipt-search.ts"),
      source("../../../docs/BUILD_144_AUDIT_RECOVERY_SEARCH_RENEWAL_RECOVERY_AUDIT_RECEIPT_PRESETS.md")
    ]);

  for (const token of [
    "searchInterfaceRecoveryAuditPresetRecoveryAudit",
    "INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_FORMAT",
    "MAX_INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT",
    "createInterfaceRecoveryRenewalSearchPresetRecoveryAuditEntry",
    "prependInterfaceRecoveryRenewalSearchPresetRecoveryAuditEntry",
    "parseInterfaceRecoveryRenewalSearchPresetRecoveryAudit",
    "INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS",
    "interfaceReceiptPresetRecoveryAuditSearchPresetById"
  ]) {
    assert(
      preferencesLib.includes(token),
      "Build 144 preference library missing: " + token
    );
  }

  for (const token of [
    "Search audit recoveries",
    "searchedRecoveryAuditPresetRecoveryAudit",
    "readRecoveryRenewalSearchPresetRecoveryAudit",
    "writeRecoveryRenewalSearchPresetRecoveryAudit",
    "Renewal search preset recovery audit",
    "Export renewal recovery audit",
    "Clear renewal recovery audit",
    "Receipt recovery audit search presets",
    "INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map",
    "applyReceiptPresetRecoveryAuditSearchPreset",
    "receiptPresetRecoveryAuditSearchPresetId"
  ]) {
    assert(insights.includes(token), "Build 144 Insights UI missing: " + token);
  }

  assert(
    insights.includes(
      "createInterfaceRecoveryRenewalSearchPresetRecoveryAuditEntry"
    ) &&
      insights.includes(
        "prependInterfaceRecoveryRenewalSearchPresetRecoveryAuditEntry"
      ) &&
      insights.includes(
        "setRenewalHistoryPresetRecoveryAudit(renewalPresetRecoveryAudit)"
      ) &&
      insights.includes("setRecoveryAuditPresetRecoveryAuditSearch") &&
      insights.includes("searchInterfaceRecoveryAuditPresetRecoveryAudit") &&
      insights.includes("setReceiptPresetRecoveryAuditSearchPresetId(null)") &&
      insights.includes(
        "window.localStorage.removeItem(\n        INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_STORAGE_KEY"
      ),
    "Build 144 must wire audit-recovery search, renewal-recovery audit storage/reset and receipt search preset exit into browser-local UI state."
  );

  for (const selector of [
    ".interfaceRecoveryAuditRecoverySearch",
    ".interfaceRenewalPresetRecoveryAudit",
    ".interfaceRenewalPresetRecoveryAuditList",
    ".interfaceReceiptRecoveryAuditSearchPresets"
  ]) {
    assert(css.includes(selector), "Build 144 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search",
    "renewal-search-preset-recovery-audit",
    "receipt-recovery-audit-search-presets"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 144 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 144 recovery audit recovery search, renewal search preset recovery audit & receipt recovery audit search presets"
    ),
    "Help Center must register the Build 144 help group."
  );

  assert(
    shell.includes("Build 144 · Marble Standard"),
    "Build 144 shell must expose the current interface build."
  );

  assert(
    verify143.includes('shell.includes("Marble Standard")') &&
      !verify143.includes('shell.includes("Build 143 · Marble Standard")'),
    "Build 143 verifier must remain forward-compatible after the Build 144 shell label."
  );

  assert(
    pkg.includes("verify-build-144-audit-recovery-search-renewal-audit-receipt-presets.ts"),
    "Build 144 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit recovery search") &&
      docLower.includes("renewal search preset recovery audit") &&
      docLower.includes("receipt recovery audit search presets") &&
      docLower.includes("ten") &&
      docLower.includes("view-only") &&
      docLower.includes("rls"),
    "Build 144 documentation must preserve local-only search, recovery-audit and preset boundaries."
  );

  console.log(
    "Build 144 audit recovery search, renewal preset recovery audit and receipt recovery audit search presets verification passed."
  );
}

void main();

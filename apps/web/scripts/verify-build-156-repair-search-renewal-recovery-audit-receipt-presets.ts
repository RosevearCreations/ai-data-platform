import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const repairAudit: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
    {
      version: 1,
      auditId: "repair-alpha",
      createdAt: 1_800_000_000_000,
      requestedPresetId: "retired-alpha",
      recoveredPresetId: "all",
      reason: "Recovered alpha repair preset."
    },
    {
      version: 1,
      auditId: "repair-beta",
      createdAt: 1_799_999_999_000,
      requestedPresetId: "retired-beta",
      recoveredPresetId: "recent-7d",
      reason: "Recovered beta repair preset."
    }
  ];

  assert(
    searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      repairAudit,
      "alpha"
    ).map((entry) => entry.auditId).join(",") === "repair-alpha" &&
      searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        repairAudit,
        "recent-7d"
      ).map((entry) => entry.auditId).join(",") === "repair-beta" &&
      searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        repairAudit,
        ""
      ).length === 2,
    "Build 156 repair search-preset recovery audit search must match IDs, preset IDs, reasons and blank queries."
  );

  const first =
    createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
      auditId: "renewal-repair-recovery-1",
      createdAt: 1_800_000_000_000,
      requestedPresetId: "retired-renewal-a",
      recoveredPresetId: "all",
      reason: "Recovered unsupported renewal preset."
    });
  const second =
    createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
      auditId: "renewal-repair-recovery-2",
      createdAt: 1_800_000_001_000,
      requestedPresetId: "retired-renewal-b",
      recoveredPresetId: "recent-7d",
      reason: "Recovered renewal preset."
    });
  const renewalRecoveryAudit =
    prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
      prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry([], first),
      second
    );

  assert(
    renewalRecoveryAudit.length === 2 &&
      renewalRecoveryAudit[0]?.auditId === "renewal-repair-recovery-2" &&
      renewalRecoveryAudit[1]?.auditId === "renewal-repair-recovery-1",
    "Build 156 renewal search-preset recovery audit must retain newest-first evidence."
  );

  const receiptPresetIds =
    INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(
      (preset) => preset.id
    );
  assert(
    receiptPresetIds.join(",") ===
      "all,recent-24h,recent-7d,recovered-all,recovery-reasons" &&
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-24h").ageFilter === "24h" &&
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-7d").ageFilter === "7d" &&
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recovered-all").query === "all" &&
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recovery-reasons").query === "recovered",
    "Build 156 receipt search-preset recovery audit search presets must map deterministic age/search views."
  );

  const [insights, shell, css, help, pkg, verify155, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-155-repair-filtering-renewal-recovery-receipt-search.ts"),
    source("../../../docs/BUILD_156_REPAIR_SEARCH_RENEWAL_RECOVERY_AUDIT_RECEIPT_PRESETS.md")
  ]);

  for (const token of [
    "searchedRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch",
    "readRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map",
    "receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId"
  ]) {
    assert(insights.includes(token), "Build 156 Insights UI missing: " + token);
  }

  assert(
    insights.includes("No repair-preset search preset recoveries match the selected age filter and search.") &&
      insights.includes("Renewal preset-recovery audit search preset recovery audit") &&
      insights.includes("Export search preset recovery audit") &&
      insights.includes("Clear search preset recovery audit") &&
      insights.includes("Receipt search-preset recovery audit search presets") &&
      insights.includes("setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null)"),
    "Build 156 must visibly search repair recovery evidence, expose renewal recovery audit evidence, and apply receipt recovery search presets."
  );

  for (const selector of [
    ".interfaceRecoveryAuditRepairSearchPresetRecoveryAuditFilters",
    ".interfaceRenewalRecoveryAuditSearchPresetRecoveryAudit",
    ".interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresets"
  ]) {
    assert(css.includes(selector), "Build 156 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search",
    "renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit",
    "receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-presets"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 156 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 156 repair recovery audit search, renewal preset recovery audit & receipt recovery audit search presets"
    ),
    "Help Center must register the Build 156 help group."
  );

  assert(
    shell.includes("Build 156 · Marble Standard"),
    "Build 156 shell must expose the current interface build."
  );

  assert(
    verify155.includes('shell.includes("Marble Standard")') &&
      !verify155.includes('shell.includes("Build 155 · Marble Standard")'),
    "Build 155 verifier must remain forward-compatible after the Build 156 shell label."
  );

  assert(
    pkg.includes("verify-build-156-repair-search-renewal-recovery-audit-receipt-presets.ts"),
    "Build 156 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit recovery search preset recovery audit search preset recovery audit search") &&
      docLower.includes("renewal recovery audit search preset recovery audit search preset recovery audit") &&
      docLower.includes("receipt recovery audit search preset recovery audit search preset recovery audit search presets") &&
      docLower.includes("manual") &&
      docLower.includes("rls"),
    "Build 156 documentation must preserve browser-local evidence and workflow authority boundaries."
  );

  console.log(
    "Build 156 repair recovery search, renewal recovery audit and receipt recovery search presets verification passed."
  );
}

void main();

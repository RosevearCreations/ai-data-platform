import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const repairAudit: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
    {
      version: 1,
      auditId: "repair-newest-alpha",
      createdAt: 1_800_000_000_000,
      requestedPresetId: "retired-alpha",
      recoveredPresetId: "all",
      reason: "Recovered alpha newest repair preset."
    },
    {
      version: 1,
      auditId: "repair-newest-beta",
      createdAt: 1_799_999_999_000,
      requestedPresetId: "retired-beta",
      recoveredPresetId: "recent-7d",
      reason: "Recovered beta newest repair preset."
    }
  ];

  assert(
    searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      repairAudit,
      "alpha"
    ).map((entry) => entry.auditId).join(",") === "repair-newest-alpha" &&
      searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        repairAudit,
        "recent-7d"
      ).map((entry) => entry.auditId).join(",") === "repair-newest-beta" &&
      searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        repairAudit,
        ""
      ).length === 2,
    "Build 192 newest repair recovery audit search must match IDs, preset IDs, reasons and blank queries."
  );

  const first =
    createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
      auditId: "renewal-newest-recovery-1",
      createdAt: 1_800_000_000_000,
      requestedPresetId: "retired-renewal-a",
      recoveredPresetId: "all",
      reason: "Recovered unsupported newest renewal preset."
    });
  const second =
    createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
      auditId: "renewal-newest-recovery-2",
      createdAt: 1_800_000_001_000,
      requestedPresetId: "retired-renewal-b",
      recoveredPresetId: "recent-7d",
      reason: "Recovered newest renewal preset."
    });

  const renewalRecoveryAudit =
    prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
      prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry([], first),
      second
    );

  assert(
    renewalRecoveryAudit.length === 2 &&
      renewalRecoveryAudit[0]?.auditId === "renewal-newest-recovery-2" &&
      renewalRecoveryAudit[1]?.auditId === "renewal-newest-recovery-1",
    "Build 192 newest renewal recovery audit must retain newest-first evidence."
  );

  const receiptPresetIds =
    INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(
      (preset) => preset.id
    );

  assert(
    receiptPresetIds.join(",") ===
      "all,recent-24h,recent-7d,recovered-all,recovery-reasons" &&
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-24h").ageFilter === "24h" &&
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-7d").ageFilter === "7d" &&
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recovered-all").query === "all" &&
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recovery-reasons").query === "recovered",
    "Build 192 newest receipt recovery search presets must map deterministic age/search views."
  );

  const [insights, shell, css, help, pkg, verify191, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-191-repair-filtering-renewal-recovery-receipt-search.ts"),
    source("../../../docs/BUILD_192_REPAIR_SEARCH_RENEWAL_RECOVERY_AUDIT_RECEIPT_PRESETS.md")
  ]);

  for (const token of [
    "searchedRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch",
    "readRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map",
    "receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId"
  ]) {
    assert(insights.includes(token), "Build 192 Insights UI missing: " + token);
  }

  assert(
    insights.includes("Search newest repair recoveries") &&
      insights.includes("Newest renewal search-preset recovery audit evidence") &&
      insights.includes("Export search preset recovery audit") &&
      insights.includes("Clear search preset recovery audit") &&
      insights.includes("Newest receipt recovery audit search presets") &&
      insights.includes("setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null)"),
    "Build 192 must visibly search repair recovery evidence, expose renewal recovery audit evidence, and apply receipt recovery search presets."
  );

  const renewalAuditIndex = insights.indexOf(
    "{renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length ? ("
  );
  const parentRenewalIndex = insights.indexOf(
    "{renewalHistoryPresetRecoveryAudit.length ? ("
  );
  assert(
    renewalAuditIndex >= 0 && parentRenewalIndex >= 0 && renewalAuditIndex < parentRenewalIndex,
    "Build 192 newest renewal recovery audit must remain independently visible from the parent renewal ledger."
  );

  for (const selector of [
    ".interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch",
    ".interfaceRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    ".interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresets"
  ]) {
    assert(css.includes(selector), "Build 192 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search",
    "renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit",
    "receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-presets"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 192 help topic missing: " + topic);
  }

  assert(
    help.includes("Build 192 repair recovery audit search, renewal preset recovery audit & receipt recovery audit search presets"),
    "Help Center must register the Build 192 help group."
  );

  assert(shell.includes("Marble Standard"), "Build 192 verifier must remain forward-compatible with later shell labels.");

  assert(
    verify191.includes('shell.includes("Marble Standard")') &&
      !verify191.includes('shell.includes("Build 191 · Marble Standard")'),
    "Build 191 verifier must remain forward-compatible after Build 192."
  );

  assert(
    pkg.includes("verify-build-192-repair-search-renewal-recovery-audit-receipt-presets.ts"),
    "Build 192 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit recovery search preset recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search") &&
      docLower.includes("renewal recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search preset recovery audit") &&
      docLower.includes("receipt recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search presets") &&
      docLower.includes("manual") &&
      docLower.includes("rls"),
    "Build 192 documentation must preserve browser-local evidence and workflow authority boundaries."
  );

  console.log("Build 192 repair recovery search, renewal recovery audit and receipt recovery search presets verification passed.");
}

void main();

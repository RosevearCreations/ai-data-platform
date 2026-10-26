import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const repairAudit: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
    {
      version: 1,
      auditId: "repair-deep-alpha",
      createdAt: 1_800_000_000_000,
      requestedPresetId: "retired-alpha",
      recoveredPresetId: "all",
      reason: "Recovered alpha deep repair preset."
    },
    {
      version: 1,
      auditId: "repair-deep-beta",
      createdAt: 1_799_999_999_000,
      requestedPresetId: "retired-beta",
      recoveredPresetId: "recent-7d",
      reason: "Recovered beta deep repair preset."
    }
  ];

  assert(
    searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      repairAudit,
      "alpha"
    ).map((entry) => entry.auditId).join(",") === "repair-deep-alpha" &&
      searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        repairAudit,
        "recent-7d"
      ).map((entry) => entry.auditId).join(",") === "repair-deep-beta" &&
      searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        repairAudit,
        ""
      ).length === 2,
    "Build 162 newest repair recovery audit search must match IDs, preset IDs, reasons and blank queries."
  );

  const first =
    createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
      auditId: "renewal-deep-recovery-1",
      createdAt: 1_800_000_000_000,
      requestedPresetId: "retired-renewal-a",
      recoveredPresetId: "all",
      reason: "Recovered unsupported newest renewal preset."
    });
  const second =
    createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
      auditId: "renewal-deep-recovery-2",
      createdAt: 1_800_000_001_000,
      requestedPresetId: "retired-renewal-b",
      recoveredPresetId: "recent-7d",
      reason: "Recovered newest renewal preset."
    });

  const renewalRecoveryAudit =
    prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
      prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry([], first),
      second
    );

  assert(
    renewalRecoveryAudit.length === 2 &&
      renewalRecoveryAudit[0]?.auditId === "renewal-deep-recovery-2" &&
      renewalRecoveryAudit[1]?.auditId === "renewal-deep-recovery-1",
    "Build 162 newest renewal search-preset recovery audit must retain newest-first evidence."
  );

  const receiptPresetIds =
    INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(
      (preset) => preset.id
    );
  assert(
    receiptPresetIds.join(",") ===
      "all,recent-24h,recent-7d,recovered-all,recovery-reasons" &&
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-24h").ageFilter === "24h" &&
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-7d").ageFilter === "7d" &&
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recovered-all").query === "all" &&
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recovery-reasons").query === "recovered",
    "Build 162 newest receipt recovery audit search presets must map deterministic age/search views."
  );

  const [insights, shell, css, help, pkg, verify161, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-161-repair-filtering-renewal-recovery-receipt-search.ts"),
    source("../../../docs/BUILD_162_REPAIR_SEARCH_RENEWAL_RECOVERY_AUDIT_RECEIPT_PRESETS.md")
  ]);

  for (const token of [
    "searchedRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch",
    "readRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map",
    "receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId"
  ]) {
    assert(insights.includes(token), "Build 162 Insights UI missing: " + token);
  }

  assert(
    insights.includes("No repair search-preset recovery audit search preset recoveries match the selected age filter and search.") &&
      insights.includes("Renewal search-preset recovery audit search preset recovery audit") &&
      insights.includes("Export search preset recovery audit") &&
      insights.includes("Clear search preset recovery audit") &&
      insights.includes("Receipt search-preset recovery audit search preset recovery audit search presets") &&
      insights.includes("setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null)"),
    "Build 162 must visibly search repair recovery evidence, expose renewal recovery audit evidence, and apply receipt recovery search presets."
  );

  const renewalAuditIndex = insights.indexOf(
    "{renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit.length ? ("
  );
  const parentRenewalIndex = insights.indexOf(
    "{renewalHistoryPresetRecoveryAudit.length ? ("
  );
  assert(
    renewalAuditIndex >= 0 && parentRenewalIndex >= 0 && renewalAuditIndex < parentRenewalIndex,
    "Build 162 newest renewal recovery audit must remain independently visible from the parent renewal ledger."
  );

  for (const selector of [
    ".interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch",
    ".interfaceRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    ".interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresets"
  ]) {
    assert(css.includes(selector), "Build 162 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search",
    "renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit",
    "receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-presets"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 162 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 162 repair recovery audit search, renewal preset recovery audit & receipt recovery audit search presets"
    ),
    "Help Center must register the Build 162 help group."
  );

  assert(
    shell.includes("Marble Standard"),
    "Build 162 verifier must remain forward-compatible with later shell labels."
  );

  assert(
    verify161.includes('shell.includes("Marble Standard")') &&
      !verify161.includes('shell.includes("Build 161 · Marble Standard")') &&
      verify161.includes("selected age filter and search."),
    "Build 161 verifier must remain forward-compatible after Build 162 search and shell updates."
  );

  assert(
    pkg.includes("verify-build-162-repair-search-renewal-recovery-audit-receipt-presets.ts"),
    "Build 162 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit recovery search preset recovery audit search preset recovery audit search preset recovery audit search") &&
      docLower.includes("renewal recovery audit search preset recovery audit search preset recovery audit search preset recovery audit") &&
      docLower.includes("receipt recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search presets") &&
      docLower.includes("manual") &&
      docLower.includes("rls"),
    "Build 162 documentation must preserve browser-local evidence and workflow authority boundaries."
  );

  console.log(
    "Build 162 repair recovery search, renewal recovery audit and receipt recovery search presets verification passed."
  );
}

void main();

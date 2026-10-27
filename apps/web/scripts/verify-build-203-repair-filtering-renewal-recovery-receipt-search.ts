import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
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
    {
      version: 1,
      auditId: "repair-newest-recent",
      createdAt: now - 60 * 60 * 1000,
      requestedPresetId: "retired-a",
      recoveredPresetId: "all",
      reason: "Recent newest repair preset recovery."
    },
    {
      version: 1,
      auditId: "repair-newest-week",
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-b",
      recoveredPresetId: "recent-7d",
      reason: "Weekly newest repair preset recovery."
    },
    {
      version: 1,
      auditId: "repair-newest-old",
      createdAt: now - 10 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-c",
      recoveredPresetId: "all",
      reason: "Old newest repair preset recovery."
    }
  ];

  assert(
    filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      repairAudit,
      "24h",
      now
    ).map((entry) => entry.auditId).join(",") === "repair-newest-recent" &&
      filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        repairAudit,
        "7d",
        now
      ).map((entry) => entry.auditId).join(",") === "repair-newest-recent,repair-newest-week" &&
      filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        repairAudit,
        "all",
        now
      ).length === 3,
    "Build 203 newest repair recovery audit filtering must support all, 24h and 7d while preserving order."
  );

  const recovered =
    recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      "retired-renewal-newest-view"
    );
  const valid =
    recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      "recent-7d"
    );
  assert(
    recovered.recovered &&
      recovered.presetId === "all" &&
      recovered.reason?.includes("no longer supported") &&
      !valid.recovered &&
      valid.presetId === "recent-7d",
    "Build 203 newest renewal preset recovery must repair unsupported persisted IDs to All preset recoveries."
  );

  const receiptAudit: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
    {
      version: 1,
      auditId: "receipt-newest-alpha",
      createdAt: now,
      requestedPresetId: "retired-alpha",
      recoveredPresetId: "all",
      reason: "Recovered alpha receipt preset."
    },
    {
      version: 1,
      auditId: "receipt-newest-beta",
      createdAt: now - 1000,
      requestedPresetId: "retired-beta",
      recoveredPresetId: "recent-7d",
      reason: "Recovered beta receipt preset."
    }
  ];

  assert(
    searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      receiptAudit,
      "alpha"
    ).map((entry) => entry.auditId).join(",") === "receipt-newest-alpha" &&
      searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        receiptAudit,
        "recent-7d"
      ).map((entry) => entry.auditId).join(",") === "receipt-newest-beta" &&
      searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        receiptAudit,
        ""
      ).length === 2,
    "Build 203 newest receipt recovery audit search must match IDs, preset IDs, reasons and blank queries."
  );

  const [insights, shell, css, help, pkg, verify202, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-202-repair-recovery-audit-renewal-persistence-receipt-filtering.ts"),
    source("../../../docs/BUILD_203_REPAIR_FILTERING_RENEWAL_RECOVERY_RECEIPT_SEARCH.md")
  ]);

  for (const token of [
    "filteredRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter",
    "readRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery",
    "renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice",
    "searchedReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch"
  ]) {
    assert(insights.includes(token), "Build 203 Insights UI missing: " + token);
  }

  assert(
    insights.includes("Newest repair recovery age") &&
      insights.includes("Newest renewal recovery preset recovered") &&
      insights.includes("Search newest receipt recoveries"),
    "Build 203 must visibly filter newest repair recovery evidence, recover newest renewal presets, and search newest receipt recovery evidence."
  );

  for (const selector of [
    ".interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditFilters",
    ".interfaceRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery",
    ".interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch"
  ]) {
    assert(css.includes(selector), "Build 203 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-filtering",
    "renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery",
    "receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 203 help topic missing: " + topic);
  }

  assert(
    help.includes("Build 203 repair recovery audit filtering, renewal preset recovery & receipt recovery audit search"),
    "Help Center must register the Build 203 help group."
  );

  assert(shell.includes("Marble Standard"), "Build 203 verifier must remain forward-compatible with later shell labels.");

  assert(
    verify202.includes('shell.includes("Marble Standard")') &&
      !verify202.includes('shell.includes("Build 202 · Marble Standard")'),
    "Build 202 verifier must remain forward-compatible after Build 203."
  );

  assert(
    pkg.includes("verify-build-203-repair-filtering-renewal-recovery-receipt-search.ts"),
    "Build 203 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit recovery search preset recovery audit search preset recovery audit search preset recovery audit search preset recovery audit filtering") &&
      docLower.includes("renewal recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search preset recovery") &&
      docLower.includes("receipt recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search") &&
      docLower.includes("rls"),
    "Build 203 documentation must preserve browser-local evidence and workflow authority boundaries."
  );

  console.log("Build 203 repair recovery filtering, renewal preset recovery and receipt recovery search verification passed.");
}

void main();

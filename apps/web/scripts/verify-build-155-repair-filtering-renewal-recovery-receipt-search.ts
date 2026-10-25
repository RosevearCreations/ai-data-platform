import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId,
  searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const now = 1_800_000_000_000;
  const repairAudit: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
    {
      version: 1,
      auditId: "repair-recent",
      createdAt: now - 60 * 60 * 1000,
      requestedPresetId: "retired-a",
      recoveredPresetId: "all",
      reason: "Recent repair preset recovery."
    },
    {
      version: 1,
      auditId: "repair-week",
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-b",
      recoveredPresetId: "recent-7d",
      reason: "Weekly repair preset recovery."
    },
    {
      version: 1,
      auditId: "repair-old",
      createdAt: now - 10 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-c",
      recoveredPresetId: "all",
      reason: "Old repair preset recovery."
    }
  ];

  assert(
    filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      repairAudit,
      "24h",
      now
    ).map((entry) => entry.auditId).join(",") === "repair-recent" &&
      filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        repairAudit,
        "7d",
        now
      ).map((entry) => entry.auditId).join(",") === "repair-recent,repair-week" &&
      filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        repairAudit,
        "all",
        now
      ).length === 3,
    "Build 155 repair search-preset recovery audit filtering must support all, 24h and 7d while preserving order."
  );

  const recovered =
    recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId(
      "retired-renewal-repair-view"
    );
  const valid =
    recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetId(
      "recent-7d"
    );
  assert(
    recovered.recovered &&
      recovered.presetId === "all" &&
      recovered.reason?.includes("no longer supported") &&
      !valid.recovered &&
      valid.presetId === "recent-7d",
    "Build 155 renewal preset-recovery audit search preset recovery must repair unsupported persisted IDs to All preset recoveries."
  );

  const receiptAudit: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
    {
      version: 1,
      auditId: "receipt-alpha",
      createdAt: now,
      requestedPresetId: "retired-alpha",
      recoveredPresetId: "all",
      reason: "Recovered alpha receipt preset."
    },
    {
      version: 1,
      auditId: "receipt-beta",
      createdAt: now - 1000,
      requestedPresetId: "retired-beta",
      recoveredPresetId: "recent-7d",
      reason: "Recovered beta receipt preset."
    }
  ];

  assert(
    searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      receiptAudit,
      "alpha"
    ).map((entry) => entry.auditId).join(",") === "receipt-alpha" &&
      searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        receiptAudit,
        "recent-7d"
      ).map((entry) => entry.auditId).join(",") === "receipt-beta" &&
      searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        receiptAudit,
        ""
      ).length === 2,
    "Build 155 receipt search-preset recovery audit search must match IDs, preset IDs, reasons and blank queries."
  );

  const [insights, shell, css, help, pkg, verify154, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-154-repair-recovery-audit-renewal-persistence-receipt-filtering.ts"),
    source("../../../docs/BUILD_155_REPAIR_FILTERING_RENEWAL_RECOVERY_RECEIPT_SEARCH.md")
  ]);

  for (const token of [
    "filteredRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter",
    "readRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery",
    "renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice",
    "searchedReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch"
  ]) {
    assert(insights.includes(token), "Build 155 Insights UI missing: " + token);
  }

  assert(
    insights.includes("No repair-preset search preset recoveries match the selected age filter.") &&
      insights.includes("Renewal preset-recovery audit search preset recovered") &&
      insights.includes("writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPreset(") &&
      insights.includes("Search recoveries") &&
      insights.includes("No receipt preset-repair search preset recoveries match the selected age filter and search."),
    "Build 155 must visibly filter repair recovery evidence, recover renewal presets, and search receipt recovery evidence."
  );

  for (const selector of [
    ".interfaceRecoveryAuditRepairSearchPresetRecoveryAuditFilters",
    ".interfaceRenewalRecoveryAuditSearchPresetRecovery",
    ".interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditFilters"
  ]) {
    assert(css.includes(selector), "Build 155 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-filtering",
    "renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery",
    "receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 155 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 155 repair recovery audit filtering, renewal preset recovery & receipt recovery audit search"
    ),
    "Help Center must register the Build 155 help group."
  );

  assert(
    shell.includes("Marble Standard"),
    "Build 155 shell must expose the current interface build."
  );

  assert(
    verify154.includes('shell.includes("Marble Standard")') &&
      !verify154.includes('shell.includes("Build 154 · Marble Standard")'),
    "Build 154 verifier must remain forward-compatible after the Build 155 shell label."
  );

  assert(
    pkg.includes("verify-build-155-repair-filtering-renewal-recovery-receipt-search.ts"),
    "Build 155 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit recovery search preset recovery audit search preset recovery audit filtering") &&
      docLower.includes("renewal recovery audit search preset recovery audit search preset recovery") &&
      docLower.includes("receipt recovery audit search preset recovery audit search preset recovery audit search") &&
      docLower.includes("manual") &&
      docLower.includes("rls"),
    "Build 155 documentation must preserve browser-local evidence and workflow authority boundaries."
  );

  console.log(
    "Build 155 repair recovery filtering, renewal preset recovery and receipt recovery search verification passed."
  );
}

void main();

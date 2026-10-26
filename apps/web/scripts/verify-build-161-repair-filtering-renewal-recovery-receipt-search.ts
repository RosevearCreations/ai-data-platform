import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const now = 1_800_000_000_000;
  const repairAudit: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
    {
      version: 1,
      auditId: "repair-deep-recent",
      createdAt: now - 60 * 60 * 1000,
      requestedPresetId: "retired-a",
      recoveredPresetId: "all",
      reason: "Recent deep repair preset recovery."
    },
    {
      version: 1,
      auditId: "repair-deep-week",
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-b",
      recoveredPresetId: "recent-7d",
      reason: "Weekly deep repair preset recovery."
    },
    {
      version: 1,
      auditId: "repair-deep-old",
      createdAt: now - 10 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-c",
      recoveredPresetId: "all",
      reason: "Old deep repair preset recovery."
    }
  ];

  assert(
    filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      repairAudit,
      "24h",
      now
    ).map((entry) => entry.auditId).join(",") === "repair-deep-recent" &&
      filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        repairAudit,
        "7d",
        now
      ).map((entry) => entry.auditId).join(",") === "repair-deep-recent,repair-deep-week" &&
      filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        repairAudit,
        "all",
        now
      ).length === 3,
    "Build 161 newest repair recovery audit filtering must support all, 24h and 7d while preserving order."
  );

  const recovered =
    recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      "retired-renewal-deep-view"
    );
  const valid =
    recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      "recent-7d"
    );
  assert(
    recovered.recovered &&
      recovered.presetId === "all" &&
      recovered.reason?.includes("no longer supported") &&
      !valid.recovered &&
      valid.presetId === "recent-7d",
    "Build 161 newest renewal search preset recovery must repair unsupported persisted IDs to All preset recoveries."
  );

  const receiptAudit: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
    {
      version: 1,
      auditId: "receipt-deep-alpha",
      createdAt: now,
      requestedPresetId: "retired-alpha",
      recoveredPresetId: "all",
      reason: "Recovered alpha receipt preset."
    },
    {
      version: 1,
      auditId: "receipt-deep-beta",
      createdAt: now - 1000,
      requestedPresetId: "retired-beta",
      recoveredPresetId: "recent-7d",
      reason: "Recovered beta receipt preset."
    }
  ];

  assert(
    searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      receiptAudit,
      "alpha"
    ).map((entry) => entry.auditId).join(",") === "receipt-deep-alpha" &&
      searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        receiptAudit,
        "recent-7d"
      ).map((entry) => entry.auditId).join(",") === "receipt-deep-beta" &&
      searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        receiptAudit,
        ""
      ).length === 2,
    "Build 161 newest receipt recovery audit search must match IDs, preset IDs, reasons and blank queries."
  );

  const [insights, shell, css, help, pkg, verify160, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-160-repair-recovery-audit-renewal-persistence-receipt-filtering.ts"),
    source("../../../docs/BUILD_161_REPAIR_FILTERING_RENEWAL_RECOVERY_RECEIPT_SEARCH.md")
  ]);

  for (const token of [
    "filteredRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter",
    "readRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery",
    "renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice",
    "searchedReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch"
  ]) {
    assert(insights.includes(token), "Build 161 Insights UI missing: " + token);
  }

  assert(
    insights.includes("No repair search-preset recovery audit search preset recoveries match the selected age filter.") &&
      insights.includes("Renewal search-preset recovery audit search preset recovered") &&
      insights.includes("writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset(") &&
      insights.includes("Search recoveries") &&
      insights.includes("No receipt search-preset recovery audit search preset recoveries match the selected age filter and search."),
    "Build 161 must visibly filter newest repair recovery evidence, recover newest renewal presets, and search newest receipt recovery evidence."
  );

  for (const selector of [
    ".interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditFilters",
    ".interfaceRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery",
    ".interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditFilters"
  ]) {
    assert(css.includes(selector), "Build 161 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-filtering",
    "renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery",
    "receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 161 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 161 repair recovery audit filtering, renewal preset recovery & receipt recovery audit search"
    ),
    "Help Center must register the Build 161 help group."
  );

  assert(
    shell.includes("Build 161 · Marble Standard"),
    "Build 161 shell must expose the current interface build."
  );

  assert(
    verify160.includes('shell.includes("Marble Standard")') &&
      !verify160.includes('shell.includes("Build 160 · Marble Standard")'),
    "Build 160 verifier must remain forward-compatible after the Build 161 shell label."
  );

  assert(
    pkg.includes("verify-build-161-repair-filtering-renewal-recovery-receipt-search.ts"),
    "Build 161 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit recovery search preset recovery audit search preset recovery audit search preset recovery audit filtering") &&
      docLower.includes("renewal recovery audit search preset recovery audit search preset recovery audit search preset recovery") &&
      docLower.includes("receipt recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search") &&
      docLower.includes("manual") &&
      docLower.includes("rls"),
    "Build 161 documentation must preserve browser-local evidence and workflow authority boundaries."
  );

  console.log(
    "Build 161 repair recovery filtering, renewal preset recovery and receipt recovery search verification passed."
  );
}

void main();

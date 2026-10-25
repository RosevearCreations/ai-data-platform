import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAudit,
  recoverInterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId,
  searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntryV1,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const now = 1_800_000_000_000;
  const repairAudit: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntryV1[] = [
    {
      version: 1,
      auditId: "repair-recent",
      createdAt: now - 60 * 60 * 1000,
      requestedPresetId: "retired-a",
      recoveredPresetId: "all",
      reason: "Recent repair."
    },
    {
      version: 1,
      auditId: "repair-week",
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-b",
      recoveredPresetId: "recent-7d",
      reason: "Weekly repair."
    },
    {
      version: 1,
      auditId: "repair-old",
      createdAt: now - 10 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-c",
      recoveredPresetId: "all",
      reason: "Old repair."
    }
  ];

  assert(
    filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAudit(
      repairAudit,
      "24h",
      now
    ).map((entry) => entry.auditId).join(",") === "repair-recent" &&
      filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAudit(
        repairAudit,
        "7d",
        now
      ).map((entry) => entry.auditId).join(",") ===
        "repair-recent,repair-week" &&
      filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAudit(
        repairAudit,
        "all",
        now
      ).length === 3,
    "Build 149 repair-preset recovery audit filtering must support all, 24h and 7d while preserving order."
  );

  const renewalRecovered =
    recoverInterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId(
      "retired-renewal-recovery-view"
    );
  const renewalValid =
    recoverInterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId(
      "recent-7d"
    );
  assert(
    renewalRecovered.recovered &&
      renewalRecovered.presetId === "all" &&
      renewalRecovered.reason?.includes("no longer supported") &&
      !renewalValid.recovered &&
      renewalValid.presetId === "recent-7d",
    "Build 149 renewal recovery-audit preset recovery must repair unsupported stored IDs to All recovery events."
  );

  const receiptAudit: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
    {
      version: 1,
      auditId: "receipt-alpha",
      createdAt: now,
      requestedPresetId: "retired-alpha",
      recoveredPresetId: "all",
      reason: "Recovered alpha preset."
    },
    {
      version: 1,
      auditId: "receipt-beta",
      createdAt: now - 1,
      requestedPresetId: "retired-beta",
      recoveredPresetId: "recent-7d",
      reason: "Recovered beta preset."
    }
  ];

  assert(
    searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit(
      receiptAudit,
      "alpha"
    ).map((entry) => entry.auditId).join(",") === "receipt-alpha" &&
      searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit(
        receiptAudit,
        "recent-7d"
      ).map((entry) => entry.auditId).join(",") === "receipt-beta" &&
      searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit(
        receiptAudit,
        ""
      ).length === 2,
    "Build 149 receipt preset-repair audit search must match IDs, recovered preset IDs, reasons and preserve blank-query behavior."
  );

  const [insights, shell, css, help, pkg, verify148, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-148-repair-recovery-audit-renewal-preset-persistence-receipt-filtering.ts"),
    source("../../../docs/BUILD_149_REPAIR_RECOVERY_FILTERING_RENEWAL_PRESET_RECOVERY_RECEIPT_SEARCH.md")
  ]);

  for (const token of [
    "recoveryAuditRepairSearchPresetRecoveryAuditAgeFilter",
    "filteredRecoveryAuditRepairSearchPresetRecoveryAudit",
    "readRenewalRecoveryAuditSearchPresetRecovery",
    "renewalHistoryPresetRecoveryAuditSearchPresetRecoveryNotice",
    "receiptRecoveryAuditSearchPresetRecoveryAuditSearch",
    "searchedReceiptRecoveryAuditSearchPresetRecoveryAudit"
  ]) {
    assert(insights.includes(token), "Build 149 Insights UI missing: " + token);
  }

  assert(
    insights.includes("No repair-preset recovery events match the selected age filter.") &&
      insights.includes("Renewal recovery audit preset recovered") &&
      insights.includes("writeRenewalRecoveryAuditSearchPreset(") &&
      insights.includes("Search preset repairs") &&
      insights.includes("No receipt recovery-audit preset repairs match the selected age filter and search."),
    "Build 149 must visibly filter repair recovery evidence, recover renewal audit presets, and search receipt repair evidence."
  );

  for (const selector of [
    ".interfaceRecoveryAuditRepairPresetRecoveryAuditFilters",
    ".interfaceRenewalRecoveryAuditPresetRecovery",
    ".interfaceReceiptRecoveryAuditPresetRecoveryAuditFilters"
  ]) {
    assert(css.includes(selector), "Build 149 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-recovery-audit-filtering",
    "renewal-search-preset-recovery-audit-search-preset-recovery",
    "receipt-recovery-audit-search-preset-recovery-audit-search"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 149 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 149 repair recovery audit filtering, renewal recovery audit preset recovery & receipt recovery audit search"
    ),
    "Help Center must register the Build 149 help group."
  );

  assert(
    shell.includes("Build 149 · Marble Standard"),
    "Build 149 shell must expose the current interface build."
  );

  assert(
    verify148.includes('shell.includes("Marble Standard")') &&
      !verify148.includes('shell.includes("Build 148 · Marble Standard")'),
    "Build 148 verifier must remain forward-compatible after the Build 149 shell label."
  );

  assert(
    pkg.includes("verify-build-149-repair-recovery-filtering-renewal-preset-recovery-receipt-search.ts"),
    "Build 149 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit recovery search preset recovery audit filtering") &&
      docLower.includes("renewal recovery audit search preset recovery") &&
      docLower.includes("receipt recovery audit search preset recovery audit search") &&
      docLower.includes("manual") &&
      docLower.includes("rls"),
    "Build 149 documentation must preserve browser-local evidence and workflow authority boundaries."
  );

  console.log(
    "Build 149 repair recovery filtering, renewal preset recovery and receipt recovery search verification passed."
  );
}

void main();

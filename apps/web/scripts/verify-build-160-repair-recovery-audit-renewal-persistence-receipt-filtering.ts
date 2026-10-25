import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const first =
    createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
      auditId: "repair-search-preset-recovery-deep-1",
      createdAt: 1_800_000_000_000,
      requestedPresetId: "retired-repair-a",
      recoveredPresetId: "all",
      reason: "Recovered unsupported repair search-preset recovery audit search preset."
    });
  const second =
    createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({
      auditId: "repair-search-preset-recovery-deep-2",
      createdAt: 1_800_000_001_000,
      requestedPresetId: "retired-repair-b",
      recoveredPresetId: "recent-7d",
      reason: "Recovered repair search-preset recovery audit search preset."
    });

  const repairRecoveryAudit =
    prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(
      prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry([], first),
      second
    );

  assert(
    repairRecoveryAudit.length === 2 &&
      repairRecoveryAudit[0]?.auditId === "repair-search-preset-recovery-deep-2" &&
      repairRecoveryAudit[1]?.auditId === "repair-search-preset-recovery-deep-1",
    "Build 160 deepest repair search-preset recovery audit must retain newest-first evidence."
  );

  assert(
    sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-24h") === "recent-24h" &&
      sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recovery-reasons") === "recovery-reasons" &&
      sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired") === "all" &&
      INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes(
        "renewal-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset"
      ),
    "Build 160 newest renewal search preset persistence must use a dedicated sanitized local namespace."
  );

  const now = 1_800_000_000_000;
  const receiptAudit: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
    {
      version: 1,
      auditId: "receipt-deep-recent",
      createdAt: now - 60 * 60 * 1000,
      requestedPresetId: "retired-a",
      recoveredPresetId: "all",
      reason: "Recent receipt search-preset recovery."
    },
    {
      version: 1,
      auditId: "receipt-deep-week",
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-b",
      recoveredPresetId: "recent-7d",
      reason: "Weekly receipt search-preset recovery."
    },
    {
      version: 1,
      auditId: "receipt-deep-old",
      createdAt: now - 10 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-c",
      recoveredPresetId: "all",
      reason: "Old receipt search-preset recovery."
    }
  ];

  assert(
    filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      receiptAudit,
      "24h",
      now
    ).map((entry) => entry.auditId).join(",") === "receipt-deep-recent" &&
      filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        receiptAudit,
        "7d",
        now
      ).map((entry) => entry.auditId).join(",") === "receipt-deep-recent,receipt-deep-week" &&
      filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        receiptAudit,
        "all",
        now
      ).length === 3,
    "Build 160 newest receipt recovery audit filtering must support all, 24h and 7d while preserving order."
  );

  const [insights, shell, css, help, pkg, verify159, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-159-repair-recovery-renewal-presets-receipt-recovery-audit.ts"),
    source("../../../docs/BUILD_160_REPAIR_RECOVERY_AUDIT_RENEWAL_PERSISTENCE_RECEIPT_FILTERING.md")
  ]);

  for (const token of [
    "readRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "readRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "clearRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "filteredReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter"
  ]) {
    assert(insights.includes(token), "Build 160 Insights UI missing: " + token);
  }

  assert(
    insights.includes("Repair search-preset recovery audit search preset recovery audit") &&
      insights.includes("Export search preset recovery audit") &&
      insights.includes("Clear search preset recovery audit") &&
      insights.includes(
        "writeRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset("
      ) &&
      insights.includes(
        "clearRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset();"
      ) &&
      insights.includes("applied and saved locally") &&
      insights.includes(
        "No receipt search-preset recovery audit search preset recoveries match the selected age filter."
      ),
    "Build 160 must expose repair recovery evidence, persist renewal presets, and filter newest receipt recovery evidence."
  );

  for (const selector of [
    ".interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    ".interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditFilters"
  ]) {
    assert(css.includes(selector), "Build 160 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit",
    "renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-persistence",
    "receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-filtering"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 160 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 160 repair recovery audit, renewal preset persistence & receipt recovery audit filtering"
    ),
    "Help Center must register the Build 160 help group."
  );

  assert(
    shell.includes("Build 160 · Marble Standard"),
    "Build 160 shell must expose the current interface build."
  );

  assert(
    verify159.includes('shell.includes("Marble Standard")') &&
      !verify159.includes('shell.includes("Build 159 · Marble Standard")'),
    "Build 159 verifier must remain forward-compatible after the Build 160 shell label."
  );

  assert(
    pkg.includes(
      "verify-build-160-repair-recovery-audit-renewal-persistence-receipt-filtering.ts"
    ),
    "Build 160 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes(
        "recovery audit recovery search preset recovery audit search preset recovery audit search preset recovery audit"
      ) &&
      docLower.includes(
        "renewal recovery audit search preset recovery audit search preset recovery audit search preset persistence"
      ) &&
      docLower.includes(
        "receipt recovery audit search preset recovery audit search preset recovery audit search preset recovery audit filtering"
      ) &&
      docLower.includes("manual") &&
      docLower.includes("rls"),
    "Build 160 documentation must preserve browser-local evidence and workflow authority boundaries."
  );

  console.log(
    "Build 160 repair recovery audit, renewal preset persistence and receipt recovery filtering verification passed."
  );
}

void main();

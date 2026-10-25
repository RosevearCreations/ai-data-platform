import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntry,
  filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit,
  prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntry,
  sanitizeInterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId,
  type InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntryV1,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const first =
    createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntry({
      auditId: "repair-recovery-1",
      createdAt: 1_800_000_000_000,
      requestedPresetId: "retired-repair-view",
      recoveredPresetId: "all",
      reason: "Recovered because the saved repair preset is no longer supported."
    });
  const second =
    createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntry({
      auditId: "repair-recovery-2",
      createdAt: 1_800_000_001_000,
      requestedPresetId: "retired-repair-view-2",
      recoveredPresetId: "recent-7d",
      reason: "Recovered to a supported repair preset."
    });
  const repairLedger: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntryV1[] =
    prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntry(
      prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntry([], first),
      second
    );

  assert(
    repairLedger.length === 2 &&
      repairLedger[0]?.auditId === "repair-recovery-2" &&
      repairLedger[1]?.auditId === "repair-recovery-1",
    "Build 148 repair-search-preset recovery audit must retain newest-first bounded evidence."
  );

  assert(
    sanitizeInterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId("recent-24h") === "recent-24h" &&
      sanitizeInterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId("recovery-reasons") === "recovery-reasons" &&
      sanitizeInterfaceRecoveryRenewalSearchPresetRecoveryAuditSearchPresetId("retired") === "all" &&
      INTERFACE_RECOVERY_RENEWAL_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes(
        "renewal-recovery-audit-search-preset"
      ),
    "Build 148 renewal recovery-audit search preset persistence must use a dedicated sanitized local namespace."
  );

  const now = 1_800_000_000_000;
  const receiptAudit: InterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
    {
      version: 1,
      auditId: "recent",
      createdAt: now - 60 * 60 * 1000,
      requestedPresetId: "old",
      recoveredPresetId: "all",
      reason: "Recent recovery."
    },
    {
      version: 1,
      auditId: "week",
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
      requestedPresetId: "older",
      recoveredPresetId: "all",
      reason: "Weekly recovery."
    },
    {
      version: 1,
      auditId: "old",
      createdAt: now - 10 * 24 * 60 * 60 * 1000,
      requestedPresetId: "oldest",
      recoveredPresetId: "all",
      reason: "Old recovery."
    }
  ];
  assert(
    filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit(
      receiptAudit,
      "24h",
      now
    ).map((entry) => entry.auditId).join(",") === "recent" &&
      filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit(
        receiptAudit,
        "7d",
        now
      ).map((entry) => entry.auditId).join(",") === "recent,week" &&
      filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAudit(
        receiptAudit,
        "all",
        now
      ).length === 3,
    "Build 148 receipt preset-recovery repair audit filtering must support all, 24h and 7d views while preserving order."
  );

  const [insights, shell, css, help, pkg, verify147, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-147-repair-preset-recovery-renewal-audit-presets-receipt-recovery-audit.ts"),
    source("../../../docs/BUILD_148_REPAIR_RECOVERY_AUDIT_RENEWAL_PRESET_PERSISTENCE_RECEIPT_FILTERING.md")
  ]);

  for (const token of [
    "readRecoveryAuditRepairSearchPresetRecoveryAudit",
    "writeRecoveryAuditRepairSearchPresetRecoveryAudit",
    "createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntry",
    "readRenewalRecoveryAuditSearchPreset",
    "writeRenewalRecoveryAuditSearchPreset",
    "clearRenewalRecoveryAuditSearchPreset",
    "filteredReceiptRecoveryAuditSearchPresetRecoveryAudit",
    "receiptRecoveryAuditSearchPresetRecoveryAuditAgeFilter"
  ]) {
    assert(insights.includes(token), "Build 148 Insights UI missing: " + token);
  }

  assert(
    insights.includes("Export repair preset recovery audit") &&
      insights.includes("Clear repair preset recovery audit") &&
      insights.includes("writeRenewalRecoveryAuditSearchPreset(preset.id)") &&
      insights.includes("clearRenewalRecoveryAuditSearchPreset();") &&
      insights.includes("Showing {filteredReceiptRecoveryAuditSearchPresetRecoveryAudit.length}") &&
      insights.includes("No receipt recovery-audit preset repairs match the selected age filter."),
    "Build 148 must expose repair recovery evidence, persist renewal audit presets, and filter receipt preset-repair evidence."
  );

  for (const selector of [
    ".interfaceRecoveryAuditRepairPresetRecoveryAudit",
    ".interfaceRecoveryAuditRepairPresetRecoveryAuditList",
    ".interfaceReceiptRecoveryAuditPresetRecoveryAuditFilters"
  ]) {
    assert(css.includes(selector), "Build 148 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-recovery-audit",
    "renewal-search-preset-recovery-audit-search-preset-persistence",
    "receipt-recovery-audit-search-preset-recovery-audit-filtering"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 148 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 148 repair preset recovery audit, renewal recovery audit preset persistence & receipt recovery audit filtering"
    ),
    "Help Center must register the Build 148 help group."
  );

  assert(
    shell.includes("Marble Standard"),
    "Build 148 shell must expose the current interface build."
  );

  assert(
    verify147.includes('shell.includes("Marble Standard")') &&
      !verify147.includes('shell.includes("Build 147 · Marble Standard")'),
    "Build 147 verifier must remain forward-compatible after the Build 148 shell label."
  );

  assert(
    pkg.includes("verify-build-148-repair-recovery-audit-renewal-preset-persistence-receipt-filtering.ts"),
    "Build 148 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit recovery search preset recovery audit") &&
      docLower.includes("renewal recovery audit search preset persistence") &&
      docLower.includes("receipt recovery audit search preset recovery audit filtering") &&
      docLower.includes("manual") &&
      docLower.includes("rls"),
    "Build 148 documentation must preserve browser-local evidence and workflow authority boundaries."
  );

  console.log(
    "Build 148 repair recovery audit, renewal preset persistence and receipt recovery filtering verification passed."
  );
}

void main();

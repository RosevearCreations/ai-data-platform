import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntry,
  interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntry,
  searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAudit,
  type InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntryV1,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const repairAudit: InterfaceRecoveryAuditRepairSearchPresetRecoveryAuditEntryV1[] = [
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
    searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAudit(
      repairAudit,
      "alpha"
    ).map((entry) => entry.auditId).join(",") === "repair-alpha" &&
      searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAudit(
        repairAudit,
        "recent-7d"
      ).map((entry) => entry.auditId).join(",") === "repair-beta" &&
      searchInterfaceRecoveryAuditRepairSearchPresetRecoveryAudit(
        repairAudit,
        ""
      ).length === 2,
    "Build 150 repair-preset recovery audit search must match IDs, recovered preset IDs, reasons and blank queries."
  );

  const first =
    createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntry({
      auditId: "renewal-repair-1",
      createdAt: 1_800_000_000_000,
      requestedPresetId: "retired-renewal-a",
      recoveredPresetId: "all",
      reason: "Recovered unsupported renewal recovery-audit preset."
    });
  const second =
    createInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntry({
      auditId: "renewal-repair-2",
      createdAt: 1_800_000_001_000,
      requestedPresetId: "retired-renewal-b",
      recoveredPresetId: "recent-7d",
      reason: "Recovered to a supported renewal recovery-audit preset."
    });
  const renewalAudit: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntryV1[] =
    prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntry(
      prependInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntry([], first),
      second
    );

  assert(
    renewalAudit.length === 2 &&
      renewalAudit[0]?.auditId === "renewal-repair-2" &&
      renewalAudit[1]?.auditId === "renewal-repair-1",
    "Build 150 renewal recovery-audit preset recovery audit must retain newest-first evidence."
  );

  const receiptPresetIds =
    INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(
      (preset) => preset.id
    );
  assert(
    receiptPresetIds.join(",") ===
      "all,recent-24h,recent-7d,recovered-all,recovery-reasons" &&
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-24h").ageFilter === "24h" &&
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-7d").ageFilter === "7d" &&
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recovered-all").query === "all" &&
      interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recovery-reasons").query === "recovered",
    "Build 150 receipt preset-repair audit search presets must map deterministic age/search views."
  );

  const [insights, shell, css, help, pkg, verify149, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-149-repair-recovery-filtering-renewal-preset-recovery-receipt-search.ts"),
    source("../../../docs/BUILD_150_REPAIR_SEARCH_RENEWAL_RECOVERY_AUDIT_RECEIPT_PRESETS.md")
  ]);

  for (const token of [
    "recoveryAuditRepairSearchPresetRecoveryAuditSearch",
    "searchedRecoveryAuditRepairSearchPresetRecoveryAudit",
    "readRenewalRecoveryAuditSearchPresetRecoveryAudit",
    "writeRenewalRecoveryAuditSearchPresetRecoveryAudit",
    "renewalRecoveryAuditSearchPresetRecoveryAudit",
    "INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map",
    "applyReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPreset"
  ]) {
    assert(insights.includes(token), "Build 150 Insights UI missing: " + token);
  }

  assert(
    insights.includes("Search repair-preset recoveries") &&
      insights.includes("Renewal recovery audit preset recovery audit") &&
      insights.includes("Export preset recovery audit") &&
      insights.includes("Receipt preset-repair audit search presets") &&
      insights.includes("setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null)"),
    "Build 150 must visibly search repair recovery evidence, retain renewal preset-recovery audit evidence, and apply receipt repair search presets."
  );

  for (const selector of [
    ".interfaceRecoveryAuditRepairPresetRecoveryAuditFilters",
    ".interfaceRenewalRecoveryAuditPresetRecoveryAudit",
    ".interfaceReceiptRecoveryAuditPresetRecoveryAuditSearchPresets"
  ]) {
    assert(css.includes(selector), "Build 150 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-recovery-audit-search",
    "renewal-search-preset-recovery-audit-search-preset-recovery-audit",
    "receipt-recovery-audit-search-preset-recovery-audit-search-presets"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 150 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 150 repair recovery audit search, renewal recovery audit preset recovery audit & receipt recovery audit search presets"
    ),
    "Help Center must register the Build 150 help group."
  );

  assert(
    shell.includes("Build 150 · Marble Standard"),
    "Build 150 shell must expose the current interface build."
  );

  assert(
    verify149.includes('shell.includes("Marble Standard")') &&
      !verify149.includes('shell.includes("Build 149 · Marble Standard")'),
    "Build 149 verifier must remain forward-compatible after the Build 150 shell label."
  );

  assert(
    pkg.includes("verify-build-150-repair-search-renewal-recovery-audit-receipt-presets.ts"),
    "Build 150 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit recovery search preset recovery audit search") &&
      docLower.includes("renewal recovery audit search preset recovery audit") &&
      docLower.includes("receipt recovery audit search preset recovery audit search presets") &&
      docLower.includes("manual") &&
      docLower.includes("rls"),
    "Build 150 documentation must preserve browser-local evidence and workflow authority boundaries."
  );

  console.log(
    "Build 150 repair audit search, renewal preset recovery audit and receipt repair search preset verification passed."
  );
}

void main();

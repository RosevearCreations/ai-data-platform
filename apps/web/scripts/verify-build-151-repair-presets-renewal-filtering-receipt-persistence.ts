import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAudit,
  interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetById,
  sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const repairPresetIds =
    INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(
      (preset) => preset.id
    );
  assert(
    repairPresetIds.join(",") ===
      "all,recent-24h,recent-7d,recovered-all,recovery-reasons" &&
      interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetById("recent-24h").ageFilter === "24h" &&
      interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetById("recent-7d").ageFilter === "7d" &&
      interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetById("recovered-all").query === "all" &&
      interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetById("recovery-reasons").query === "recovered",
    "Build 151 repair-preset recovery audit search presets must map deterministic age/search views."
  );

  const now = 1_800_000_000_000;
  const renewalAudit: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntryV1[] = [
    {
      version: 1,
      auditId: "renewal-recent",
      createdAt: now - 60 * 60 * 1000,
      requestedPresetId: "retired-a",
      recoveredPresetId: "all",
      reason: "Recent renewal preset repair."
    },
    {
      version: 1,
      auditId: "renewal-week",
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-b",
      recoveredPresetId: "recent-7d",
      reason: "Weekly renewal preset repair."
    },
    {
      version: 1,
      auditId: "renewal-old",
      createdAt: now - 10 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-c",
      recoveredPresetId: "all",
      reason: "Old renewal preset repair."
    }
  ];

  assert(
    filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAudit(
      renewalAudit,
      "24h",
      now
    ).map((entry) => entry.auditId).join(",") === "renewal-recent" &&
      filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAudit(
        renewalAudit,
        "7d",
        now
      ).map((entry) => entry.auditId).join(",") === "renewal-recent,renewal-week" &&
      filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAudit(
        renewalAudit,
        "all",
        now
      ).length === 3,
    "Build 151 renewal preset-recovery audit filtering must support all, 24h and 7d while preserving order."
  );

  assert(
    sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-24h") === "recent-24h" &&
      sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recovery-reasons") === "recovery-reasons" &&
      sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired") === "all" &&
      INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes(
        "receipt-recovery-audit-preset-recovery-audit-search-preset"
      ),
    "Build 151 receipt preset-repair audit search preset persistence must use a dedicated sanitized local namespace."
  );

  const [insights, shell, css, help, pkg, verify150, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-150-repair-search-renewal-recovery-audit-receipt-presets.ts"),
    source("../../../docs/BUILD_151_REPAIR_PRESETS_RENEWAL_FILTERING_RECEIPT_PERSISTENCE.md")
  ]);

  for (const token of [
    "INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map",
    "recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId",
    "filteredRenewalRecoveryAuditSearchPresetRecoveryAudit",
    "renewalRecoveryAuditSearchPresetRecoveryAuditAgeFilter",
    "readReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "clearReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPreset"
  ]) {
    assert(insights.includes(token), "Build 151 Insights UI missing: " + token);
  }

  assert(
    insights.includes("Repair-preset recovery audit search presets") &&
      insights.includes("No renewal recovery-audit preset repairs match the selected age filter and search.") &&
      insights.includes("selected preset persists in this browser") &&
      insights.includes("writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPreset(preset.id)") &&
      insights.includes("clearReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPreset();"),
    "Build 151 must expose repair quick presets, renewal repair filtering, and receipt preset persistence."
  );

  for (const selector of [
    ".interfaceRecoveryAuditRepairPresetRecoveryAuditSearchPresets",
    ".interfaceRenewalRecoveryAuditPresetRecoveryAuditFilters",
    ".interfaceReceiptRecoveryAuditPresetRecoveryAuditSearchPresets"
  ]) {
    assert(css.includes(selector), "Build 151 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-recovery-audit-search-presets",
    "renewal-search-preset-recovery-audit-search-preset-recovery-audit-filtering",
    "receipt-recovery-audit-search-preset-recovery-audit-search-preset-persistence"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 151 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 151 repair recovery audit search presets, renewal recovery audit filtering & receipt repair preset persistence"
    ),
    "Help Center must register the Build 151 help group."
  );

  assert(
    shell.includes("Marble Standard"),
    "Build 151 shell must expose the current interface build."
  );

  assert(
    verify150.includes('shell.includes("Marble Standard")') &&
      !verify150.includes('shell.includes("Build 150 · Marble Standard")'),
    "Build 150 verifier must remain forward-compatible after the Build 151 shell label."
  );

  assert(
    pkg.includes("verify-build-151-repair-presets-renewal-filtering-receipt-persistence.ts"),
    "Build 151 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit recovery search preset recovery audit search presets") &&
      docLower.includes("renewal recovery audit search preset recovery audit filtering") &&
      docLower.includes("receipt recovery audit search preset recovery audit search preset persistence") &&
      docLower.includes("manual") &&
      docLower.includes("rls"),
    "Build 151 documentation must preserve browser-local evidence and workflow authority boundaries."
  );

  console.log(
    "Build 151 repair presets, renewal filtering and receipt preset persistence verification passed."
  );
}

void main();

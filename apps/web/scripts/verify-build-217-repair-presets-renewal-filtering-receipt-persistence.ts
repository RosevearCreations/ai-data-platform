import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const repairPresetIds =
    INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(
      (preset) => preset.id
    );

  assert(
    repairPresetIds.join(",") ===
      "all,recent-24h,recent-7d,recovered-all,recovery-reasons" &&
      interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-24h").ageFilter === "24h" &&
      interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recent-7d").ageFilter === "7d" &&
      interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recovered-all").query === "all" &&
      interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById("recovery-reasons").query === "recovered",
    "Build 217 newest repair recovery search presets must map deterministic age/search views."
  );

  const now = 1_800_000_000_000;
  const renewalAudit: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
    {
      version: 1,
      auditId: "renewal-deep-new",
      createdAt: now - 60 * 60 * 1000,
      requestedPresetId: "retired-new",
      recoveredPresetId: "all",
      reason: "Recovered newest renewal preset."
    },
    {
      version: 1,
      auditId: "renewal-deep-week",
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-week",
      recoveredPresetId: "recent-7d",
      reason: "Recovered weekly renewal preset."
    },
    {
      version: 1,
      auditId: "renewal-deep-old",
      createdAt: now - 9 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-old",
      recoveredPresetId: "all",
      reason: "Recovered old renewal preset."
    }
  ];

  assert(
    filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      renewalAudit,
      "all",
      now
    ).length === 3 &&
      filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        renewalAudit,
        "24h",
        now
      ).map((entry) => entry.auditId).join(",") === "renewal-deep-new" &&
      filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        renewalAudit,
        "7d",
        now
      ).map((entry) => entry.auditId).join(",") === "renewal-deep-new,renewal-deep-week",
    "Build 217 newest renewal recovery audit filtering must preserve order and all/24h/7d behavior."
  );

  assert(
    INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes(
      "receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset"
    ) &&
      sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-7d") === "recent-7d" &&
      sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired-preset") === "all",
    "Build 217 newest receipt preset persistence must use a dedicated namespace and safe sanitizer."
  );

  const [insights, shell, css, help, pkg, verify216, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-216-repair-search-renewal-recovery-audit-receipt-presets.ts"),
    source("../../../docs/BUILD_217_REPAIR_PRESETS_RENEWAL_FILTERING_RECEIPT_PERSISTENCE.md")
  ]);

  for (const token of [
    "INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map",
    "recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId",
    "filteredRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter",
    "readReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "clearReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY"
  ]) {
    assert(insights.includes(token), "Build 217 Insights UI missing: " + token);
  }

  assert(
    insights.includes("Repair search-preset recovery audit search preset recovery audit search presets") &&
      insights.includes("the selected preset persists in this browser."),
    "Build 217 verifier must recognize repair presets, renewal filtering and persisted receipt preset behavior without depending on a later screen label."
  );

  for (const selector of [
    ".interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresets",
    ".interfaceRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditFilters",
    ".interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresets"
  ]) {
    assert(css.includes(selector), "Build 217 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-presets",
    "renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-filtering",
    "receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-persistence"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 217 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 217 repair recovery audit search presets, renewal recovery audit filtering & receipt recovery preset persistence"
    ),
    "Help Center must register the Build 217 help group."
  );

  assert(
    shell.includes("Marble Standard"),
    "Build 217 verifier must remain forward-compatible with later shell labels."
  );

  assert(
    verify216.includes('shell.includes("Marble Standard")') &&
      !verify216.includes('shell.includes("Build 216 · Marble Standard")'),
    "Build 216 verifier must remain forward-compatible after Build 217."
  );

  assert(
    pkg.includes("verify-build-217-repair-presets-renewal-filtering-receipt-persistence.ts"),
    "Build 217 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit recovery search preset recovery audit search preset recovery audit search preset recovery audit search presets") &&
      docLower.includes("renewal recovery audit search preset recovery audit search preset recovery audit search preset recovery audit filtering") &&
      docLower.includes("receipt recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search preset persistence") &&
      docLower.includes("manual") &&
      docLower.includes("rls"),
    "Build 217 documentation must preserve browser-local view state and workflow authority boundaries."
  );

  console.log(
    "Build 217 repair recovery presets, renewal recovery filtering and receipt preset persistence verification passed."
  );
}

void main();

import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById,
  sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const repairPresetIds =
    INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(
      (preset) => preset.id
    );

  assert(
    repairPresetIds.join(",") ===
      "all,recent-24h,recent-7d,recovered-all,recovery-reasons" &&
      interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        "recent-24h"
      ).ageFilter === "24h" &&
      interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        "recent-7d"
      ).ageFilter === "7d" &&
      interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        "recovered-all"
      ).query === "all" &&
      interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetById(
        "recovery-reasons"
      ).query === "recovered",
    "Build 157 repair search-preset recovery audit search presets must map deterministic age/search views."
  );

  const now = 1_800_000_000_000;
  const renewalAudit: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
    {
      version: 1,
      auditId: "renewal-new",
      createdAt: now - 60 * 60 * 1000,
      requestedPresetId: "retired-new",
      recoveredPresetId: "all",
      reason: "Recovered newest renewal preset."
    },
    {
      version: 1,
      auditId: "renewal-week",
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-week",
      recoveredPresetId: "recent-7d",
      reason: "Recovered weekly renewal preset."
    },
    {
      version: 1,
      auditId: "renewal-old",
      createdAt: now - 9 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-old",
      recoveredPresetId: "all",
      reason: "Recovered old renewal preset."
    }
  ];

  assert(
    filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      renewalAudit,
      "all",
      now
    ).length === 3 &&
      filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        renewalAudit,
        "24h",
        now
      ).map((entry) => entry.auditId).join(",") === "renewal-new" &&
      filterInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        renewalAudit,
        "7d",
        now
      ).map((entry) => entry.auditId).join(",") === "renewal-new,renewal-week",
    "Build 157 renewal search-preset recovery audit must filter all/24h/7d while preserving event order."
  );

  assert(
    INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes(
      "receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset"
    ) &&
      sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
        "recent-7d"
      ) === "recent-7d" &&
      sanitizeInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
        "retired-preset"
      ) === "all",
    "Build 157 receipt search-preset recovery audit preset persistence must use a dedicated namespace and safe sanitizer."
  );

  const [insights, shell, css, help, pkg, verify156, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-156-repair-search-renewal-recovery-audit-receipt-presets.ts"),
    source("../../../docs/BUILD_157_REPAIR_PRESETS_RENEWAL_FILTERING_RECEIPT_PERSISTENCE.md")
  ]);

  for (const token of [
    "INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map",
    "recoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId",
    "filteredRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditAgeFilter",
    "readReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "clearReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "INTERFACE_RECEIPT_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY"
  ]) {
    assert(insights.includes(token), "Build 157 Insights UI missing: " + token);
  }

  assert(
    insights.includes("Repair search-preset recovery audit search presets") &&
      insights.includes(
        "No renewal preset-recovery audit search preset repairs match the selected age filter."
      ) &&
      insights.includes("the selected preset persists in this browser.") &&
      insights.includes(
        "setRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null)"
      ) &&
      insights.includes(
        "setReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(null)"
      ),
    "Build 157 must expose repair search presets, renewal filtering and persisted receipt preset behavior."
  );

  for (const selector of [
    ".interfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresets",
    ".interfaceRenewalRecoveryAuditSearchPresetRecoveryAuditFilters",
    ".interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresets"
  ]) {
    assert(css.includes(selector), "Build 157 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search-presets",
    "renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-filtering",
    "receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-persistence"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 157 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 157 repair recovery audit search presets, renewal recovery audit filtering & receipt recovery preset persistence"
    ),
    "Help Center must register the Build 157 help group."
  );

  assert(
    shell.includes("Build 157 · Marble Standard"),
    "Build 157 shell must expose the current interface build."
  );

  assert(
    verify156.includes('shell.includes("Marble Standard")') &&
      !verify156.includes('shell.includes("Build 156 · Marble Standard")'),
    "Build 156 verifier must remain forward-compatible after the Build 157 shell label."
  );

  assert(
    pkg.includes(
      "verify-build-157-repair-presets-renewal-filtering-receipt-persistence.ts"
    ),
    "Build 157 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes(
        "recovery audit recovery search preset recovery audit search preset recovery audit search presets"
      ) &&
      docLower.includes(
        "renewal recovery audit search preset recovery audit search preset recovery audit filtering"
      ) &&
      docLower.includes(
        "receipt recovery audit search preset recovery audit search preset recovery audit search preset persistence"
      ) &&
      docLower.includes("manual") &&
      docLower.includes("rls"),
    "Build 157 documentation must preserve browser-local view state and workflow authority boundaries."
  );

  console.log(
    "Build 157 repair recovery presets, renewal recovery filtering and receipt preset persistence verification passed."
  );
}

void main();

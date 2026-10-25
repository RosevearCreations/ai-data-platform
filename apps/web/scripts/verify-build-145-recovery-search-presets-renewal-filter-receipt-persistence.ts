import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS,
  filterInterfaceRecoveryRenewalSearchPresetRecoveryAudit,
  interfaceRecoveryAuditPresetRecoveryAuditSearchPresetById,
  interfaceReceiptPresetRecoveryAuditSearchPresetById,
  sanitizeInterfaceReceiptPresetRecoveryAuditSearchPresetId,
  type InterfaceRecoveryRenewalSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  const presetIds = INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map(
    (preset) => preset.id
  );
  assert(
    presetIds.join(",") ===
      "all,recent-24h,recent-7d,recovered-all,recovery-reasons" &&
      interfaceRecoveryAuditPresetRecoveryAuditSearchPresetById("recent-24h").ageFilter === "24h" &&
      interfaceRecoveryAuditPresetRecoveryAuditSearchPresetById("recent-7d").ageFilter === "7d" &&
      interfaceRecoveryAuditPresetRecoveryAuditSearchPresetById("recovered-all").query === "all" &&
      interfaceRecoveryAuditPresetRecoveryAuditSearchPresetById("recovery-reasons").query === "recovered",
    "Build 145 recovery-audit repair search presets must map deterministic age/search views."
  );

  const now = 1_800_000_000_000;
  const audit: InterfaceRecoveryRenewalSearchPresetRecoveryAuditEntryV1[] = [
    {
      version: 1,
      auditId: "recent",
      createdAt: now - 60 * 60 * 1000,
      requestedPresetId: "retired-recent",
      recoveredPresetId: "all",
      reason: "Recovered recently."
    },
    {
      version: 1,
      auditId: "week",
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-week",
      recoveredPresetId: "all",
      reason: "Recovered this week."
    },
    {
      version: 1,
      auditId: "old",
      createdAt: now - 10 * 24 * 60 * 60 * 1000,
      requestedPresetId: "retired-old",
      recoveredPresetId: "all",
      reason: "Recovered earlier."
    }
  ];

  assert(
    filterInterfaceRecoveryRenewalSearchPresetRecoveryAudit(audit, "all", now).length === 3 &&
      filterInterfaceRecoveryRenewalSearchPresetRecoveryAudit(audit, "24h", now).map((entry) => entry.auditId).join(",") === "recent" &&
      filterInterfaceRecoveryRenewalSearchPresetRecoveryAudit(audit, "7d", now).map((entry) => entry.auditId).join(",") === "recent,week",
    "Build 145 renewal-preset recovery audit age filtering must preserve order and apply 24h/7d windows."
  );

  assert(
    sanitizeInterfaceReceiptPresetRecoveryAuditSearchPresetId("recent-24h") === "recent-24h" &&
      sanitizeInterfaceReceiptPresetRecoveryAuditSearchPresetId("recovered-all") === "recovered-all" &&
      sanitizeInterfaceReceiptPresetRecoveryAuditSearchPresetId("retired-preset") === "all" &&
      INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes(
        "receipt-preset-recovery-audit-search-preset"
      ) &&
      interfaceReceiptPresetRecoveryAuditSearchPresetById("recent-7d").ageFilter === "7d",
    "Build 145 receipt-recovery audit search preset persistence must use a dedicated sanitized local namespace."
  );

  const [insights, shell, css, help, pkg, verify144, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-144-audit-recovery-search-renewal-audit-receipt-presets.ts"),
    source("../../../docs/BUILD_145_RECOVERY_SEARCH_PRESETS_RENEWAL_AUDIT_FILTER_RECEIPT_PRESET_PERSISTENCE.md")
  ]);

  for (const token of [
    "INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_SEARCH_PRESETS.map",
    "applyRecoveryAuditPresetRecoveryAuditSearchPreset",
    "filteredRenewalHistoryPresetRecoveryAudit",
    "writeReceiptPresetRecoveryAuditSearchPreset",
    "clearReceiptPresetRecoveryAuditSearchPreset",
    "readReceiptPresetRecoveryAuditSearchPreset"
  ]) {
    assert(insights.includes(token), "Build 145 Insights UI missing: " + token);
  }

  assert(
    insights.includes("setRecoveryAuditPresetRecoveryAuditSearchPresetId(null)") &&
      insights.includes("setRenewalHistoryPresetRecoveryAuditAgeFilter") &&
      insights.includes("clearReceiptPresetRecoveryAuditSearchPreset();") &&
      insights.includes("INTERFACE_RECEIPT_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY"),
    "Build 145 must connect manual custom views, renewal filtering and persisted receipt preset cleanup."
  );

  for (const selector of [
    ".interfaceRecoveryAuditRecoverySearchPresets",
    ".interfaceRenewalPresetRecoveryAuditFilters"
  ]) {
    assert(css.includes(selector), "Build 145 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-presets",
    "renewal-search-preset-recovery-audit-filtering",
    "receipt-recovery-audit-search-preset-persistence"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 145 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 145 recovery search presets, renewal recovery audit filtering & receipt recovery preset persistence"
    ),
    "Help Center must register the Build 145 help group."
  );

  assert(
    shell.includes("Marble Standard"),
    "Build 145 shell must expose the current interface build."
  );

  assert(
    verify144.includes('shell.includes("Build 144 · Marble Standard")') === false &&
      verify144.includes('shell.includes("Marble Standard")'),
    "Build 144 verifier must remain forward-compatible after the Build 145 shell label."
  );

  assert(
    pkg.includes("verify-build-145-recovery-search-presets-renewal-filter-receipt-persistence.ts"),
    "Build 145 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit recovery search presets") &&
      docLower.includes("renewal search preset recovery audit filtering") &&
      docLower.includes("receipt recovery audit search preset persistence") &&
      docLower.includes("manual") &&
      docLower.includes("rls"),
    "Build 145 documentation must preserve browser-local view and authority boundaries."
  );

  console.log(
    "Build 145 recovery search presets, renewal audit filtering and receipt preset persistence verification passed."
  );
}

void main();

import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId,
  searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAudit,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  assert(
    sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId("recent-24h") === "recent-24h" &&
      sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId("recovery-reasons") === "recovery-reasons" &&
      sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetId("retired") === "all" &&
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes(
        "recovery-audit-repair-preset-recovery-audit-search-preset"
      ),
    "Build 152 repair-preset recovery audit search preset persistence must use a dedicated sanitized local namespace."
  );

  const renewalAudit: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditEntryV1[] = [
    {
      version: 1,
      auditId: "renewal-alpha",
      createdAt: 1_800_000_000_000,
      requestedPresetId: "retired-alpha",
      recoveredPresetId: "all",
      reason: "Recovered alpha renewal preset."
    },
    {
      version: 1,
      auditId: "renewal-beta",
      createdAt: 1_799_999_999_000,
      requestedPresetId: "retired-beta",
      recoveredPresetId: "recent-7d",
      reason: "Recovered beta renewal preset."
    }
  ];

  assert(
    searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAudit(
      renewalAudit,
      "alpha"
    ).map((entry) => entry.auditId).join(",") === "renewal-alpha" &&
      searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAudit(
        renewalAudit,
        "recent-7d"
      ).map((entry) => entry.auditId).join(",") === "renewal-beta" &&
      searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAudit(
        renewalAudit,
        ""
      ).length === 2,
    "Build 152 renewal preset-recovery audit search must match IDs, recovered preset IDs, reasons and blank queries."
  );

  const recovered =
    recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      "retired-receipt-repair-view"
    );
  const valid =
    recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      "recent-7d"
    );
  assert(
    recovered.recovered &&
      recovered.presetId === "all" &&
      recovered.reason?.includes("no longer supported") &&
      !valid.recovered &&
      valid.presetId === "recent-7d",
    "Build 152 receipt preset-repair audit search preset recovery must repair unsupported persisted IDs to All preset repairs."
  );

  const [insights, shell, css, help, pkg, verify151, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-151-repair-presets-renewal-filtering-receipt-persistence.ts"),
    source("../../../docs/BUILD_152_REPAIR_PERSISTENCE_RENEWAL_SEARCH_RECEIPT_RECOVERY.md")
  ]);

  for (const token of [
    "readRecoveryAuditRepairSearchPresetRecoveryAuditSearchPreset",
    "writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPreset",
    "clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPreset",
    "searchedRenewalRecoveryAuditSearchPresetRecoveryAudit",
    "renewalRecoveryAuditSearchPresetRecoveryAuditSearch",
    "readReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery",
    "receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice"
  ]) {
    assert(insights.includes(token), "Build 152 Insights UI missing: " + token);
  }

  assert(
    insights.includes("writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPreset(preset.id)") &&
      insights.includes("clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPreset();") &&
      insights.includes("Search preset recoveries") &&
      insights.includes("Receipt preset-repair audit search preset recovered") &&
      insights.includes("writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPreset("),
    "Build 152 must persist repair presets, search renewal repair evidence, and recover receipt repair presets."
  );

  for (const selector of [
    ".interfaceRenewalRecoveryAuditPresetRecoveryAuditFilters",
    ".interfaceReceiptRecoveryAuditSearchPresetRecovery"
  ]) {
    assert(css.includes(selector), "Build 152 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-recovery-audit-search-preset-persistence",
    "renewal-search-preset-recovery-audit-search-preset-recovery-audit-search",
    "receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 152 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 152 repair preset persistence, renewal recovery audit search & receipt repair preset recovery"
    ),
    "Help Center must register the Build 152 help group."
  );

  assert(
    shell.includes("Build 152 · Marble Standard"),
    "Build 152 shell must expose the current interface build."
  );

  assert(
    verify151.includes('shell.includes("Marble Standard")') &&
      !verify151.includes('shell.includes("Build 151 · Marble Standard")'),
    "Build 151 verifier must remain forward-compatible after the Build 152 shell label."
  );

  assert(
    pkg.includes("verify-build-152-repair-persistence-renewal-search-receipt-recovery.ts"),
    "Build 152 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit recovery search preset recovery audit search preset persistence") &&
      docLower.includes("renewal recovery audit search preset recovery audit search") &&
      docLower.includes("receipt recovery audit search preset recovery audit search preset recovery") &&
      docLower.includes("manual") &&
      docLower.includes("rls"),
    "Build 152 documentation must preserve browser-local evidence and workflow authority boundaries."
  );

  console.log(
    "Build 152 repair preset persistence, renewal recovery audit search and receipt preset recovery verification passed."
  );
}

void main();

import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  recoverInterfaceReceiptPresetRecoveryAuditSearchPresetId,
  sanitizeInterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId,
  searchInterfaceRecoveryRenewalSearchPresetRecoveryAudit,
  type InterfaceRecoveryRenewalSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  assert(
    sanitizeInterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId("recent-24h") === "recent-24h" &&
      sanitizeInterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId("recovery-reasons") === "recovery-reasons" &&
      sanitizeInterfaceRecoveryAuditPresetRecoveryAuditSearchPresetId("retired") === "all" &&
      INTERFACE_RECOVERY_AUDIT_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes(
        "recovery-audit-preset-recovery-audit-search-preset"
      ),
    "Build 146 repair-ledger search preset persistence must use a dedicated sanitized browser-local namespace."
  );

  const audit: InterfaceRecoveryRenewalSearchPresetRecoveryAuditEntryV1[] = [
    {
      version: 1,
      auditId: "renewal-alpha",
      createdAt: 1_800_000_000_000,
      requestedPresetId: "retired-expired",
      recoveredPresetId: "all",
      reason: "Recovered because the saved preset is no longer supported."
    },
    {
      version: 1,
      auditId: "renewal-beta",
      createdAt: 1_799_999_999_000,
      requestedPresetId: "retired-favorites",
      recoveredPresetId: "all",
      reason: "Favorites preset recovered."
    }
  ];

  assert(
    searchInterfaceRecoveryRenewalSearchPresetRecoveryAudit(audit, "renewal-alpha")[0]?.auditId === "renewal-alpha" &&
      searchInterfaceRecoveryRenewalSearchPresetRecoveryAudit(audit, "retired-favorites")[0]?.auditId === "renewal-beta" &&
      searchInterfaceRecoveryRenewalSearchPresetRecoveryAudit(audit, "ALL").length === 2 &&
      searchInterfaceRecoveryRenewalSearchPresetRecoveryAudit(audit, "no longer supported")[0]?.auditId === "renewal-alpha" &&
      searchInterfaceRecoveryRenewalSearchPresetRecoveryAudit(audit, "missing").length === 0,
    "Build 146 renewal recovery audit search must match audit ID, requested preset, recovered preset and reason case-insensitively."
  );

  const recovered = recoverInterfaceReceiptPresetRecoveryAuditSearchPresetId(
    "retired-receipt-view"
  );
  const valid = recoverInterfaceReceiptPresetRecoveryAuditSearchPresetId(
    "recent-7d"
  );
  assert(
    recovered.recovered &&
      recovered.presetId === "all" &&
      recovered.reason?.includes("no longer supported") &&
      !valid.recovered &&
      valid.presetId === "recent-7d",
    "Build 146 receipt recovery audit search preset recovery must repair unsupported saved IDs to All recovery events."
  );

  const [insights, shell, css, help, pkg, verify145, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-145-recovery-search-presets-renewal-filter-receipt-persistence.ts"),
    source("../../../docs/BUILD_146_RECOVERY_PRESET_PERSISTENCE_RENEWAL_AUDIT_SEARCH_RECEIPT_PRESET_RECOVERY.md")
  ]);

  for (const token of [
    "readRecoveryAuditPresetRecoveryAuditSearchPreset",
    "writeRecoveryAuditPresetRecoveryAuditSearchPreset",
    "clearRecoveryAuditPresetRecoveryAuditSearchPreset",
    "searchedRenewalHistoryPresetRecoveryAudit",
    "readReceiptPresetRecoveryAuditSearchPresetRecovery",
    "receiptPresetRecoveryAuditSearchPresetRecoveryNotice"
  ]) {
    assert(insights.includes(token), "Build 146 Insights UI missing: " + token);
  }

  assert(
    insights.includes("writeRecoveryAuditPresetRecoveryAuditSearchPreset(preset.id)") &&
      insights.includes("clearRecoveryAuditPresetRecoveryAuditSearchPreset();") &&
      insights.includes("searchInterfaceRecoveryRenewalSearchPresetRecoveryAudit") &&
      insights.includes("writeReceiptPresetRecoveryAuditSearchPreset(") &&
      insights.includes("Receipt recovery audit preset recovered"),
    "Build 146 must persist repair presets, search renewal recovery evidence and visibly repair invalid receipt presets."
  );

  for (const selector of [
    ".interfaceRenewalPresetRecoveryAuditSearch",
    ".interfaceReceiptRecoveryAuditPresetRecovery"
  ]) {
    assert(css.includes(selector), "Build 146 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-persistence",
    "renewal-search-preset-recovery-audit-search",
    "receipt-recovery-audit-search-preset-recovery"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 146 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 146 recovery preset persistence, renewal recovery audit search & receipt recovery preset recovery"
    ),
    "Help Center must register the Build 146 help group."
  );

  assert(
    shell.includes("Build 146 · Marble Standard"),
    "Build 146 shell must expose the current interface build."
  );

  assert(
    verify145.includes('shell.includes("Marble Standard")') &&
      !verify145.includes('shell.includes("Build 145 · Marble Standard")'),
    "Build 145 verifier must remain forward-compatible after the Build 146 shell label."
  );

  assert(
    pkg.includes("verify-build-146-recovery-preset-persistence-renewal-search-receipt-recovery.ts"),
    "Build 146 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes("recovery audit recovery search preset persistence") &&
      docLower.includes("renewal search preset recovery audit search") &&
      docLower.includes("receipt recovery audit search preset recovery") &&
      docLower.includes("manual") &&
      docLower.includes("rls"),
    "Build 146 documentation must preserve browser-local view and authority boundaries."
  );

  console.log(
    "Build 146 recovery preset persistence, renewal audit search and receipt preset recovery verification passed."
  );
}

void main();

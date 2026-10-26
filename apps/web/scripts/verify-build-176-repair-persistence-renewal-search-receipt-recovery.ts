import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  assert(
    sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      "recent-24h"
    ) === "recent-24h" &&
      sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
        "recovery-reasons"
      ) === "recovery-reasons" &&
      sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
        "retired"
      ) === "all" &&
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes(
        "recovery-audit-repair-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset"
      ),
    "Build 176 newest repair preset persistence must use a dedicated sanitized local namespace."
  );

  const renewalAudit: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
    {
      version: 1,
      auditId: "renewal-deep-alpha",
      createdAt: 1_800_000_000_000,
      requestedPresetId: "retired-alpha",
      recoveredPresetId: "all",
      reason: "Recovered alpha newest renewal preset."
    },
    {
      version: 1,
      auditId: "renewal-deep-beta",
      createdAt: 1_799_999_999_000,
      requestedPresetId: "retired-beta",
      recoveredPresetId: "recent-7d",
      reason: "Recovered beta newest renewal preset."
    }
  ];

  assert(
    searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      renewalAudit,
      "alpha"
    ).map((entry) => entry.auditId).join(",") === "renewal-deep-alpha" &&
      searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        renewalAudit,
        "recent-7d"
      ).map((entry) => entry.auditId).join(",") === "renewal-deep-beta" &&
      searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        renewalAudit,
        ""
      ).length === 2,
    "Build 176 newest renewal recovery search must match IDs, preset IDs, reasons and blank queries."
  );

  const recovered =
    recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      "retired-receipt-search-preset"
    );
  const valid =
    recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      "recent-7d"
    );

  assert(
    recovered.recovered &&
      recovered.presetId === "all" &&
      recovered.reason?.includes("no longer supported") &&
      !valid.recovered &&
      valid.presetId === "recent-7d",
    "Build 176 newest receipt preset recovery must repair unsupported persisted IDs to All recoveries."
  );

  const [insights, shell, css, help, pkg, verify163, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-175-repair-presets-renewal-filtering-receipt-persistence.ts"),
    source("../../../docs/BUILD_176_REPAIR_PERSISTENCE_RENEWAL_SEARCH_RECEIPT_RECOVERY.md")
  ]);

  for (const token of [
    "readRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "searchedRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch",
    "readReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice"
  ]) {
    assert(insights.includes(token), "Build 176 Insights UI missing: " + token);
  }

  assert(
    insights.includes(
      "writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset("
    ) &&
      insights.includes(
        "clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset();"
      ) &&
      insights.includes("Search preset recoveries") &&
      insights.includes("Search newest renewal recovery audit evidence") &&
      insights.includes(
        "Receipt search-preset recovery audit search preset recovery audit search preset recovered"
      ) &&
      insights.includes(
        "writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset("
      ),
    "Build 176 must persist newest repair presets, search newest renewal recovery evidence, and safely recover newest receipt presets."
  );

  for (const selector of [
    ".interfaceRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch",
    ".interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery"
  ]) {
    assert(css.includes(selector), "Build 176 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-persistence",
    "renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search",
    "receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 176 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 176 repair recovery audit search preset persistence, renewal recovery audit search & receipt recovery preset recovery"
    ),
    "Help Center must register the Build 176 help group."
  );

  assert(
    shell.includes("Marble Standard"),
    "Build 176 verifier must remain forward-compatible with later shell labels."
  );

  assert(
    verify163.includes('shell.includes("Marble Standard")') &&
      !verify163.includes('shell.includes("Build 175 · Marble Standard")'),
    "Build 175 verifier must remain forward-compatible after Build 176."
  );

  assert(
    pkg.includes("verify-build-176-repair-persistence-renewal-search-receipt-recovery.ts"),
    "Build 176 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes(
        "recovery audit recovery search preset recovery audit search preset recovery audit search preset recovery audit search preset persistence"
      ) &&
      docLower.includes(
        "renewal recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search"
      ) &&
      docLower.includes(
        "receipt recovery audit search preset recovery audit search preset recovery audit search preset recovery audit search preset recovery"
      ) &&
      docLower.includes("manual") &&
      docLower.includes("rls"),
    "Build 176 documentation must preserve browser-local view state and workflow authority boundaries."
  );

  console.log(
    "Build 176 repair preset persistence, renewal recovery search and receipt preset recovery verification passed."
  );
}

void main();

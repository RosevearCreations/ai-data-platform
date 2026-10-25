import { readFile } from "node:fs/promises";

import { HELP_TOPICS } from "../app/help/help-content";
import {
  INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  type InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1
} from "../lib/navigation-preferences";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function source(relative: string) {
  return readFile(new URL(relative, import.meta.url), "utf8");
}

async function main() {
  assert(
    sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      "recent-24h"
    ) === "recent-24h" &&
      sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
        "recovery-reasons"
      ) === "recovery-reasons" &&
      sanitizeInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
        "retired"
      ) === "all" &&
      INTERFACE_RECOVERY_AUDIT_REPAIR_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes(
        "recovery-audit-repair-search-preset-recovery-audit-search-preset-recovery-audit-search-preset"
      ),
    "Build 158 repair search-preset recovery audit preset persistence must use a dedicated sanitized local namespace."
  );

  const renewalAudit: InterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntryV1[] = [
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
    searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
      renewalAudit,
      "alpha"
    ).map((entry) => entry.auditId).join(",") === "renewal-alpha" &&
      searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        renewalAudit,
        "recent-7d"
      ).map((entry) => entry.auditId).join(",") === "renewal-beta" &&
      searchInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(
        renewalAudit,
        ""
      ).length === 2,
    "Build 158 renewal preset-recovery audit search must match IDs, recovered preset IDs, reasons and blank queries."
  );

  const recovered =
    recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      "retired-receipt-search-preset"
    );
  const valid =
    recoverInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId(
      "recent-7d"
    );

  assert(
    recovered.recovered &&
      recovered.presetId === "all" &&
      recovered.reason?.includes("no longer supported") &&
      !valid.recovered &&
      valid.presetId === "recent-7d",
    "Build 158 receipt search-preset recovery audit preset recovery must repair unsupported persisted IDs to All recoveries."
  );

  const [insights, shell, css, help, pkg, verify157, doc] = await Promise.all([
    source("../app/NavigationInsights.tsx"),
    source("../app/application-shell.tsx"),
    source("../app/globals.css"),
    source("../app/help/help-content.ts"),
    source("../package.json"),
    source("./verify-build-157-repair-presets-renewal-filtering-receipt-persistence.ts"),
    source("../../../docs/BUILD_158_REPAIR_PERSISTENCE_RENEWAL_SEARCH_RECEIPT_RECOVERY.md")
  ]);

  for (const token of [
    "readRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset",
    "searchedRenewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit",
    "renewalRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearch",
    "readReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery",
    "receiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryNotice"
  ]) {
    assert(insights.includes(token), "Build 158 Insights UI missing: " + token);
  }

  assert(
    insights.includes(
      "writeRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset("
    ) &&
      insights.includes(
        "clearRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset();"
      ) &&
      insights.includes("Search preset recoveries") &&
      insights.includes(
        "No renewal preset-recovery audit search preset repairs match the selected age filter and search."
      ) &&
      insights.includes("Receipt search-preset recovery audit search preset recovered") &&
      insights.includes(
        "writeReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPreset("
      ),
    "Build 158 must persist repair presets, search renewal recovery evidence, and safely recover receipt presets."
  );

  for (const selector of [
    ".interfaceRenewalRecoveryAuditSearchPresetRecoveryAuditFilters",
    ".interfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecovery"
  ]) {
    assert(css.includes(selector), "Build 158 CSS contract missing: " + selector);
  }

  for (const topic of [
    "recovery-audit-recovery-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-persistence",
    "renewal-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search",
    "receipt-recovery-audit-search-preset-recovery-audit-search-preset-recovery-audit-search-preset-recovery"
  ] as const) {
    assert(topic in HELP_TOPICS, "Build 158 help topic missing: " + topic);
  }

  assert(
    help.includes(
      "Build 158 repair recovery audit search preset persistence, renewal recovery audit search & receipt recovery preset recovery"
    ),
    "Help Center must register the Build 158 help group."
  );

  assert(
    shell.includes("Marble Standard"),
    "Build 158 verifier must remain forward-compatible with later shell labels."
  );

  assert(
    verify157.includes('shell.includes("Marble Standard")') &&
      !verify157.includes('shell.includes("Build 157 · Marble Standard")'),
    "Build 157 verifier must remain forward-compatible after the Build 158 shell label."
  );

  assert(
    pkg.includes(
      "verify-build-158-repair-persistence-renewal-search-receipt-recovery.ts"
    ),
    "Build 158 verifier must run in the application test chain."
  );

  const docLower = doc.toLocaleLowerCase();
  assert(
    docLower.includes("no database migration") &&
      docLower.includes("no server-side synchronization") &&
      docLower.includes(
        "recovery audit recovery search preset recovery audit search preset recovery audit search preset persistence"
      ) &&
      docLower.includes(
        "renewal recovery audit search preset recovery audit search preset recovery audit search"
      ) &&
      docLower.includes(
        "receipt recovery audit search preset recovery audit search preset recovery audit search preset recovery"
      ) &&
      docLower.includes("manual") &&
      docLower.includes("rls"),
    "Build 158 documentation must preserve browser-local view state and workflow authority boundaries."
  );

  console.log(
    "Build 158 repair preset persistence, renewal recovery search and receipt preset recovery verification passed."
  );
}

void main();

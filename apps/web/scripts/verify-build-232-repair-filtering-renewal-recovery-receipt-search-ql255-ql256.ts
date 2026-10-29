import { readFile } from "node:fs/promises";
import {
  filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId,
  searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit
} from "../lib/navigation-preferences";

function ensure(c: unknown, m: string): asserts c { if (!c) throw new Error(m); }
async function source(r: string) { return readFile(new URL(r, import.meta.url), "utf8"); }

async function main() {
  const now=1_800_000_000_000;
  const repair: Parameters<typeof filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit>[0]=[
    {version:1,auditId:"recent",createdAt:now-3600000,requestedPresetId:"old-a",recoveredPresetId:"all",reason:"Recent."},
    {version:1,auditId:"week",createdAt:now-3*86400000,requestedPresetId:"old-b",recoveredPresetId:"recent-7d",reason:"Week."},
    {version:1,auditId:"old",createdAt:now-10*86400000,requestedPresetId:"old-c",recoveredPresetId:"all",reason:"Old."}
  ];
  ensure(filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repair,"24h",now).length===1,"repair 24h");
  ensure(filterInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(repair,"7d",now).length===2,"repair 7d");

  const renewal=recoverInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired");
  ensure(renewal.recovered&&renewal.presetId==="all","renewal recovery");

  const receipt: Parameters<typeof searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit>[0]=[
    {version:1,auditId:"receipt-a",createdAt:now,requestedPresetId:"retired-a",recoveredPresetId:"all",reason:"Recovered alpha."},
    {version:1,auditId:"receipt-b",createdAt:now-1000,requestedPresetId:"retired-b",recoveredPresetId:"recent-7d",reason:"Recovered beta."}
  ];
  ensure(searchInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(receipt,"alpha")[0]?.auditId==="receipt-a","receipt search");

  const [shell,pkg,proof,qv,ql255Raw,ql256Raw,envDoc,doc]=await Promise.all([
    source("../app/application-shell.tsx"),source("../package.json"),source("./ql246-source-proof.mjs"),
    source("./verify-ql246-independent-six-app-source-proof.mjs"),
    source("../../../docs/integration/ql255-ai-data-platform-build232-status.json"),
    source("../../../docs/integration/ql256-ai-data-platform-signer-custody-report.json"),
    source("../../../docs/integration/ql256-ai-data-platform-environment-bindings.md"),
    source("../../../docs/BUILD_232_REPAIR_FILTERING_RENEWAL_RECOVERY_RECEIPT_SEARCH_QL255_QL256.md")
  ]);

  ensure(shell.includes("Marble Standard"),"shell");
  ensure(pkg.includes("verify-build-232-repair-filtering-renewal-recovery-receipt-search-ql255-ql256.ts"),"registered");
  for(const t of ["evaluateQl255ProofPublicationDisposition","closeQl255WitnessCustodyException","prepareQl255MiniServerTrialApproval","inspectQl256SignerProvisioning"]) ensure(proof.includes(t),"missing "+t);
  ensure(qv.includes("QL-255 disposition, custody exception, mini-server prep and QL-256 signer inspection"),"fixture");

  const ql255=JSON.parse(ql255Raw), ql256=JSON.parse(ql256Raw);
  ensure(ql255.proof_publication_disposition==="NOT_PUBLISHED"&&ql255.connection_state==="DISCONNECTED","ql255 state");
  ensure(ql256.signer_provisioning_decision==="SIGNER_EXISTS_CUSTODY_NOT_VERIFIED","signer decision");
  ensure(/^[a-f0-9]{40}$/.test(ql256.source_A_sha),"source A");
  ensure(/^https:\/\/github\.com\/RosevearCreations\/ai-data-platform\/actions\/runs\/[0-9]+$/.test(ql256.matching_green_ci_run),"green CI");
  ensure(ql256.signer_public_spki_sha256==="d16f21ab82c12760c88b1cdaa7d2fe7491148e9efd4a8762c4a0e9be137311c6","SPKI");
  ensure(!envDoc.includes("MC4CAQAwBQYDK2Vw"),"private key must not appear in docs");
  ensure(doc.includes("SIGNER_EXISTS_CUSTODY_NOT_VERIFIED")&&doc.includes("proof B must not be published"),"QL256 boundary");
  console.log("Build 232 verification passed.");
}
void main();

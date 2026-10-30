import { readFile } from "node:fs/promises";
import {
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
} from "../lib/navigation-preferences";
function ensure(c: unknown,m:string):asserts c{if(!c)throw new Error(m);}
async function source(r:string){return readFile(new URL(r,import.meta.url),"utf8");}
async function main(){
 const a=createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({auditId:"a",createdAt:1800000000000,requestedPresetId:"old-a",recoveredPresetId:"all",reason:"Recovered"});
 const b=createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({auditId:"b",createdAt:1800000001000,requestedPresetId:"old-b",recoveredPresetId:"recent-7d",reason:"Recovered"});
 const audit=prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry([],a),b);
 ensure(audit[0]?.auditId==="b","repair recovery audit");
 ensure(sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-24h")==="recent-24h","renewal valid");
 ensure(sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired")==="all","renewal fallback");
 ensure(INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes("renewal-recovery"),"renewal persistence");
 const now=1800000000000;
 const rows:Parameters<typeof filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit>[0]=[
  {version:1,auditId:"r1",createdAt:now-3600000,requestedPresetId:"a",recoveredPresetId:"all",reason:"Recent"},
  {version:1,auditId:"r2",createdAt:now-3*86400000,requestedPresetId:"b",recoveredPresetId:"recent-7d",reason:"Week"}
 ];
 ensure(filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(rows,"24h",now).length===1,"receipt filter 24h");
 ensure(filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(rows,"7d",now).length===2,"receipt filter 7d");
 const [shell,css,review,remote,adoption,comms,pkg,proof,qv,statusRaw,doc]=await Promise.all([
  source("../app/application-shell.tsx"),source("../app/globals.css"),source("../app/data-review/page.tsx"),source("../app/remote-execution/page.tsx"),source("../app/adoption/page.tsx"),source("../app/integration-delivery/comms-hub/page.tsx"),source("../package.json"),source("./ql246-source-proof.mjs"),source("./verify-ql246-independent-six-app-source-proof.mjs"),source("../../../docs/integration/ql263-ai-data-platform-build243-status.json"),source("../../../docs/BUILD_243_REPAIR_AUDIT_RENEWAL_PERSISTENCE_RECEIPT_FILTERING_QL263.md")
 ]);
 ensure(shell.includes("Build 243 · Operations Command"),"shell label");
 ensure(css.includes("Build 243 — deeper Operations Command workflow panels"),"deep css");
 ensure(review.includes("Front End drill-down")&&remote.includes("I.T. drill-down")&&adoption.includes("Management drill-down")&&comms.includes("System Status drill-down"),"drilldowns");
 ensure(pkg.includes("verify-build-243-repair-audit-renewal-persistence-receipt-filtering-ql263.ts"),"registered");
 for(const t of ["renewQl263OwnerPacketEvidence","enforceQl263SignerCustodyAuditFreshness","reviewQl263SourceProofPublicationException","QL263_OWNER_PACKET_RENEWAL_NOT_AVAILABLE","QL263_SIGNER_CUSTODY_AUDIT_FRESHNESS_NOT_AVAILABLE","QL263_PROOF_PUBLICATION_EXCEPTION_OPEN_PUBLICATION_REQUIRED"]) ensure(proof.includes(t),"missing "+t);
 ensure(qv.includes("QL-263 owner renewal, custody audit freshness and proof exception review"),"ql263 fixture");
 const status=JSON.parse(statusRaw);
 ensure(status.source_A_sha==="13b14183807d5c08c9dcb3defe426349619a393e","source A");
 ensure(status.owner_packet_renewal==="QL263_OWNER_PACKET_RENEWAL_NOT_AVAILABLE","owner renewal");
 ensure(status.signer_custody_audit_freshness==="QL263_SIGNER_CUSTODY_AUDIT_FRESHNESS_NOT_AVAILABLE","audit freshness");
 ensure(status.source_proof_publication_exception_review==="QL263_PROOF_PUBLICATION_EXCEPTION_OPEN_PUBLICATION_REQUIRED","proof exception");
 ensure(status.immutable_proof_http_status===404&&status.authenticated_gateway_gets==="NOT_RUN"&&status.connection_state==="DISCONNECTED / HOLD","held");
 ensure(doc.toLowerCase().includes("repair recovery audit")&&doc.toLowerCase().includes("receipt filtering")&&doc.toLowerCase().includes("status drill-downs"),"doc");
 console.log("Build 243 verification passed.");
}
void main();
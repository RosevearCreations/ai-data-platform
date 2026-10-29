import { readFile } from "node:fs/promises";
import {
  INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY,
  createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit,
  prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry,
  sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId
} from "../lib/navigation-preferences";
function ensure(c:unknown,m:string): asserts c { if(!c) throw new Error(m); }
async function source(r:string){ return readFile(new URL(r,import.meta.url),"utf8"); }
async function main(){
 const a=createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({auditId:"a",createdAt:1_800_000_000_000,requestedPresetId:"old",recoveredPresetId:"all",reason:"Recovered."});
 const b=createInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry({auditId:"b",createdAt:1_800_000_001_000,requestedPresetId:"old2",recoveredPresetId:"recent-7d",reason:"Recovered."});
 const audit=prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry(prependInterfaceRecoveryAuditRepairSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditEntry([],a),b);
 ensure(audit[0]?.auditId==="b","repair recovery audit newest-first");
 ensure(sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("recent-24h")==="recent-24h"&&sanitizeInterfaceRecoveryRenewalAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetId("retired")==="all"&&INTERFACE_RECOVERY_RENEWAL_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_RECOVERY_AUDIT_SEARCH_PRESET_STORAGE_KEY.includes("renewal-recovery"),"renewal persistence");
 const now=1_800_000_000_000;
 const receipt: Parameters<typeof filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit>[0]=[{version:1,auditId:"r1",createdAt:now-3600000,requestedPresetId:"a",recoveredPresetId:"all",reason:"Recent"},{version:1,auditId:"r2",createdAt:now-3*86400000,requestedPresetId:"b",recoveredPresetId:"all",reason:"Week"},{version:1,auditId:"r3",createdAt:now-10*86400000,requestedPresetId:"c",recoveredPresetId:"all",reason:"Old"}];
 ensure(filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(receipt,"24h",now).length===1&&filterInterfaceReceiptRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAuditSearchPresetRecoveryAudit(receipt,"7d",now).length===2,"receipt filtering");
 const [shell,pkg,sp,qv,doc]=await Promise.all([source("../app/application-shell.tsx"),source("../package.json"),source("./ql246-source-proof.mjs"),source("./verify-ql246-independent-six-app-source-proof.mjs"),source("../../../docs/BUILD_226_REPAIR_AUDIT_RENEWAL_PERSISTENCE_RECEIPT_FILTERING_QL248_EXPORT.md")]);
 ensure(shell.includes("Build 226 · Marble Standard"),"shell");
 ensure(pkg.includes("verify-build-226-repair-audit-renewal-persistence-receipt-filtering-ql248-export.ts"),"registered");
 for(const t of ["exportQl248PhaseAProofOriginScaffold","verifyQl248PhaseAProofOriginExport","SIX_SOURCE_IMMUTABLE_ORIGIN_CONSISTENT_AUTH_TESTING_HELD","exportSha256"]) ensure(sp.includes(t),"missing "+t);
 ensure(qv.includes("proof-origin scaffold export is deterministic")&&qv.includes("ORIGIN_CONSISTENCY_MISMATCH"),"fixture");
 const lower=doc.toLowerCase(); for(const t of ["phase-b authenticated testing remains **held**","not given","disconnected","no hmac credential"]) ensure(lower.includes(t),"doc "+t);
 console.log("Build 226 verification passed.");
}
void main();

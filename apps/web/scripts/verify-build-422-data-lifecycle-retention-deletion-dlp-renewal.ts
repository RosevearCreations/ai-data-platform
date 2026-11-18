import assert from "node:assert/strict";import fs from "node:fs";import path from "node:path";
import {BUILD_405_APPLICATION_IDS} from "../lib/master-assurance-renewal-security-comms-recertification";
import {BUILD_407_DIRECTIONAL_RELATIONSHIPS} from "../lib/master-zero-trust-service-transport";
import {BUILD_422_LOCAL_DIMENSIONS,evaluateBuild422Renewal,validateBuild422DirectionalRenewal,validateBuild422LocalEvidence,type Build422DirectionalDlpRenewal,type Build422LocalLifecycleEvidence} from "../lib/master-data-lifecycle-retention-deletion-dlp-renewal";
const now="2026-11-18T21:00:00.000Z";const digest=(n:number)=>"sha256:"+((n%15)+1).toString(16).repeat(64);
const localEvidence:Build422LocalLifecycleEvidence[]=[];let index=0;
for(const appId of BUILD_405_APPLICATION_IDS){for(const dimension of BUILD_422_LOCAL_DIMENSIONS){
 const item:Build422LocalLifecycleEvidence={evidenceId:"b422-local-"+index,appId,dimension,state:"PASS",classificationInventoryCurrent:false,allFiveDataClassesCovered:false,unknownDataFailsClosed:false,
 transportEncryptionVerified:false,sensitiveAtRestEncryptionVerified:false,secretFieldProtectionVerified:false,keyMaterialOutsideSourceControl:false,structuredLogRedactionVerified:false,
 credentialPatternRedactionVerified:false,auditMinimizationVerified:false,rawSecretMaterialAbsent:true,purposeBoundRetentionVerified:false,retentionScheduleCurrent:false,expiryEnforced:false,
 expiredDataRequiresHoldOrDeletion:false,deletionWorkflowVerified:false,deletionReceiptRequired:false,deletionEvidenceImmutable:false,legalHoldPreserved:false,exportInspectionVerified:false,
 restrictedExportOwnerGateVerified:false,classificationPreservedOnExport:false,rawSecretExfiltrationBlocked:false,crossTenantExportBlocked:false,tenantContextVerified:false,workspaceBoundaryPreserved:false,
 destinationPolicyCompatible:false,evidenceDigest:digest(index),sourceOwned:true,syntheticEvidence:false,ownerReviewed:true,independentlyVerified:true,observedAt:"2026-11-18T20:00:00.000Z",expiresAt:"2026-11-25T20:00:00.000Z"};
 if(dimension==="DATA_CLASSIFICATION"){item.classificationInventoryCurrent=true;item.allFiveDataClassesCovered=true;item.unknownDataFailsClosed=true;}
 if(dimension==="ENCRYPTION_SECRET_CUSTODY"){item.transportEncryptionVerified=true;item.sensitiveAtRestEncryptionVerified=true;item.secretFieldProtectionVerified=true;item.keyMaterialOutsideSourceControl=true;}
 if(dimension==="REDACTION_MINIMIZATION"){item.structuredLogRedactionVerified=true;item.credentialPatternRedactionVerified=true;item.auditMinimizationVerified=true;}
 if(dimension==="RETENTION_EXPIRY"){item.purposeBoundRetentionVerified=true;item.retentionScheduleCurrent=true;item.expiryEnforced=true;item.expiredDataRequiresHoldOrDeletion=true;item.legalHoldPreserved=true;}
 if(dimension==="DELETION_EVIDENCE"){item.deletionWorkflowVerified=true;item.deletionReceiptRequired=true;item.deletionEvidenceImmutable=true;item.legalHoldPreserved=true;}
 if(dimension==="EXPORT_DLP"){item.exportInspectionVerified=true;item.restrictedExportOwnerGateVerified=true;item.classificationPreservedOnExport=true;item.rawSecretExfiltrationBlocked=true;}
 if(dimension==="CROSS_TENANT_EXFILTRATION"){item.crossTenantExportBlocked=true;item.tenantContextVerified=true;item.workspaceBoundaryPreserved=true;item.destinationPolicyCompatible=true;}
 assert.equal(validateBuild422LocalEvidence(item,now),true);localEvidence.push(item);index++;
}}
const directionalRenewals:Build422DirectionalDlpRenewal[]=BUILD_407_DIRECTIONAL_RELATIONSHIPS.map(([sourceAppId,targetAppId],i)=>{
 const mod=i%5;const item:Build422DirectionalDlpRenewal={receiptId:"b422-directional-"+i,sourceAppId,targetAppId,dataClass:mod===4?"D4_SECRET":mod===3?"D3_CONFIDENTIAL":mod===2?"D2_PERSONAL":mod===1?"D1_INTERNAL":"D0_PUBLIC",
 state:"RENEWED",exactSourceTargetBound:true,classificationCurrent:true,transportEncrypted:true,payloadMinimized:true,redactionApplied:true,consentRequired:mod===2,consentValid:true,
 retentionBoundaryPreserved:true,exportInspected:true,restrictedOwnerGate:mod>=3,secretReferenceOnly:mod===4,crossTenantExportDenied:true,destinationPolicyCompatible:true,evidenceDigest:digest(i+70),
 sourceOwned:true,syntheticEvidence:false,ownerReviewed:true,independentlyVerified:true,observedAt:"2026-11-18T20:05:00.000Z",expiresAt:"2026-11-25T20:05:00.000Z"};
 assert.equal(validateBuild422DirectionalRenewal(item,now),true);return item;});
const good=evaluateBuild422Renewal({build421SoftwareReleasePresent:true,localEvidence,directionalRenewals,nowIso:now});
assert.equal(good.governanceState,"DATA_LIFECYCLE_RETENTION_DELETION_AND_DLP_RENEWED");assert.equal(good.counts.requiredLocalSlots,49);assert.equal(good.counts.requiredDirectionalSlots,28);assert.equal(good.counts.requiredTotalSlots,77);
const root=path.resolve(process.cwd(),"../..");const read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");
const migration=read("db/migrations/0185_master_data_lifecycle_retention_deletion_dlp_renewal.sql");
for(const token of ["master_build422_data_lifecycle_renewals","master_build422_directional_dlp_renewals","force row level security","deletion_evidence_immutable","legal_hold_preserved","cross_tenant_export_denied","revoke update,delete"])assert.ok(migration.includes(token));
const manifest=JSON.parse(read(".github/rosevear-build422-data-lifecycle-dlp-renewal.v1.json"));assert.equal(manifest.build,422);assert.equal(manifest.policy.requiredTotalSlots,77);
const scorecard=JSON.parse(read(".github/rosevear-completion-scorecard.v1.json"));assert.equal(scorecard.categories.length,36);
const previous=scorecard.categories.reduce((s:number,i:{build421Percent:number})=>s+i.build421Percent,0)/36;const current=scorecard.categories.reduce((s:number,i:{build422Percent:number})=>s+i.build422Percent,0)/36;
assert.equal(Math.round(previous*10)/10,85.3);assert.equal(Math.round(current*10)/10,90.8);assert.ok(current-previous>=5&&current-previous<=10);
const page=read("apps/web/app/data-lifecycle-dlp-renewal/page.tsx");for(const token of ["Build 422 · Data Lifecycle, Retention, Deletion & DLP Renewal Assurance","77 evidence checkpoints","36 AI Data Platform-specific categories"])assert.ok(page.includes(token));
const pkg=JSON.parse(read("apps/web/package.json"));assert.ok(pkg.scripts.build.includes("verify-build-422-data-lifecycle-retention-deletion-dlp-renewal.ts"));assert.equal(pkg.scripts["verify:build422"],"tsx scripts/verify-build-422-data-lifecycle-retention-deletion-dlp-renewal.ts");
const nav=read("apps/web/lib/application-navigation.ts");assert.ok(nav.includes('href: "/data-lifecycle-dlp-renewal"'));const masterNav=read("apps/web/lib/master-instrument-navigation.ts");assert.ok(masterNav.includes('"/data-lifecycle-dlp-renewal"'));
const suite=read("apps/web/app/master-suite/page.tsx");assert.ok(suite.includes('href="/data-lifecycle-dlp-renewal"'));const spine=read("apps/web/scripts/verify-ci-integration-spine-database.ts");
for(const token of ["master_build422_data_lifecycle_renewals","master_build422_directional_dlp_renewals","0185_master_data_lifecycle_retention_deletion_dlp_renewal.sql"])assert.ok(spine.includes(token));
const roadmap=read("docs/NEXT_BUILDS_415_424.md");assert.ok(roadmap.includes("Implemented in Build 422"));assert.ok(roadmap.includes("77 renewal checkpoints"));
console.log("Build 422 Data Lifecycle, Retention, Deletion & DLP Renewal Assurance verification passed.");

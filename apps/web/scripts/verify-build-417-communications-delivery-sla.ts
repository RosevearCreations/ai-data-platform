import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {BUILD_405_COMMUNICATION_RELATIONSHIPS} from "../lib/master-assurance-renewal-security-comms-recertification";
import {
  BUILD_417_ACK_SLA_SECONDS,
  BUILD_417_MAX_REPLAY_ATTEMPTS,
  evaluateBuild417CommunicationsOperations,
  validateBuild417DeadLetterRecovery,
  validateBuild417DeliveryReceipt,
  type Build417DeadLetterRecoveryReceipt,
  type Build417DeliveryReceipt
} from "../lib/master-communications-delivery-sla";

const now="2026-11-17T19:30:00.000Z";
const digest=(c:string)=>"sha256:"+c.repeat(64);
const receipt=(left:Build417DeliveryReceipt["leftAppId"],right:Build417DeliveryReceipt["rightAppId"],i:number):Build417DeliveryReceipt=>({
  receiptId:"delivery-417-"+i,
  leftAppId:left,rightAppId:right,
  messageId:"message-417-"+String(i).padStart(3,"0"),
  correlationId:"correlation-417-"+String(i).padStart(3,"0"),
  queuedAt:"2026-11-17T19:20:00.000Z",
  deliveredAt:"2026-11-17T19:20:20.000Z",
  acknowledgedAt:"2026-11-17T19:20:50.000Z",
  deliveryState:"ACKNOWLEDGED",
  duplicateCount:i===0?2:0,
  duplicateSuppressed:true,
  replayAttemptCount:0,
  replayOutcome:"NOT_REQUIRED",
  deadLetterId:null,
  transportAuthenticated:true,
  sourceIdentityVerified:true,
  targetAudienceVerified:true,
  tenantBoundaryVerified:true,
  replayProtectionVerified:true,
  authorityHolder:"rosevear-comms-hub",
  authorityPreserved:true,
  directPeerDatabaseWrite:false,
  evidenceDigest:digest(((i%6)+1).toString(16)),
  observedAt:"2026-11-17T19:21:00.000Z",
  expiresAt:"2026-11-18T19:21:00.000Z",
  independentlyVerified:true,
  state:"VERIFIED"
});
const deliveries=BUILD_405_COMMUNICATION_RELATIONSHIPS.map(([left,right],i)=>receipt(left,right,i));
for(const item of deliveries)assert.equal(validateBuild417DeliveryReceipt(item,now),true);

const good=evaluateBuild417CommunicationsOperations({
  build416SoftwareReleasePresent:true,deliveryReceipts:deliveries,deadLetterRecoveries:[],nowIso:now
});
assert.equal(good.governanceState,"COMMUNICATIONS_DELIVERY_SLA_AND_RECOVERY_ASSURED");
assert.equal(good.counts.relationships,14);
assert.equal(good.counts.relationshipReceipts,14);
assert.equal(good.metrics.averageAckLatencySeconds,30);
assert.equal(good.counts.duplicateSuppressions,2);

const missing=evaluateBuild417CommunicationsOperations({
  build416SoftwareReleasePresent:true,deliveryReceipts:deliveries.slice(0,13),deadLetterRecoveries:[],nowIso:now
});
assert.equal(missing.governanceState,"HOLD_COMMUNICATIONS_DELIVERY_EVIDENCE_REQUIRED");

const breach=[...deliveries];
breach[0]={...breach[0],acknowledgedAt:"2026-11-17T19:23:00.000Z"};
assert.equal(validateBuild417DeliveryReceipt(breach[0],now),true);
assert.ok(BUILD_417_ACK_SLA_SECONDS<160);
assert.equal(
  evaluateBuild417CommunicationsOperations({
    build416SoftwareReleasePresent:true,deliveryReceipts:breach,deadLetterRecoveries:[],nowIso:now
  }).governanceState,
  "HOLD_COMMUNICATIONS_DELIVERY_SLA_BREACH"
);

const dead=[...deliveries];
dead[0]={...dead[0],deliveredAt:null,acknowledgedAt:null,deliveryState:"DEAD_LETTER",deadLetterId:"dead-letter-417-0001",replayOutcome:"HELD"};
assert.equal(validateBuild417DeliveryReceipt(dead[0],now),true);
assert.equal(
  evaluateBuild417CommunicationsOperations({
    build416SoftwareReleasePresent:true,deliveryReceipts:dead,deadLetterRecoveries:[],nowIso:now
  }).governanceState,
  "HOLD_DEAD_LETTER_RECOVERY_REQUIRED"
);

const recovery:Build417DeadLetterRecoveryReceipt={
  receiptId:"recovery-417-0001",deadLetterId:"dead-letter-417-0001",
  leftAppId:dead[0].leftAppId,rightAppId:dead[0].rightAppId,
  failureDigest:digest("a"),enteredAt:"2026-11-17T18:00:00.000Z",
  replayRequestedAt:"2026-11-17T18:10:00.000Z",recoveredAt:"2026-11-17T19:00:00.000Z",
  replayNumber:1,disposition:"RECOVERED",duplicateSuppressionPreserved:true,
  originalMessageIdentityPreserved:true,authorityPreserved:true,ownerReviewed:true,
  independentlyVerified:true,evidenceDigest:digest("b"),observedAt:"2026-11-17T19:01:00.000Z",
  expiresAt:"2026-11-18T19:01:00.000Z",state:"VERIFIED"
};
assert.equal(validateBuild417DeadLetterRecovery(recovery,now),true);
assert.equal(BUILD_417_MAX_REPLAY_ATTEMPTS,3);

const root=path.resolve(process.cwd(),"../..");
const read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");

const migration=read("db/migrations/0180_master_communications_delivery_sla.sql");
for(const token of [
  "master_build417_delivery_sla_receipts",
  "master_build417_dead_letter_recovery_receipts",
  "rosevear-comms-hub",
  "direct_peer_database_write=false",
  "revoke insert,update,delete",
  "force row level security"
])assert.ok(migration.includes(token),"migration token missing: "+token);

const page=read("apps/web/app/communications-delivery-operations/page.tsx");
for(const token of [
  "Build 417 · Communications Operations",
  "Delivery SLA, ACK Latency, Replay Quality & Dead-Letter Recovery",
  "Fourteen canonical communication relationships",
  "Dead-Letter Console",
  "Fail-closed communication evidence"
])assert.ok(page.includes(token),"page token missing: "+token);

const css=read("apps/web/app/master-instrument-shell.css");
for(const token of [
  'data-rosevear-master-theme="crimson"',
  'data-rosevear-master-theme="emerald"',
  'data-rosevear-master-theme="ultraviolet"',
  'data-rosevear-master-theme="steel"',
  'input[type="datetime-local"]',
  "min-height:7.25rem",
  "masterGovernanceGrid--wide"
])assert.ok(css.includes(token),"css token missing: "+token);

const themes=JSON.parse(read(".github/rosevear-master-themes.v2.json"));
assert.equal(themes.themeIds.length,12);
assert.deepEqual(themes.build417Extension.newThemeIds,["crimson","emerald","ultraviolet","steel"]);
assert.equal(themes.build417Extension.sameCatalogueForAllMasters,true);
assert.deepEqual(themes.masters,["ai-data-platform","rosevear-ai-hub","rosevear-comms-hub"]);

const nav=read("apps/web/lib/master-instrument-navigation.ts");
for(const id of themes.themeIds)assert.ok(nav.includes('"'+id+'"'),"master theme parity missing "+id);
assert.ok(nav.includes('"/communications-delivery-operations"'));

const pkg=JSON.parse(read("apps/web/package.json"));
assert.ok(pkg.scripts.build.includes("verify-build-417-communications-delivery-sla.ts"));
assert.equal(pkg.scripts["verify:build417"],"tsx scripts/verify-build-417-communications-delivery-sla.ts");

const roadmap=read("docs/NEXT_BUILDS_415_424.md");
assert.ok(roadmap.includes("Implemented in Build 417"));

console.log("Build 417 Communications Delivery SLA, ACK Latency, Replay Quality & Dead-Letter Operations verification passed.");

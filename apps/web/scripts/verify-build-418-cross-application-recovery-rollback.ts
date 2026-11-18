import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {BUILD_405_APPLICATION_IDS} from "../lib/master-assurance-renewal-security-comms-recertification";
import {
  BUILD_418_EXERCISE_DOMAINS,
  evaluateBuild418RecoveryRollback,
  validateBuild418CrossApplicationExercise,
  validateBuild418RecoveryExercise,
  validateBuild418RollbackReadiness,
  type Build418CrossApplicationExerciseReceipt,
  type Build418RecoveryExerciseReceipt,
  type Build418RollbackReadinessReceipt
} from "../lib/master-cross-application-recovery-rollback";

const now="2026-11-18T12:00:00.000Z";
const digest=(c:string)=>"sha256:"+c.repeat(64);
const exercises:Build418RecoveryExerciseReceipt[]=[];
let index=0;
for(const appId of BUILD_405_APPLICATION_IDS){
  for(const domain of BUILD_418_EXERCISE_DOMAINS){
    const i=index++;
    exercises.push({
      receiptId:"recovery-receipt-418-"+i,
      exerciseId:"recovery-exercise-418-"+i,
      appId,domain,
      scenarioDigest:digest(((i%6)+1).toString(16)),
      baselineEvidenceDigest:digest(((i%6)+2).toString(16)),
      ownerApprovalDigest:digest("a"),
      independentWitnessDigest:digest("b"),
      sourceExecutionReceiptDigest:digest("c"),
      postRecoveryTelemetryDigest:digest("d"),
      recoveryPointDigest:digest("e"),
      startedAt:"2026-11-18T10:00:00.000Z",
      completedAt:"2026-11-18T10:30:00.000Z",
      recoveryTimeMinutes:30,
      recoverySuccessful:true,
      postRecoveryHealthVerified:true,
      rollbackToPriorStateVerified:true,
      dataIntegrityVerified:true,
      duplicateOrReplayProtectionVerified:true,
      noCrossTenantImpact:true,
      noSecretExposure:true,
      localAuthorityPreserved:true,
      communicationsAuthorityPreserved:true,
      aiDataValidationOnly:true,
      sourceExecutionVerified:true,
      independentlyVerified:true,
      observedAt:"2026-11-18T10:31:00.000Z",
      expiresAt:"2026-11-25T10:31:00.000Z",
      state:"VERIFIED"
    });
  }
}
for(const item of exercises)assert.equal(validateBuild418RecoveryExercise(item,now),true);

const rollback:Build418RollbackReadinessReceipt[]=BUILD_405_APPLICATION_IDS.map((appId,i)=>({
  receiptId:"rollback-readiness-418-"+i,appId,
  currentRevision:"a".repeat(40),previousKnownGoodRevision:"b".repeat(40),
  currentArtifactDigest:digest("1"),previousArtifactDigest:digest("2"),
  restorePointDigest:digest("3"),rollbackProcedureDigest:digest("4"),
  migrationCompatibilityDigest:digest("5"),ownerGateDigest:digest("6"),sourceCustodyDigest:digest("7"),
  rollbackWindowMinutes:60,previousArtifactAvailable:true,restorePointVerified:true,
  rollbackProcedureVerified:true,migrationCompatibilityVerified:true,ownerGateVerified:true,
  sourceOwnedRollback:true,postRollbackValidationDefined:true,forwardRecoveryPathDefined:true,
  noAutomaticRollback:true,independentlyVerified:true,observedAt:"2026-11-18T10:40:00.000Z",
  expiresAt:"2026-11-25T10:40:00.000Z",state:"VERIFIED"
}));
for(const item of rollback)assert.equal(validateBuild418RollbackReadiness(item,now),true);

const cross:Build418CrossApplicationExerciseReceipt={
  receiptId:"cross-recovery-418-0001",exerciseId:"cross-exercise-418-0001",
  participantAppIds:["ai-data-platform","rosevear-comms-hub","rosiedazzlers"],
  correlationId:"correlation-418-0001",scenarioDigest:digest("8"),ownerApprovalDigest:digest("9"),
  independentWitnessDigest:digest("a"),dependencyOrderDigest:digest("b"),
  rollbackSequenceDigest:digest("c"),reconciliationDigest:digest("d"),
  partialFailureIsolated:true,dependencyOrderVerified:true,rollbackSequenceVerified:true,
  postExerciseReconciliationVerified:true,authorityBoundariesPreserved:true,
  communicationsAuthorityPreserved:true,noCrossTenantImpact:true,noSecretExposure:true,
  noLockstepReleaseRequired:true,independentlyVerified:true,
  observedAt:"2026-11-18T11:00:00.000Z",expiresAt:"2026-11-25T11:00:00.000Z",state:"VERIFIED"
};
assert.equal(validateBuild418CrossApplicationExercise(cross,now),true);

const good=evaluateBuild418RecoveryRollback({
  build417SoftwareReleasePresent:true,recoveryExercises:exercises,
  rollbackReadiness:rollback,crossApplicationExercises:[cross],nowIso:now
});
assert.equal(good.governanceState,"CROSS_APPLICATION_RECOVERY_AND_ROLLBACK_CERTIFIED");
assert.equal(good.counts.requiredExerciseSlots,28);
assert.equal(good.counts.verifiedExerciseSlots,28);
assert.equal(good.counts.rollbackReadinessReceipts,7);
assert.equal(good.counts.verifiedCrossApplicationExercises,1);
assert.equal(good.metrics.averageRecoveryTimeMinutes,30);

const missing=evaluateBuild418RecoveryRollback({
  build417SoftwareReleasePresent:true,recoveryExercises:exercises.slice(0,27),
  rollbackReadiness:rollback,crossApplicationExercises:[cross],nowIso:now
});
assert.equal(missing.governanceState,"HOLD_RECOVERY_EXERCISE_EVIDENCE_REQUIRED");

const badRollback={...rollback[0],noAutomaticRollback:false};
assert.equal(validateBuild418RollbackReadiness(badRollback,now),false);

const root=path.resolve(process.cwd(),"../..");
const read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");
const migration=read("db/migrations/0181_master_cross_application_recovery_rollback.sql");
for(const token of [
  "master_build418_recovery_exercise_receipts",
  "master_build418_rollback_readiness_receipts",
  "master_build418_cross_application_exercise_receipts",
  "force row level security","no_automatic_rollback","ai_data_validation_only",
  "revoke update,delete"
])assert.ok(migration.includes(token),"migration token missing: "+token);

const page=read("apps/web/app/recovery-rollback-certification/page.tsx");
for(const token of [
  "Build 418 · Recovery & Rollback Certification",
  "Cross-Application Recovery Exercise & Rollback Readiness",
  "Seven applications × four recovery domains",
  "No automatic rollback"
])assert.ok(page.includes(token),"page token missing: "+token);

const manifest=JSON.parse(read(".github/rosevear-build418-cross-application-recovery-rollback.v1.json"));
assert.equal(manifest.build,418);
assert.equal(manifest.policy.exerciseSlotsRequired,28);
assert.equal(manifest.policy.rollbackReadinessReceiptsRequired,7);
assert.equal(manifest.policy.automaticRecoveryAuthorized,false);
assert.equal(manifest.policy.automaticRollbackAuthorized,false);
assert.equal(manifest.policy.productionGreenImpliesRecoveryExercisePassed,false);

const pkg=JSON.parse(read("apps/web/package.json"));
assert.ok(pkg.scripts.build.includes("verify-build-418-cross-application-recovery-rollback.ts"));
assert.equal(pkg.scripts["verify:build418"],"tsx scripts/verify-build-418-cross-application-recovery-rollback.ts");

const nav=read("apps/web/lib/application-navigation.ts");
assert.ok(nav.includes('href: "/recovery-rollback-certification"'));
const masterNav=read("apps/web/lib/master-instrument-navigation.ts");
assert.ok(masterNav.includes('"/recovery-rollback-certification"'));
const suite=read("apps/web/app/master-suite/page.tsx");
assert.ok(suite.includes("Build 418 · Rosevear Server Shell"));
assert.ok(suite.includes('href="/recovery-rollback-certification"'));

const spine=read("apps/web/scripts/verify-ci-integration-spine-database.ts");
for(const token of [
  "master_build418_recovery_exercise_receipts",
  "master_build418_rollback_readiness_receipts",
  "master_build418_cross_application_exercise_receipts",
  "0181_master_cross_application_recovery_rollback.sql"
])assert.ok(spine.includes(token),"CI spine missing "+token);

const roadmap=read("docs/NEXT_BUILDS_415_424.md");
assert.ok(roadmap.includes("Implemented in Build 418"));
console.log("Build 418 Cross-Application Recovery Exercise & Rollback Readiness Certification verification passed.");

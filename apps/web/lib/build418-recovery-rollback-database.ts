import {withUserDatabase} from "./database";
import {
  evaluateBuild418RecoveryRollback,
  type Build418RecoveryExerciseReceipt,
  type Build418RollbackReadinessReceipt,
  type Build418CrossApplicationExerciseReceipt
} from "./master-cross-application-recovery-rollback";

export async function readBuild418RecoveryRollback(userId:string,nowIso:string){
  return withUserDatabase(userId,async client=>{
    const [exerciseRows,rollbackRows,crossRows]=await Promise.all([
      client.query(`select * from app.master_build418_recovery_exercise_receipts order by observed_at desc limit 500`),
      client.query(`select * from app.master_build418_rollback_readiness_receipts order by observed_at desc limit 100`),
      client.query(`select * from app.master_build418_cross_application_exercise_receipts order by observed_at desc limit 100`)
    ]);
    const exercises:Build418RecoveryExerciseReceipt[]=exerciseRows.rows.map(row=>({
      receiptId:String(row.receipt_id),exerciseId:String(row.exercise_id),
      appId:String(row.app_id) as Build418RecoveryExerciseReceipt["appId"],
      domain:String(row.domain) as Build418RecoveryExerciseReceipt["domain"],
      scenarioDigest:String(row.scenario_digest),baselineEvidenceDigest:String(row.baseline_evidence_digest),
      ownerApprovalDigest:String(row.owner_approval_digest),independentWitnessDigest:String(row.independent_witness_digest),
      sourceExecutionReceiptDigest:String(row.source_execution_receipt_digest),
      postRecoveryTelemetryDigest:String(row.post_recovery_telemetry_digest),recoveryPointDigest:String(row.recovery_point_digest),
      startedAt:new Date(row.started_at).toISOString(),completedAt:new Date(row.completed_at).toISOString(),
      recoveryTimeMinutes:Number(row.recovery_time_minutes),recoverySuccessful:Boolean(row.recovery_successful),
      postRecoveryHealthVerified:Boolean(row.post_recovery_health_verified),
      rollbackToPriorStateVerified:Boolean(row.rollback_to_prior_state_verified),dataIntegrityVerified:Boolean(row.data_integrity_verified),
      duplicateOrReplayProtectionVerified:Boolean(row.duplicate_or_replay_protection_verified),
      noCrossTenantImpact:Boolean(row.no_cross_tenant_impact),noSecretExposure:Boolean(row.no_secret_exposure),
      localAuthorityPreserved:Boolean(row.local_authority_preserved),
      communicationsAuthorityPreserved:Boolean(row.communications_authority_preserved),
      aiDataValidationOnly:Boolean(row.ai_data_validation_only),sourceExecutionVerified:Boolean(row.source_execution_verified),
      independentlyVerified:Boolean(row.independently_verified),observedAt:new Date(row.observed_at).toISOString(),
      expiresAt:new Date(row.expires_at).toISOString(),state:String(row.state) as Build418RecoveryExerciseReceipt["state"]
    }));
    const rollback:Build418RollbackReadinessReceipt[]=rollbackRows.rows.map(row=>({
      receiptId:String(row.receipt_id),appId:String(row.app_id) as Build418RollbackReadinessReceipt["appId"],
      currentRevision:String(row.current_revision),previousKnownGoodRevision:String(row.previous_known_good_revision),
      currentArtifactDigest:String(row.current_artifact_digest),previousArtifactDigest:String(row.previous_artifact_digest),
      restorePointDigest:String(row.restore_point_digest),rollbackProcedureDigest:String(row.rollback_procedure_digest),
      migrationCompatibilityDigest:String(row.migration_compatibility_digest),ownerGateDigest:String(row.owner_gate_digest),
      sourceCustodyDigest:String(row.source_custody_digest),rollbackWindowMinutes:Number(row.rollback_window_minutes),
      previousArtifactAvailable:Boolean(row.previous_artifact_available),restorePointVerified:Boolean(row.restore_point_verified),
      rollbackProcedureVerified:Boolean(row.rollback_procedure_verified),migrationCompatibilityVerified:Boolean(row.migration_compatibility_verified),
      ownerGateVerified:Boolean(row.owner_gate_verified),sourceOwnedRollback:Boolean(row.source_owned_rollback),
      postRollbackValidationDefined:Boolean(row.post_rollback_validation_defined),
      forwardRecoveryPathDefined:Boolean(row.forward_recovery_path_defined),noAutomaticRollback:Boolean(row.no_automatic_rollback),
      independentlyVerified:Boolean(row.independently_verified),observedAt:new Date(row.observed_at).toISOString(),
      expiresAt:new Date(row.expires_at).toISOString(),state:String(row.state) as Build418RollbackReadinessReceipt["state"]
    }));
    const cross:Build418CrossApplicationExerciseReceipt[]=crossRows.rows.map(row=>({
      receiptId:String(row.receipt_id),exerciseId:String(row.exercise_id),
      participantAppIds:row.participant_app_ids as Build418CrossApplicationExerciseReceipt["participantAppIds"],
      correlationId:String(row.correlation_id),scenarioDigest:String(row.scenario_digest),
      ownerApprovalDigest:String(row.owner_approval_digest),independentWitnessDigest:String(row.independent_witness_digest),
      dependencyOrderDigest:String(row.dependency_order_digest),rollbackSequenceDigest:String(row.rollback_sequence_digest),
      reconciliationDigest:String(row.reconciliation_digest),partialFailureIsolated:Boolean(row.partial_failure_isolated),
      dependencyOrderVerified:Boolean(row.dependency_order_verified),rollbackSequenceVerified:Boolean(row.rollback_sequence_verified),
      postExerciseReconciliationVerified:Boolean(row.post_exercise_reconciliation_verified),
      authorityBoundariesPreserved:Boolean(row.authority_boundaries_preserved),
      communicationsAuthorityPreserved:Boolean(row.communications_authority_preserved),
      noCrossTenantImpact:Boolean(row.no_cross_tenant_impact),noSecretExposure:Boolean(row.no_secret_exposure),
      noLockstepReleaseRequired:Boolean(row.no_lockstep_release_required),
      independentlyVerified:Boolean(row.independently_verified),observedAt:new Date(row.observed_at).toISOString(),
      expiresAt:new Date(row.expires_at).toISOString(),state:String(row.state) as Build418CrossApplicationExerciseReceipt["state"]
    }));
    return evaluateBuild418RecoveryRollback({
      build417SoftwareReleasePresent:true,recoveryExercises:exercises,
      rollbackReadiness:rollback,crossApplicationExercises:cross,nowIso
    });
  });
}

import {withUserDatabase} from "./database";
import {
  evaluateBuild417CommunicationsOperations,
  type Build417DeadLetterRecoveryReceipt,
  type Build417DeliveryReceipt
} from "./master-communications-delivery-sla";

export async function readBuild417CommunicationsOperations(userId:string,nowIso:string){
  return withUserDatabase(userId,async client=>{
    const deliveries=await client.query(`select
      receipt_id,left_app_id,right_app_id,message_id,correlation_id,
      queued_at::text,delivered_at::text,acknowledged_at::text,delivery_state,
      duplicate_count,duplicate_suppressed,replay_attempt_count,replay_outcome,
      dead_letter_id,transport_authenticated,source_identity_verified,
      target_audience_verified,tenant_boundary_verified,replay_protection_verified,
      authority_holder,authority_preserved,direct_peer_database_write,
      evidence_digest,observed_at::text,expires_at::text,independently_verified,state
      from app.master_build417_delivery_sla_receipts
      order by observed_at desc limit 250`);
    const recoveries=await client.query(`select
      receipt_id,dead_letter_id,left_app_id,right_app_id,failure_digest,
      entered_at::text,replay_requested_at::text,recovered_at::text,replay_number,
      disposition,duplicate_suppression_preserved,original_message_identity_preserved,
      authority_preserved,owner_reviewed,independently_verified,evidence_digest,
      observed_at::text,expires_at::text,state
      from app.master_build417_dead_letter_recovery_receipts
      order by observed_at desc limit 250`);

    const deliveryReceipts:Build417DeliveryReceipt[]=deliveries.rows.map(row=>({
      receiptId:String(row.receipt_id),
      leftAppId:String(row.left_app_id) as Build417DeliveryReceipt["leftAppId"],
      rightAppId:String(row.right_app_id) as Build417DeliveryReceipt["rightAppId"],
      messageId:String(row.message_id),
      correlationId:String(row.correlation_id),
      queuedAt:new Date(String(row.queued_at)).toISOString(),
      deliveredAt:row.delivered_at?new Date(String(row.delivered_at)).toISOString():null,
      acknowledgedAt:row.acknowledged_at?new Date(String(row.acknowledged_at)).toISOString():null,
      deliveryState:String(row.delivery_state) as Build417DeliveryReceipt["deliveryState"],
      duplicateCount:Number(row.duplicate_count),
      duplicateSuppressed:Boolean(row.duplicate_suppressed),
      replayAttemptCount:Number(row.replay_attempt_count),
      replayOutcome:String(row.replay_outcome) as Build417DeliveryReceipt["replayOutcome"],
      deadLetterId:row.dead_letter_id?String(row.dead_letter_id):null,
      transportAuthenticated:Boolean(row.transport_authenticated),
      sourceIdentityVerified:Boolean(row.source_identity_verified),
      targetAudienceVerified:Boolean(row.target_audience_verified),
      tenantBoundaryVerified:Boolean(row.tenant_boundary_verified),
      replayProtectionVerified:Boolean(row.replay_protection_verified),
      authorityHolder:"rosevear-comms-hub",
      authorityPreserved:Boolean(row.authority_preserved),
      directPeerDatabaseWrite:Boolean(row.direct_peer_database_write),
      evidenceDigest:String(row.evidence_digest),
      observedAt:new Date(String(row.observed_at)).toISOString(),
      expiresAt:new Date(String(row.expires_at)).toISOString(),
      independentlyVerified:Boolean(row.independently_verified),
      state:String(row.state) as Build417DeliveryReceipt["state"]
    }));
    const deadLetterRecoveries:Build417DeadLetterRecoveryReceipt[]=recoveries.rows.map(row=>({
      receiptId:String(row.receipt_id),
      deadLetterId:String(row.dead_letter_id),
      leftAppId:String(row.left_app_id) as Build417DeadLetterRecoveryReceipt["leftAppId"],
      rightAppId:String(row.right_app_id) as Build417DeadLetterRecoveryReceipt["rightAppId"],
      failureDigest:String(row.failure_digest),
      enteredAt:new Date(String(row.entered_at)).toISOString(),
      replayRequestedAt:row.replay_requested_at?new Date(String(row.replay_requested_at)).toISOString():null,
      recoveredAt:row.recovered_at?new Date(String(row.recovered_at)).toISOString():null,
      replayNumber:Number(row.replay_number),
      disposition:String(row.disposition) as Build417DeadLetterRecoveryReceipt["disposition"],
      duplicateSuppressionPreserved:Boolean(row.duplicate_suppression_preserved),
      originalMessageIdentityPreserved:Boolean(row.original_message_identity_preserved),
      authorityPreserved:Boolean(row.authority_preserved),
      ownerReviewed:Boolean(row.owner_reviewed),
      independentlyVerified:Boolean(row.independently_verified),
      evidenceDigest:String(row.evidence_digest),
      observedAt:new Date(String(row.observed_at)).toISOString(),
      expiresAt:new Date(String(row.expires_at)).toISOString(),
      state:String(row.state) as Build417DeadLetterRecoveryReceipt["state"]
    }));

    return evaluateBuild417CommunicationsOperations({
      build416SoftwareReleasePresent:true,
      deliveryReceipts,
      deadLetterRecoveries,
      nowIso
    });
  });
}

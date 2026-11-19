import { withUserDatabase } from "./database";
import { evaluateBuild423, type Build423RoleAcceptanceEvidence, type Build423TelemetryReceipt, type Build423WorkflowCeremonyReceipt } from "./master-operator-acceptance-role-ceremony";
export async function readBuild423ForUser(userId:string){
 return withUserDatabase(userId,async client=>{
  const role=await client.query<{role:string|null}>("select app.current_master_sysop_role() as role");
  if(!["owner","operator"].includes(role.rows[0]?.role??""))throw new Error("build423_operator_required");
  const [roles,ceremonies,telemetry]=await Promise.all([
   client.query("select * from app.master_build423_role_acceptance_evidence order by observed_at desc limit 500"),
   client.query("select * from app.master_build423_workflow_ceremony_receipts order by observed_at desc limit 500"),
   client.query("select * from app.master_build423_sysop_telemetry_receipts order by issued_at desc limit 500")
  ]);
  const roleEvidence:Build423RoleAcceptanceEvidence[]=roles.rows.map(r=>({evidenceId:r.evidence_id,appId:r.app_id,role:r.role,state:r.state,acceptancePercent:Number(r.acceptance_percent),criticalFailureCount:Number(r.critical_failure_count),evidenceDigest:r.evidence_digest,observedAt:new Date(r.observed_at).toISOString(),expiresAt:new Date(r.expires_at).toISOString(),sourceOwned:r.source_owned,ownerReviewed:r.owner_reviewed,independentlyVerified:r.independently_verified}));
  const ceremonyEvidence:Build423WorkflowCeremonyReceipt[]=ceremonies.rows.map(r=>({receiptId:r.receipt_id,appId:r.app_id,workflow:r.workflow,state:r.state,requesterRole:r.requester_role,approverRole:r.approver_role,executorRole:r.executor_role,requesterIdHash:r.requester_id_hash,approverIdHash:r.approver_id_hash,executorIdHash:r.executor_id_hash,explicitApproval:r.explicit_approval,authoritySeparated:r.authority_separated,ownerGatePreserved:r.owner_gate_preserved,sourceAuthorityPreserved:r.source_authority_preserved,rollbackOrAbortAvailable:r.rollback_or_abort_available,evidenceDigest:r.evidence_digest,observedAt:new Date(r.observed_at).toISOString(),expiresAt:new Date(r.expires_at).toISOString(),sourceOwned:r.source_owned,ownerReviewed:r.owner_reviewed,independentlyVerified:r.independently_verified}));
  const telemetryEvidence:Build423TelemetryReceipt[]=telemetry.rows.map(r=>({receiptId:r.receipt_id,appId:r.app_id,eventId:r.event_id,nonce:r.nonce,sourceCommit:r.source_commit,state:r.state,eventKind:r.event_kind,issuedAt:new Date(r.issued_at).toISOString(),expiresAt:new Date(r.expires_at).toISOString(),sourceSignatureVerified:r.source_signature_verified,sourceCommitVerified:r.source_commit_verified,privacyBoundaryVerified:r.privacy_boundary_verified,antiReplayVerified:r.anti_replay_verified,transportVerified:r.transport_verified,independentSignerPinVerified:r.independent_signer_pin_verified,ownerReviewed:r.owner_reviewed}));
  return {model:evaluateBuild423({roles:roleEvidence,ceremonies:ceremonyEvidence,telemetry:telemetryEvidence,nowIso:new Date().toISOString()}),latestTelemetry:telemetryEvidence.slice(0,14)};
 });
}

import { withUserDatabase } from "./database";
import {
  evaluateBuild416OriginalHostContinuity,
  type Build416CertificateRotationReceipt,
  type Build416HostBootWitnessReceipt,
  type Build416PeerAckReceipt
} from "./master-original-host-continuity";

export async function readBuild416OriginalHostContinuity(
  userId:string,
  nowIso:string
) {
  return withUserDatabase(userId,async(client)=>{
    const hosts=await client.query<{
      receipt_id:string; service_id:Build416HostBootWitnessReceipt["serviceId"];
      host_id:"DESKTOP-AE894KC"; scm_service_name:string;
      observed_source_revision:string; installer_artifact_digest:string;
      executable_digest:string; service_account_identity_digest:string;
      pre_boot_evidence_digest:string; post_boot_evidence_digest:string;
      boot_session_id:string; service_installed:boolean; startup_mode:Build416HostBootWitnessReceipt["startupMode"];
      recovery_policy_verified:boolean; unattended_start_before_login_verified:boolean;
      post_boot_running_verified:boolean; no_manual_intervention_observed:boolean;
      ten_minute_continuity_verified:boolean; continuous_24_hours_verified:boolean;
      rollback_to_prior_configuration_verified:boolean; owner_startup_mode_approved:boolean;
      owner_approval_receipt_digest:string; independent_custodian_receipt_digest:string;
      independent_witness_receipt_digest:string; observed_at:string; expires_at:string;
      state:Build416HostBootWitnessReceipt["state"];
    }>(`select receipt_id,service_id,host_id,scm_service_name,observed_source_revision,
      installer_artifact_digest,executable_digest,service_account_identity_digest,
      pre_boot_evidence_digest,post_boot_evidence_digest,boot_session_id,service_installed,
      startup_mode,recovery_policy_verified,unattended_start_before_login_verified,
      post_boot_running_verified,no_manual_intervention_observed,ten_minute_continuity_verified,
      continuous_24_hours_verified,rollback_to_prior_configuration_verified,
      owner_startup_mode_approved,owner_approval_receipt_digest,
      independent_custodian_receipt_digest,independent_witness_receipt_digest,
      observed_at::text,expires_at::text,state
      from app.master_build416_host_boot_witness_receipts
      order by observed_at desc limit 100`);

    const peers=await client.query<{
      receipt_id:string; peer_id:Build416PeerAckReceipt["peerId"]; route:string;
      route_implemented:boolean; protocol_version:"1.1"; mtls_client_certificate_enrolled:boolean;
      mtls_handshake_verified:boolean; server_leaf_pin_verified:boolean; peer_signer_enrolled:boolean;
      signed_ack_verified:boolean; ack_disposition:Build416PeerAckReceipt["ackDisposition"];
      event_digest:string; ack_digest:string; transport_evidence_digest:string;
      replay_protection_verified:boolean; no_command_sink:boolean; receipt_only_sink:boolean;
      source_authority_preserved:boolean; direct_peer_database_write:boolean;
      observed_at:string; expires_at:string; independently_verified:boolean;
      state:Build416PeerAckReceipt["state"];
    }>(`select receipt_id,peer_id,route,route_implemented,protocol_version,
      mtls_client_certificate_enrolled,mtls_handshake_verified,server_leaf_pin_verified,
      peer_signer_enrolled,signed_ack_verified,ack_disposition,event_digest,ack_digest,
      transport_evidence_digest,replay_protection_verified,no_command_sink,receipt_only_sink,
      source_authority_preserved,direct_peer_database_write,observed_at::text,expires_at::text,
      independently_verified,state
      from app.master_build416_peer_ack_receipts
      order by observed_at desc limit 100`);

    const rotations=await client.query<{
      receipt_id:string; peer_id:Build416CertificateRotationReceipt["peerId"];
      owner_plan_digest:string; previous_leaf_pin_digest:string; candidate_leaf_pin_digest:string;
      overlap_hours:number; candidate_handshake_verified:boolean; peer_reenrolled:boolean;
      fresh_signed_ack_under_candidate_verified:boolean;
      previous_credential_retained_during_overlap:boolean;
      old_credential_retired_after_acceptance:boolean; rollback_ready_during_overlap:boolean;
      automatic_activation_authorized:boolean; observed_at:string; expires_at:string;
      independently_verified:boolean; state:Build416CertificateRotationReceipt["state"];
    }>(`select receipt_id,peer_id,owner_plan_digest,previous_leaf_pin_digest,
      candidate_leaf_pin_digest,overlap_hours,candidate_handshake_verified,peer_reenrolled,
      fresh_signed_ack_under_candidate_verified,previous_credential_retained_during_overlap,
      old_credential_retired_after_acceptance,rollback_ready_during_overlap,
      automatic_activation_authorized,observed_at::text,expires_at::text,
      independently_verified,state
      from app.master_build416_certificate_rotation_receipts
      order by observed_at desc limit 100`);

    const hostReceipts:Build416HostBootWitnessReceipt[]=hosts.rows.map(r=>({
      receiptId:r.receipt_id,serviceId:r.service_id,hostId:r.host_id,
      scmServiceName:r.scm_service_name,observedSourceRevision:r.observed_source_revision,
      installerArtifactDigest:r.installer_artifact_digest,executableDigest:r.executable_digest,
      serviceAccountIdentityDigest:r.service_account_identity_digest,
      preBootEvidenceDigest:r.pre_boot_evidence_digest,postBootEvidenceDigest:r.post_boot_evidence_digest,
      bootSessionId:r.boot_session_id,serviceInstalled:r.service_installed,startupMode:r.startup_mode,
      recoveryPolicyVerified:r.recovery_policy_verified,
      unattendedStartBeforeLoginVerified:r.unattended_start_before_login_verified,
      postBootRunningVerified:r.post_boot_running_verified,
      noManualInterventionObserved:r.no_manual_intervention_observed,
      tenMinuteContinuityVerified:r.ten_minute_continuity_verified,
      continuous24HoursVerified:r.continuous_24_hours_verified,
      rollbackToPriorConfigurationVerified:r.rollback_to_prior_configuration_verified,
      ownerStartupModeApproved:r.owner_startup_mode_approved,
      ownerApprovalReceiptDigest:r.owner_approval_receipt_digest,
      independentCustodianReceiptDigest:r.independent_custodian_receipt_digest,
      independentWitnessReceiptDigest:r.independent_witness_receipt_digest,
      observedAt:new Date(r.observed_at).toISOString(),expiresAt:new Date(r.expires_at).toISOString(),
      state:r.state
    }));
    const peerAckReceipts:Build416PeerAckReceipt[]=peers.rows.map(r=>({
      receiptId:r.receipt_id,peerId:r.peer_id,route:r.route as Build416PeerAckReceipt["route"],
      routeImplemented:r.route_implemented,protocolVersion:r.protocol_version,
      mtlsClientCertificateEnrolled:r.mtls_client_certificate_enrolled,
      mtlsHandshakeVerified:r.mtls_handshake_verified,serverLeafPinVerified:r.server_leaf_pin_verified,
      peerSignerEnrolled:r.peer_signer_enrolled,signedAckVerified:r.signed_ack_verified,
      ackDisposition:r.ack_disposition,eventDigest:r.event_digest,ackDigest:r.ack_digest,
      transportEvidenceDigest:r.transport_evidence_digest,replayProtectionVerified:r.replay_protection_verified,
      noCommandSink:r.no_command_sink,receiptOnlySink:r.receipt_only_sink,
      sourceAuthorityPreserved:r.source_authority_preserved,
      directPeerDatabaseWrite:r.direct_peer_database_write,
      observedAt:new Date(r.observed_at).toISOString(),expiresAt:new Date(r.expires_at).toISOString(),
      independentlyVerified:r.independently_verified,state:r.state
    }));
    const rotationReceipts:Build416CertificateRotationReceipt[]=rotations.rows.map(r=>({
      receiptId:r.receipt_id,peerId:r.peer_id,ownerPlanDigest:r.owner_plan_digest,
      previousLeafPinDigest:r.previous_leaf_pin_digest,candidateLeafPinDigest:r.candidate_leaf_pin_digest,
      overlapHours:r.overlap_hours,candidateHandshakeVerified:r.candidate_handshake_verified,
      peerReenrolled:r.peer_reenrolled,
      freshSignedAckUnderCandidateVerified:r.fresh_signed_ack_under_candidate_verified,
      previousCredentialRetainedDuringOverlap:r.previous_credential_retained_during_overlap,
      oldCredentialRetiredAfterAcceptance:r.old_credential_retired_after_acceptance,
      rollbackReadyDuringOverlap:r.rollback_ready_during_overlap,
      automaticActivationAuthorized:r.automatic_activation_authorized,
      observedAt:new Date(r.observed_at).toISOString(),expiresAt:new Date(r.expires_at).toISOString(),
      independentlyVerified:r.independently_verified,state:r.state
    }));

    return evaluateBuild416OriginalHostContinuity({
      build415SoftwareReleasePresent:true,
      hostReceipts,peerAckReceipts,rotationReceipts,nowIso
    });
  });
}

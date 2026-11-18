import {withUserDatabase} from "./database";
import {evaluateBuild422Renewal,type Build422DirectionalDlpRenewal,type Build422LocalLifecycleEvidence} from "./master-data-lifecycle-retention-deletion-dlp-renewal";
export async function readBuild422Renewal(userId:string,nowIso:string){
  return withUserDatabase(userId,async client=>{
    const [localRows,directionalRows]=await Promise.all([
      client.query("select * from app.master_build422_data_lifecycle_renewals order by observed_at desc limit 1000"),
      client.query("select * from app.master_build422_directional_dlp_renewals order by observed_at desc limit 1000")
    ]);
    const localEvidence:Build422LocalLifecycleEvidence[]=localRows.rows.map(row=>({
      evidenceId:String(row.evidence_id),appId:String(row.app_id) as Build422LocalLifecycleEvidence["appId"],
      dimension:String(row.dimension) as Build422LocalLifecycleEvidence["dimension"],state:String(row.state) as Build422LocalLifecycleEvidence["state"],
      classificationInventoryCurrent:Boolean(row.classification_inventory_current),allFiveDataClassesCovered:Boolean(row.all_five_data_classes_covered),
      unknownDataFailsClosed:Boolean(row.unknown_data_fails_closed),transportEncryptionVerified:Boolean(row.transport_encryption_verified),
      sensitiveAtRestEncryptionVerified:Boolean(row.sensitive_at_rest_encryption_verified),secretFieldProtectionVerified:Boolean(row.secret_field_protection_verified),
      keyMaterialOutsideSourceControl:Boolean(row.key_material_outside_source_control),structuredLogRedactionVerified:Boolean(row.structured_log_redaction_verified),
      credentialPatternRedactionVerified:Boolean(row.credential_pattern_redaction_verified),auditMinimizationVerified:Boolean(row.audit_minimization_verified),
      rawSecretMaterialAbsent:Boolean(row.raw_secret_material_absent),purposeBoundRetentionVerified:Boolean(row.purpose_bound_retention_verified),
      retentionScheduleCurrent:Boolean(row.retention_schedule_current),expiryEnforced:Boolean(row.expiry_enforced),
      expiredDataRequiresHoldOrDeletion:Boolean(row.expired_data_requires_hold_or_deletion),deletionWorkflowVerified:Boolean(row.deletion_workflow_verified),
      deletionReceiptRequired:Boolean(row.deletion_receipt_required),deletionEvidenceImmutable:Boolean(row.deletion_evidence_immutable),
      legalHoldPreserved:Boolean(row.legal_hold_preserved),exportInspectionVerified:Boolean(row.export_inspection_verified),
      restrictedExportOwnerGateVerified:Boolean(row.restricted_export_owner_gate_verified),classificationPreservedOnExport:Boolean(row.classification_preserved_on_export),
      rawSecretExfiltrationBlocked:Boolean(row.raw_secret_exfiltration_blocked),crossTenantExportBlocked:Boolean(row.cross_tenant_export_blocked),
      tenantContextVerified:Boolean(row.tenant_context_verified),workspaceBoundaryPreserved:Boolean(row.workspace_boundary_preserved),
      destinationPolicyCompatible:Boolean(row.destination_policy_compatible),evidenceDigest:String(row.evidence_digest),sourceOwned:Boolean(row.source_owned),
      syntheticEvidence:Boolean(row.synthetic_evidence),ownerReviewed:Boolean(row.owner_reviewed),independentlyVerified:Boolean(row.independently_verified),
      observedAt:new Date(row.observed_at).toISOString(),expiresAt:new Date(row.expires_at).toISOString()
    }));
    const directionalRenewals:Build422DirectionalDlpRenewal[]=directionalRows.rows.map(row=>({
      receiptId:String(row.receipt_id),sourceAppId:String(row.source_app_id) as Build422DirectionalDlpRenewal["sourceAppId"],
      targetAppId:String(row.target_app_id) as Build422DirectionalDlpRenewal["targetAppId"],dataClass:String(row.data_class) as Build422DirectionalDlpRenewal["dataClass"],
      state:String(row.state) as Build422DirectionalDlpRenewal["state"],exactSourceTargetBound:Boolean(row.exact_source_target_bound),
      classificationCurrent:Boolean(row.classification_current),transportEncrypted:Boolean(row.transport_encrypted),payloadMinimized:Boolean(row.payload_minimized),
      redactionApplied:Boolean(row.redaction_applied),consentRequired:Boolean(row.consent_required),consentValid:Boolean(row.consent_valid),
      retentionBoundaryPreserved:Boolean(row.retention_boundary_preserved),exportInspected:Boolean(row.export_inspected),
      restrictedOwnerGate:Boolean(row.restricted_owner_gate),secretReferenceOnly:Boolean(row.secret_reference_only),
      crossTenantExportDenied:Boolean(row.cross_tenant_export_denied),destinationPolicyCompatible:Boolean(row.destination_policy_compatible),
      evidenceDigest:String(row.evidence_digest),sourceOwned:Boolean(row.source_owned),syntheticEvidence:Boolean(row.synthetic_evidence),
      ownerReviewed:Boolean(row.owner_reviewed),independentlyVerified:Boolean(row.independently_verified),
      observedAt:new Date(row.observed_at).toISOString(),expiresAt:new Date(row.expires_at).toISOString()
    }));
    return evaluateBuild422Renewal({build421SoftwareReleasePresent:true,localEvidence,directionalRenewals,nowIso});
  });
}

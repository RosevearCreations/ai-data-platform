import {withUserDatabase} from "./database";
import {
  evaluateBuild421Renewal,
  type Build421DelegatedCapabilityRenewal,
  type Build421LocalRenewalEvidence
} from "./master-tenant-isolation-consent-delegated-renewal";

export async function readBuild421Renewal(userId:string,nowIso:string){
  return withUserDatabase(userId,async client=>{
    const [localRows,delegatedRows]=await Promise.all([
      client.query("select * from app.master_build421_local_security_consent_renewals order by observed_at desc limit 500"),
      client.query("select * from app.master_build421_delegated_capability_renewals order by observed_at desc limit 500")
    ]);

    const localEvidence:Build421LocalRenewalEvidence[]=localRows.rows.map(row=>({
      evidenceId:String(row.evidence_id),
      appId:String(row.app_id) as Build421LocalRenewalEvidence["appId"],
      dimension:String(row.dimension) as Build421LocalRenewalEvidence["dimension"],
      state:String(row.state) as Build421LocalRenewalEvidence["state"],
      denyByDefault:Boolean(row.deny_by_default),
      exactCapabilityNamespace:Boolean(row.exact_capability_namespace),
      wildcardCapabilityGrant:Boolean(row.wildcard_capability_grant),
      staleGrantReviewComplete:Boolean(row.stale_grant_review_complete),
      leastPrivilegePolicyCurrent:Boolean(row.least_privilege_policy_current),
      t5NonDelegable:Boolean(row.t5_non_delegable),
      crossTenantOverrideGranted:Boolean(row.cross_tenant_override_granted),
      apiBoundaryVerified:Boolean(row.api_boundary_verified),
      databaseRlsVerified:Boolean(row.database_rls_verified),
      storageBoundaryVerified:Boolean(row.storage_boundary_verified),
      tenantContextValidated:Boolean(row.tenant_context_validated),
      sameTenantForeignAccessDenied:Boolean(row.same_tenant_foreign_access_denied),
      crossTenantAccessDenied:Boolean(row.cross_tenant_access_denied),
      crossWorkspaceAccessDenied:Boolean(row.cross_workspace_access_denied),
      personalDataRequiresExplicitConsent:Boolean(row.personal_data_requires_explicit_consent),
      consentPurposeBound:Boolean(row.consent_purpose_bound),
      consentExpiryEnforced:Boolean(row.consent_expiry_enforced),
      consentWithdrawalRevokesCapability:Boolean(row.consent_withdrawal_revokes_capability),
      revocationPropagationVerified:Boolean(row.revocation_propagation_verified),
      revokedGrantRejected:Boolean(row.revoked_grant_rejected),
      renewalRequiresFreshConsent:Boolean(row.renewal_requires_fresh_consent),
      consentMayGrantNewCapability:Boolean(row.consent_may_grant_new_capability),
      rawPersonalDataIncludedInEvidence:Boolean(row.raw_personal_data_included_in_evidence),
      evidenceDigest:String(row.evidence_digest),
      sourceOwned:Boolean(row.source_owned),
      syntheticEvidence:Boolean(row.synthetic_evidence),
      ownerReviewed:Boolean(row.owner_reviewed),
      independentlyVerified:Boolean(row.independently_verified),
      observedAt:new Date(row.observed_at).toISOString(),
      expiresAt:new Date(row.expires_at).toISOString()
    }));

    const delegatedRenewals:Build421DelegatedCapabilityRenewal[]=delegatedRows.rows.map(row=>({
      receiptId:String(row.receipt_id),
      sourceAppId:String(row.source_app_id) as Build421DelegatedCapabilityRenewal["sourceAppId"],
      targetAppId:String(row.target_app_id) as Build421DelegatedCapabilityRenewal["targetAppId"],
      capabilityNamespace:String(row.capability_namespace),
      state:String(row.state) as Build421DelegatedCapabilityRenewal["state"],
      maxLifetimeHours:Number(row.max_lifetime_hours),
      exactCapabilityRequired:Boolean(row.exact_capability_required),
      exactAudienceRequired:Boolean(row.exact_audience_required),
      tenantScopePreserved:Boolean(row.tenant_scope_preserved),
      workspaceScopePreserved:Boolean(row.workspace_scope_preserved),
      consentScopePreserved:Boolean(row.consent_scope_preserved),
      explicitRenewalRequired:Boolean(row.explicit_renewal_required),
      previousGrantMaySelfRenew:Boolean(row.previous_grant_may_self_renew),
      consentValidAtRenewal:Boolean(row.consent_valid_at_renewal),
      subdelegationAllowed:Boolean(row.subdelegation_allowed),
      authorityTransfer:Boolean(row.authority_transfer),
      t5DelegationAllowed:Boolean(row.t5_delegation_allowed),
      revocationPropagationRequired:Boolean(row.revocation_propagation_required),
      consequentialWritesRequireOwnerGate:Boolean(row.consequential_writes_require_owner_gate),
      evidenceDigest:String(row.evidence_digest),
      sourceOwned:Boolean(row.source_owned),
      syntheticEvidence:Boolean(row.synthetic_evidence),
      ownerReviewed:Boolean(row.owner_reviewed),
      independentlyVerified:Boolean(row.independently_verified),
      grantIssuedAt:new Date(row.grant_issued_at).toISOString(),
      grantExpiresAt:new Date(row.grant_expires_at).toISOString(),
      revokedAt:row.revoked_at?new Date(row.revoked_at).toISOString():null,
      observedAt:new Date(row.observed_at).toISOString(),
      evidenceExpiresAt:new Date(row.evidence_expires_at).toISOString()
    }));

    return evaluateBuild421Renewal({
      build420SoftwareReleasePresent:true,
      localEvidence,
      delegatedRenewals,
      nowIso
    });
  });
}

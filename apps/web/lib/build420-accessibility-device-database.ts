import {withUserDatabase} from "./database";
import {
  evaluateBuild420Recertification,
  type Build420RecertificationEvidence
} from "./master-accessibility-device-degraded-network-recertification";

export async function readBuild420Recertification(userId:string,nowIso:string){
  return withUserDatabase(userId,async client=>{
    const rows=await client.query(
      `select * from app.master_build420_accessibility_device_network_evidence order by observed_at desc limit 500`
    );
    const evidence:Build420RecertificationEvidence[]=rows.rows.map(row=>({
      evidenceId:String(row.evidence_id),
      appId:String(row.app_id) as Build420RecertificationEvidence["appId"],
      dimension:String(row.dimension) as Build420RecertificationEvidence["dimension"],
      state:String(row.state) as Build420RecertificationEvidence["state"],
      acceptancePercent:Number(row.acceptance_percent),
      criticalFailureCount:Number(row.critical_failure_count),
      testRunCount:Number(row.test_run_count),
      viewportObservedWidthPx:Number(row.viewport_observed_width_px),
      touchTargetMinPx:Number(row.touch_target_min_px),
      criticalHorizontalOverflow:Boolean(row.critical_horizontal_overflow),
      keyboardOnlyWorkflowComplete:Boolean(row.keyboard_only_workflow_complete),
      visibleFocusVerified:Boolean(row.visible_focus_verified),
      screenReaderSemanticsVerified:Boolean(row.screen_reader_semantics_verified),
      forcedColorsVerified:Boolean(row.forced_colors_verified),
      contrastAaVerified:Boolean(row.contrast_aa_verified),
      reducedMotionVerified:Boolean(row.reduced_motion_verified),
      loadingStateVerified:Boolean(row.loading_state_verified),
      emptyStateVerified:Boolean(row.empty_state_verified),
      errorStateVerified:Boolean(row.error_state_verified),
      retrySafe:Boolean(row.retry_safe),
      offlineBehaviorVerified:Boolean(row.offline_behavior_verified),
      degradedNetworkVerified:Boolean(row.degraded_network_verified),
      recoveryPreservesData:Boolean(row.recovery_preserves_data),
      noDuplicateEffects:Boolean(row.no_duplicate_effects),
      evidenceDigest:String(row.evidence_digest),
      sourceOwned:Boolean(row.source_owned),
      syntheticEvidence:Boolean(row.synthetic_evidence),
      ownerReviewed:Boolean(row.owner_reviewed),
      independentlyVerified:Boolean(row.independently_verified),
      observedAt:new Date(row.observed_at).toISOString(),
      expiresAt:new Date(row.expires_at).toISOString()
    }));
    return evaluateBuild420Recertification({
      build419SoftwareReleasePresent:true,evidence,nowIso
    });
  });
}

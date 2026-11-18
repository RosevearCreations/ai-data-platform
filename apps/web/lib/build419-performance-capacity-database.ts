import {withUserDatabase} from "./database";
import {
  evaluateBuild419PerformanceCapacityUsage,
  type Build419CapacityForecastReceipt,
  type Build419PerformanceBudgetReceipt,
  type Build419VercelUsageReceipt
} from "./master-performance-capacity-vercel-guardrails";

export async function readBuild419PerformanceCapacityUsage(userId:string,nowIso:string){
  return withUserDatabase(userId,async client=>{
    const [performanceRows,capacityRows,vercelRows]=await Promise.all([
      client.query(`select * from app.master_build419_performance_budget_receipts order by observed_at desc limit 500`),
      client.query(`select * from app.master_build419_capacity_forecast_receipts order by observed_at desc limit 100`),
      client.query(`select * from app.master_build419_vercel_usage_receipts order by observed_at desc limit 100`)
    ]);
    const performance:Build419PerformanceBudgetReceipt[]=performanceRows.rows.map(row=>({
      receiptId:String(row.receipt_id),
      appId:String(row.app_id) as Build419PerformanceBudgetReceipt["appId"],
      domain:String(row.domain) as Build419PerformanceBudgetReceipt["domain"],
      metricKey:String(row.metric_key),unit:String(row.unit) as Build419PerformanceBudgetReceipt["unit"],
      measuredValue:Number(row.measured_value),warningThreshold:Number(row.warning_threshold),
      criticalThreshold:Number(row.critical_threshold),sampleCount:Number(row.sample_count),
      sourceEvidenceDigest:String(row.source_evidence_digest),budgetPolicyDigest:String(row.budget_policy_digest),
      sourceOwned:Boolean(row.source_owned),syntheticEvidence:Boolean(row.synthetic_evidence),
      independentlyVerified:Boolean(row.independently_verified),
      observedAt:new Date(row.observed_at).toISOString(),expiresAt:new Date(row.expires_at).toISOString(),
      state:String(row.state) as Build419PerformanceBudgetReceipt["state"]
    }));
    const capacity:Build419CapacityForecastReceipt[]=capacityRows.rows.map(row=>({
      receiptId:String(row.receipt_id),
      appId:String(row.app_id) as Build419CapacityForecastReceipt["appId"],
      scenarioId:String(row.scenario_id),unit:String(row.unit) as Build419CapacityForecastReceipt["unit"],
      currentDemand:Number(row.current_demand),forecastDemand:Number(row.forecast_demand),
      growthMultiplier:Number(row.growth_multiplier),authoritativeCapacityKnown:Boolean(row.authoritative_capacity_known),
      knownHardCapacity:row.known_hard_capacity===null?null:Number(row.known_hard_capacity),
      headroomClaimed:Boolean(row.headroom_claimed),headroomValue:row.headroom_value===null?null:Number(row.headroom_value),
      sourceEvidenceDigest:String(row.source_evidence_digest),forecastPolicyDigest:String(row.forecast_policy_digest),
      ownerReviewed:Boolean(row.owner_reviewed),automaticScalingAuthorized:Boolean(row.automatic_scaling_authorized),
      automaticPurchasingAuthorized:Boolean(row.automatic_purchasing_authorized),
      independentlyVerified:Boolean(row.independently_verified),
      observedAt:new Date(row.observed_at).toISOString(),expiresAt:new Date(row.expires_at).toISOString(),
      state:String(row.state) as Build419CapacityForecastReceipt["state"]
    }));
    const vercel:Build419VercelUsageReceipt[]=vercelRows.rows.map(row=>({
      receiptId:String(row.receipt_id),
      appId:String(row.app_id) as Build419VercelUsageReceipt["appId"],
      hostedOnVercel:Boolean(row.hosted_on_vercel),projectId:row.project_id===null?null:String(row.project_id),
      windowHours:24,totalDeployments:Number(row.total_deployments),previewDeployments:Number(row.preview_deployments),
      productionDeployments:Number(row.production_deployments),readyDeployments:Number(row.ready_deployments),
      errorDeployments:Number(row.error_deployments),canceledDeployments:Number(row.canceled_deployments),
      uniqueCommitCount:Number(row.unique_commit_count),duplicateDeploymentCount:Number(row.duplicate_deployment_count),
      maxTotalDeployments24h:row.max_total_deployments_24h===null?null:Number(row.max_total_deployments_24h),
      maxPreviewDeployments24h:row.max_preview_deployments_24h===null?null:Number(row.max_preview_deployments_24h),
      maxProductionDeployments24h:row.max_production_deployments_24h===null?null:Number(row.max_production_deployments_24h),
      maxDuplicateDeployments24h:row.max_duplicate_deployments_24h===null?null:Number(row.max_duplicate_deployments_24h),
      maxErrorRatePct:row.max_error_rate_pct===null?null:Number(row.max_error_rate_pct),
      budgetSourceDigest:row.budget_source_digest===null?null:String(row.budget_source_digest),
      exactShaPreviewReuseObserved:Boolean(row.exact_sha_preview_reuse_observed),
      previewDatabaseMigrationsObserved:Boolean(row.preview_database_migrations_observed),
      billingImported:Boolean(row.billing_imported),planLimitImported:Boolean(row.plan_limit_imported),
      ownerDefinedBudget:Boolean(row.owner_defined_budget),independentlyVerified:Boolean(row.independently_verified),
      observedAt:new Date(row.observed_at).toISOString(),expiresAt:new Date(row.expires_at).toISOString(),
      state:String(row.state) as Build419VercelUsageReceipt["state"]
    }));
    return evaluateBuild419PerformanceCapacityUsage({
      build418SoftwareReleasePresent:true,performanceBudgets:performance,
      capacityForecasts:capacity,vercelUsage:vercel,nowIso
    });
  });
}

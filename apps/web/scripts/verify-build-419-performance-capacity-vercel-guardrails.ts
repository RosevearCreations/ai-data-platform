import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {BUILD_405_APPLICATION_IDS} from "../lib/master-assurance-renewal-security-comms-recertification";
import {
  BUILD_419_PERFORMANCE_DOMAINS,
  evaluateBuild419PerformanceCapacityUsage,
  performanceBudgetStatus419,
  validateBuild419CapacityForecast,
  validateBuild419PerformanceBudget,
  validateBuild419VercelUsage,
  vercelUsageStatus419,
  type Build419CapacityForecastReceipt,
  type Build419PerformanceBudgetReceipt,
  type Build419VercelUsageReceipt
} from "../lib/master-performance-capacity-vercel-guardrails";

const now="2026-11-18T14:00:00.000Z";
const digest=(c:string)=>"sha256:"+c.repeat(64);
const performance:Build419PerformanceBudgetReceipt[]=[];
let index=0;
for(const appId of BUILD_405_APPLICATION_IDS){
  for(const domain of BUILD_419_PERFORMANCE_DOMAINS){
    const i=index++;
    performance.push({
      receiptId:"perf-419-"+i,appId,domain,metricKey:"metric-"+domain.toLowerCase(),
      unit:"ms",measuredValue:100,warningThreshold:500,criticalThreshold:1000,
      sampleCount:25,sourceEvidenceDigest:digest(((i%6)+1).toString(16)),
      budgetPolicyDigest:digest("a"),sourceOwned:true,syntheticEvidence:false,
      independentlyVerified:true,observedAt:"2026-11-18T12:00:00.000Z",
      expiresAt:"2026-11-25T12:00:00.000Z",state:"VERIFIED"
    });
  }
}
for(const item of performance){
  assert.equal(validateBuild419PerformanceBudget(item,now),true);
  assert.equal(performanceBudgetStatus419(item),"HEALTHY");
}
const capacity:Build419CapacityForecastReceipt[]=BUILD_405_APPLICATION_IDS.map((appId,i)=>({
  receiptId:"capacity-419-"+i,appId,scenarioId:"moderate-growth",unit:"requests",
  currentDemand:100,forecastDemand:150,growthMultiplier:1.5,
  authoritativeCapacityKnown:false,knownHardCapacity:null,headroomClaimed:false,headroomValue:null,
  sourceEvidenceDigest:digest("b"),forecastPolicyDigest:digest("c"),ownerReviewed:true,
  automaticScalingAuthorized:false,automaticPurchasingAuthorized:false,independentlyVerified:true,
  observedAt:"2026-11-18T12:00:00.000Z",expiresAt:"2026-11-25T12:00:00.000Z",state:"VERIFIED"
}));
for(const item of capacity)assert.equal(validateBuild419CapacityForecast(item,now),true);

const hosted=new Set(["ai-data-platform","icamp","yw"]);
const vercel:Build419VercelUsageReceipt[]=BUILD_405_APPLICATION_IDS.map((appId,i)=>{
  const isHosted=hosted.has(appId);
  return {
    receiptId:"vercel-419-"+i,appId,hostedOnVercel:isHosted,
    projectId:isHosted?"prj_Abc123XYZ"+i:null,windowHours:24 as const,
    totalDeployments:isHosted?6:0,previewDeployments:isHosted?4:0,productionDeployments:isHosted?2:0,
    readyDeployments:isHosted?6:0,errorDeployments:0,canceledDeployments:0,
    uniqueCommitCount:isHosted?6:0,duplicateDeploymentCount:0,
    maxTotalDeployments24h:isHosted?20:null,maxPreviewDeployments24h:isHosted?15:null,
    maxProductionDeployments24h:isHosted?5:null,maxDuplicateDeployments24h:isHosted?3:null,
    maxErrorRatePct:isHosted?20:null,budgetSourceDigest:isHosted?digest("d"):null,
    exactShaPreviewReuseObserved:isHosted,previewDatabaseMigrationsObserved:false,
    billingImported:false,planLimitImported:false,ownerDefinedBudget:isHosted,
    independentlyVerified:true,observedAt:"2026-11-18T12:00:00.000Z",
    expiresAt:"2026-11-25T12:00:00.000Z",state:isHosted?"VERIFIED" as const:"NOT_APPLICABLE" as const
  };
});
for(const item of vercel)assert.equal(validateBuild419VercelUsage(item,now),true);
assert.equal(vercelUsageStatus419(vercel[0]),"HEALTHY");

const good=evaluateBuild419PerformanceCapacityUsage({
  build418SoftwareReleasePresent:true,performanceBudgets:performance,
  capacityForecasts:capacity,vercelUsage:vercel,nowIso:now
});
assert.equal(good.governanceState,"SHARED_PERFORMANCE_CAPACITY_AND_USAGE_GUARDRAILS_ASSURED");
assert.equal(good.counts.requiredPerformanceSlots,35);
assert.equal(good.counts.capacityForecastReceipts,7);
assert.equal(good.counts.vercelHostingDispositions,7);
assert.equal(good.counts.hostedOnVercel,3);

const missing=evaluateBuild419PerformanceCapacityUsage({
  build418SoftwareReleasePresent:true,performanceBudgets:performance.slice(0,34),
  capacityForecasts:capacity,vercelUsage:vercel,nowIso:now
});
assert.equal(missing.governanceState,"HOLD_SHARED_PERFORMANCE_BUDGET_EVIDENCE_REQUIRED");

const critical={...vercel[0],totalDeployments:20,previewDeployments:18,productionDeployments:2,
  readyDeployments:20,uniqueCommitCount:20};
assert.equal(validateBuild419VercelUsage(critical,now),true);
assert.equal(vercelUsageStatus419(critical),"CRITICAL");

const root=path.resolve(process.cwd(),"../..");
const read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");
const migration=read("db/migrations/0182_master_performance_capacity_vercel_guardrails.sql");
for(const token of [
  "master_build419_performance_budget_receipts",
  "master_build419_capacity_forecast_receipts",
  "master_build419_vercel_usage_receipts",
  "force row level security","revoke update,delete",
  "preview_database_migrations_observed","owner_defined_budget"
])assert.ok(migration.includes(token),"migration token missing: "+token);

const page=read("apps/web/app/performance-capacity-guardrails/page.tsx");
for(const token of [
  "Build 419 · Performance, Capacity & Vercel Guardrails",
  "Seven applications × five performance domains",
  "Deployment efficiency without false limits."
])assert.ok(page.includes(token),"page token missing: "+token);

const manifest=JSON.parse(read(".github/rosevear-build419-performance-capacity-vercel-guardrails.v1.json"));
assert.equal(manifest.build,419);
assert.equal(manifest.policy.performanceBudgetSlotsRequired,35);
assert.equal(manifest.policy.inventVercelPlanLimits,false);
assert.equal(manifest.policy.inventBilling,false);
assert.equal(manifest.policy.exactShaPreviewReuseRequired,true);
assert.equal(manifest.policy.previewDatabaseMigrationsAllowed,false);

const pkg=JSON.parse(read("apps/web/package.json"));
assert.ok(pkg.scripts.build.includes("verify-build-419-performance-capacity-vercel-guardrails.ts"));
assert.equal(pkg.scripts["verify:build419"],"tsx scripts/verify-build-419-performance-capacity-vercel-guardrails.ts");

const nav=read("apps/web/lib/application-navigation.ts");
assert.ok(nav.includes('href: "/performance-capacity-guardrails"'));
const masterNav=read("apps/web/lib/master-instrument-navigation.ts");
assert.ok(masterNav.includes('"/performance-capacity-guardrails"'));
const suite=read("apps/web/app/master-suite/page.tsx");
assert.ok(suite.includes("Build 419 · Rosevear Server Shell"));
assert.ok(suite.includes('href="/performance-capacity-guardrails"'));

const spine=read("apps/web/scripts/verify-ci-integration-spine-database.ts");
for(const token of [
  "master_build419_performance_budget_receipts","master_build419_capacity_forecast_receipts",
  "master_build419_vercel_usage_receipts","0182_master_performance_capacity_vercel_guardrails.sql"
])assert.ok(spine.includes(token),"CI spine missing "+token);

const roadmap=read("docs/NEXT_BUILDS_415_424.md");
assert.ok(roadmap.includes("Implemented in Build 419"));
console.log("Build 419 Shared Performance Budgets, Capacity Forecasting & Vercel Usage Guardrails verification passed.");

import {BUILD_405_APPLICATION_IDS} from "./master-assurance-renewal-security-comms-recertification";

export const BUILD_419=419 as const;
export const BUILD_419_SCHEMA=
  "rosevear.ai-data-platform.build419-performance-capacity-vercel-guardrails.v1" as const;
export const BUILD_419_PERFORMANCE_DOMAINS=[
  "USER_EXPERIENCE","API","DATABASE","INTEGRATION","DELIVERY"
] as const;
export type Build419ApplicationId=(typeof BUILD_405_APPLICATION_IDS)[number];
export type Build419PerformanceDomain=(typeof BUILD_419_PERFORMANCE_DOMAINS)[number];
export type Build419BudgetStatus="HEALTHY"|"WARNING"|"CRITICAL"|"UNMEASURED";

export type Build419PerformanceBudgetReceipt={
  receiptId:string;
  appId:Build419ApplicationId;
  domain:Build419PerformanceDomain;
  metricKey:string;
  unit:"ms"|"percent"|"count";
  measuredValue:number;
  warningThreshold:number;
  criticalThreshold:number;
  sampleCount:number;
  sourceEvidenceDigest:string;
  budgetPolicyDigest:string;
  sourceOwned:boolean;
  syntheticEvidence:boolean;
  independentlyVerified:boolean;
  observedAt:string;
  expiresAt:string;
  state:"VERIFIED"|"HOLD"|"FAILED";
};

export type Build419CapacityForecastReceipt={
  receiptId:string;
  appId:Build419ApplicationId;
  scenarioId:string;
  unit:"bytes"|"records"|"units"|"attempts"|"events"|"requests";
  currentDemand:number;
  forecastDemand:number;
  growthMultiplier:number;
  authoritativeCapacityKnown:boolean;
  knownHardCapacity:number|null;
  headroomClaimed:boolean;
  headroomValue:number|null;
  sourceEvidenceDigest:string;
  forecastPolicyDigest:string;
  ownerReviewed:boolean;
  automaticScalingAuthorized:boolean;
  automaticPurchasingAuthorized:boolean;
  independentlyVerified:boolean;
  observedAt:string;
  expiresAt:string;
  state:"VERIFIED"|"HOLD"|"FAILED";
};

export type Build419VercelUsageReceipt={
  receiptId:string;
  appId:Build419ApplicationId;
  hostedOnVercel:boolean;
  projectId:string|null;
  windowHours:24;
  totalDeployments:number;
  previewDeployments:number;
  productionDeployments:number;
  readyDeployments:number;
  errorDeployments:number;
  canceledDeployments:number;
  uniqueCommitCount:number;
  duplicateDeploymentCount:number;
  maxTotalDeployments24h:number|null;
  maxPreviewDeployments24h:number|null;
  maxProductionDeployments24h:number|null;
  maxDuplicateDeployments24h:number|null;
  maxErrorRatePct:number|null;
  budgetSourceDigest:string|null;
  exactShaPreviewReuseObserved:boolean;
  previewDatabaseMigrationsObserved:boolean;
  billingImported:boolean;
  planLimitImported:boolean;
  ownerDefinedBudget:boolean;
  independentlyVerified:boolean;
  observedAt:string;
  expiresAt:string;
  state:"VERIFIED"|"HOLD"|"FAILED"|"NOT_APPLICABLE";
};

function digest(value:string|null){return Boolean(value&&/^sha256:[a-f0-9]{64}$/.test(value));}
function fresh(value:string,now:number){const ms=Date.parse(value);return Number.isFinite(ms)&&ms>now;}
function latestByKey<T>(items:readonly T[],key:(item:T)=>string,observed:(item:T)=>string){
  const map=new Map<string,T>();
  for(const item of [...items].sort((a,b)=>observed(b).localeCompare(observed(a)))){
    const k=key(item);if(!map.has(k))map.set(k,item);
  }
  return map;
}
function nonNegative(value:number){return Number.isFinite(value)&&value>=0;}

export function performanceBudgetStatus419(item:Build419PerformanceBudgetReceipt):Build419BudgetStatus{
  if(item.sampleCount<=0)return "UNMEASURED";
  if(item.measuredValue>=item.criticalThreshold)return "CRITICAL";
  if(item.measuredValue>=item.warningThreshold)return "WARNING";
  return "HEALTHY";
}
export function vercelUsageStatus419(item:Build419VercelUsageReceipt):Build419BudgetStatus{
  if(!item.hostedOnVercel)return "HEALTHY";
  if(!item.ownerDefinedBudget)return "UNMEASURED";
  const errorRate=item.totalDeployments>0?(item.errorDeployments/item.totalDeployments)*100:0;
  const critical=
    item.maxTotalDeployments24h!==null&&item.totalDeployments>=item.maxTotalDeployments24h||
    item.maxPreviewDeployments24h!==null&&item.previewDeployments>=item.maxPreviewDeployments24h||
    item.maxProductionDeployments24h!==null&&item.productionDeployments>=item.maxProductionDeployments24h||
    item.maxDuplicateDeployments24h!==null&&item.duplicateDeploymentCount>=item.maxDuplicateDeployments24h||
    item.maxErrorRatePct!==null&&errorRate>=item.maxErrorRatePct;
  if(critical)return "CRITICAL";
  const warning=
    item.maxTotalDeployments24h!==null&&item.totalDeployments>=item.maxTotalDeployments24h*0.7||
    item.maxPreviewDeployments24h!==null&&item.previewDeployments>=item.maxPreviewDeployments24h*0.7||
    item.maxProductionDeployments24h!==null&&item.productionDeployments>=item.maxProductionDeployments24h*0.7||
    item.maxDuplicateDeployments24h!==null&&item.duplicateDeploymentCount>=item.maxDuplicateDeployments24h*0.7||
    item.maxErrorRatePct!==null&&errorRate>=item.maxErrorRatePct*0.7;
  return warning?"WARNING":"HEALTHY";
}

export function validateBuild419PerformanceBudget(item:Build419PerformanceBudgetReceipt,nowIso:string){
  const now=Date.parse(nowIso);
  return Boolean(
    BUILD_405_APPLICATION_IDS.includes(item.appId)&&
    BUILD_419_PERFORMANCE_DOMAINS.includes(item.domain)&&item.metricKey.length>=3&&
    nonNegative(item.measuredValue)&&nonNegative(item.warningThreshold)&&
    nonNegative(item.criticalThreshold)&&item.warningThreshold<item.criticalThreshold&&
    Number.isInteger(item.sampleCount)&&item.sampleCount>0&&digest(item.sourceEvidenceDigest)&&
    digest(item.budgetPolicyDigest)&&item.sourceOwned&&!item.syntheticEvidence&&
    item.independentlyVerified&&fresh(item.expiresAt,now)&&item.state==="VERIFIED"
  );
}
export function validateBuild419CapacityForecast(item:Build419CapacityForecastReceipt,nowIso:string){
  const now=Date.parse(nowIso);
  const capacityShape=item.authoritativeCapacityKnown
    ? item.knownHardCapacity!==null&&nonNegative(item.knownHardCapacity)&&
      item.headroomClaimed&&item.headroomValue!==null&&Number.isFinite(item.headroomValue)
    : item.knownHardCapacity===null&&!item.headroomClaimed&&item.headroomValue===null;
  return Boolean(
    BUILD_405_APPLICATION_IDS.includes(item.appId)&&item.scenarioId.length>=3&&
    nonNegative(item.currentDemand)&&nonNegative(item.forecastDemand)&&
    Number.isFinite(item.growthMultiplier)&&item.growthMultiplier>0&&
    capacityShape&&digest(item.sourceEvidenceDigest)&&digest(item.forecastPolicyDigest)&&
    item.ownerReviewed&&!item.automaticScalingAuthorized&&!item.automaticPurchasingAuthorized&&
    item.independentlyVerified&&fresh(item.expiresAt,now)&&item.state==="VERIFIED"
  );
}
export function validateBuild419VercelUsage(item:Build419VercelUsageReceipt,nowIso:string){
  const now=Date.parse(nowIso);
  if(!BUILD_405_APPLICATION_IDS.includes(item.appId)||!fresh(item.expiresAt,now))return false;
  if(!item.hostedOnVercel){
    return item.projectId===null&&item.state==="NOT_APPLICABLE"&&!item.billingImported&&
      !item.planLimitImported&&item.independentlyVerified;
  }
  const counts=[
    item.totalDeployments,item.previewDeployments,item.productionDeployments,item.readyDeployments,
    item.errorDeployments,item.canceledDeployments,item.uniqueCommitCount,item.duplicateDeploymentCount
  ];
  const budgets=[
    item.maxTotalDeployments24h,item.maxPreviewDeployments24h,item.maxProductionDeployments24h,
    item.maxDuplicateDeployments24h,item.maxErrorRatePct
  ];
  return Boolean(
    item.projectId&&/^prj_[A-Za-z0-9]+$/.test(item.projectId)&&item.windowHours===24&&
    counts.every(v=>Number.isInteger(v)&&v>=0)&&
    item.previewDeployments+item.productionDeployments===item.totalDeployments&&
    item.readyDeployments+item.errorDeployments+item.canceledDeployments<=item.totalDeployments&&
    item.uniqueCommitCount<=item.totalDeployments&&item.duplicateDeploymentCount<=item.totalDeployments&&
    item.ownerDefinedBudget&&budgets.every(v=>v!==null&&Number.isFinite(v)&&v>0)&&
    digest(item.budgetSourceDigest)&&item.exactShaPreviewReuseObserved&&
    !item.previewDatabaseMigrationsObserved&&!item.billingImported&&!item.planLimitImported&&
    item.independentlyVerified&&item.state==="VERIFIED"
  );
}

export function evaluateBuild419PerformanceCapacityUsage(input:{
  build418SoftwareReleasePresent:boolean;
  performanceBudgets?:readonly Build419PerformanceBudgetReceipt[];
  capacityForecasts?:readonly Build419CapacityForecastReceipt[];
  vercelUsage?:readonly Build419VercelUsageReceipt[];
  nowIso:string;
}){
  const performanceBySlot=latestByKey(
    input.performanceBudgets??[],item=>item.appId+"::"+item.domain,item=>item.observedAt
  );
  const capacityByApp=latestByKey(input.capacityForecasts??[],item=>item.appId,item=>item.observedAt);
  const vercelByApp=latestByKey(input.vercelUsage??[],item=>item.appId,item=>item.observedAt);
  const requiredPerformance=BUILD_405_APPLICATION_IDS.flatMap(app=>
    BUILD_419_PERFORMANCE_DOMAINS.map(domain=>app+"::"+domain)
  );
  const missingPerformance=requiredPerformance.filter(key=>!performanceBySlot.has(key));
  const invalidPerformance=[...performanceBySlot.entries()]
    .filter(([,item])=>!validateBuild419PerformanceBudget(item,input.nowIso)).map(([key])=>key);
  const missingCapacity=BUILD_405_APPLICATION_IDS.filter(app=>!capacityByApp.has(app));
  const invalidCapacity=BUILD_405_APPLICATION_IDS.filter(app=>{
    const item=capacityByApp.get(app);return Boolean(item&&!validateBuild419CapacityForecast(item,input.nowIso));
  });
  const missingVercelDisposition=BUILD_405_APPLICATION_IDS.filter(app=>!vercelByApp.has(app));
  const invalidVercelDisposition=BUILD_405_APPLICATION_IDS.filter(app=>{
    const item=vercelByApp.get(app);return Boolean(item&&!validateBuild419VercelUsage(item,input.nowIso));
  });
  const performanceStatuses=[...performanceBySlot.values()]
    .filter(item=>validateBuild419PerformanceBudget(item,input.nowIso))
    .map(performanceBudgetStatus419);
  const vercelStatuses=[...vercelByApp.values()]
    .filter(item=>validateBuild419VercelUsage(item,input.nowIso)).map(vercelUsageStatus419);
  const criticalPerformance=performanceStatuses.filter(x=>x==="CRITICAL").length;
  const warningPerformance=performanceStatuses.filter(x=>x==="WARNING").length;
  const criticalVercel=vercelStatuses.filter(x=>x==="CRITICAL").length;
  const warningVercel=vercelStatuses.filter(x=>x==="WARNING").length;

  const governanceState=
    !input.build418SoftwareReleasePresent
      ? ("HOLD_BUILD418_SOFTWARE_RELEASE_REQUIRED" as const)
      : missingPerformance.length
        ? ("HOLD_SHARED_PERFORMANCE_BUDGET_EVIDENCE_REQUIRED" as const)
        : invalidPerformance.length
          ? ("HOLD_SHARED_PERFORMANCE_BUDGET_EVIDENCE_INVALID" as const)
          : missingCapacity.length
            ? ("HOLD_CAPACITY_FORECAST_EVIDENCE_REQUIRED" as const)
            : invalidCapacity.length
              ? ("HOLD_CAPACITY_FORECAST_EVIDENCE_INVALID" as const)
              : missingVercelDisposition.length
                ? ("HOLD_VERCEL_HOSTING_DISPOSITION_REQUIRED" as const)
                : invalidVercelDisposition.length
                  ? ("HOLD_VERCEL_USAGE_EVIDENCE_INVALID" as const)
                  : criticalVercel
                    ? ("VERCEL_USAGE_GUARDRAIL_CRITICAL" as const)
                    : criticalPerformance
                      ? ("SHARED_PERFORMANCE_BUDGET_CRITICAL" as const)
                      : warningVercel||warningPerformance
                        ? ("PERFORMANCE_OR_USAGE_ATTENTION" as const)
                        : ("SHARED_PERFORMANCE_CAPACITY_AND_USAGE_GUARDRAILS_ASSURED" as const);

  return {
    schema:BUILD_419_SCHEMA,build:BUILD_419,governanceState,
    missingPerformance,invalidPerformance,missingCapacity,invalidCapacity,
    missingVercelDisposition,invalidVercelDisposition,
    counts:{
      applications:BUILD_405_APPLICATION_IDS.length,
      requiredPerformanceSlots:requiredPerformance.length,
      admittedPerformanceSlots:performanceBySlot.size,
      capacityForecastReceipts:capacityByApp.size,
      vercelHostingDispositions:vercelByApp.size,
      hostedOnVercel:[...vercelByApp.values()].filter(x=>x.hostedOnVercel).length,
      criticalPerformance,warningPerformance,criticalVercel,warningVercel
    },
    policy:{
      ownerDefinedVercelBudgetsRequired:true,
      inventVercelPlanLimits:false, inventBilling:false,
      exactShaPreviewReuseRequired:true,previewDatabaseMigrationsAllowed:false,
      automaticScalingAuthorized:false,automaticPurchasingAuthorized:false,
      automaticProviderUpgradeAuthorized:false,automaticReleaseBlockingAuthorized:false,
      independentApplicationReleasePreserved:true,productionGreenImpliesBudgetsHealthy:false,
      protocol:"1.1"
    }
  };
}

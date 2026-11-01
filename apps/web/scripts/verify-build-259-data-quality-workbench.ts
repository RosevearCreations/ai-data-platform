import { readFile } from "node:fs/promises";

import {
  DATA_QUALITY_RULES,
  assessDataQuality
} from "../lib/data-quality";
import type { DataReviewRow } from "../lib/data-review-workbench";

function ensure(c:unknown,m:string):asserts c{if(!c)throw new Error(m);}
async function source(r:string){return readFile(new URL(r,import.meta.url),"utf8");}

function row(
  id:string,
  original:Record<string,unknown>,
  cleaned:Record<string,unknown>,
  changedFields=0
):DataReviewRow{
  return {
    id,
    included:true,
    original,
    cleaned,
    changedFields,
    issues:[],
    duplicateOf:null
  };
}

async function main(){
  ensure(
    DATA_QUALITY_RULES.map((rule)=>rule.id).join(",") ===
      "missing-fields,malformed-values,duplicates,inconsistent-formats,stale-records,unexpected-changes,normalization",
    "quality rule registry"
  );

  const rows:DataReviewRow[]=[
    row(
      "row-1",
      {name:"  Alpha  ",email:"bad-email",website:"ftp://example.test",eventDate:"2026-10-01",price:"12.50",phone:"519-555-1212"},
      {name:"Alpha",email:"bad-email",website:"ftp://example.test",eventDate:"2026-10-01",price:"12.50",phone:"519-555-1212"},
      1
    ),
    row(
      "row-2",
      {name:"Beta",email:"beta@example.test",website:"https://example.test",eventDate:"10/02/2026",price:14.5,phone:"5195551213"},
      {name:"Beta",email:"beta@example.test",website:"https://example.test",eventDate:"10/02/2026",price:14.5,phone:"5195551213"}
    ),
    row(
      "row-3",
      {name:"Beta",email:"beta@example.test",website:"https://example.test",eventDate:"10/02/2026",price:14.5,phone:"5195551213"},
      {name:"Beta",email:"beta@example.test",website:"https://example.test",eventDate:"10/02/2026",price:14.5,phone:"5195551213"}
    ),
    row(
      "row-4",
      {name:"",email:"four@example.test",website:"https://example.test",eventDate:"2026-10-04",price:"not-a-price",phone:"123"},
      {name:"",email:"four@example.test",website:"https://example.test",eventDate:"2026-10-04",price:"not-a-price",phone:"123"}
    )
  ];

  const assessment=assessDataQuality({
    rows,
    retrievedAt:"2026-09-01T12:00:00.000Z",
    currentServerVersion:4,
    reviewedServerVersion:3,
    currentFingerprint:"current",
    reviewedFingerprint:"reviewed",
    now:new Date("2026-11-01T12:00:00.000Z")
  });

  ensure(assessment.score<100,"quality score penalty");
  ensure(assessment.metrics.missingValues>=1,"missing values");
  ensure(assessment.metrics.malformedValues>=4,"malformed values");
  ensure(assessment.metrics.duplicateRows===1,"exact duplicate row");
  ensure(assessment.duplicateGroups.length===1,"duplicate group");
  ensure(assessment.metrics.inconsistentFields>=2,"inconsistent keyed formats/types");
  ensure(assessment.metrics.normalizationRows>=1,"normalization finding");
  ensure(assessment.metrics.stale===true,"stale source");
  ensure(assessment.metrics.unexpectedChange===true,"unexpected source change");
  for(const rule of [
    "missing-fields",
    "malformed-values",
    "duplicates",
    "inconsistent-formats",
    "stale-records",
    "unexpected-changes",
    "normalization"
  ]) ensure(assessment.findings.some((finding)=>finding.ruleId===rule),"finding "+rule);

  const healthy=assessDataQuality({
    rows:[
      row("healthy-1",{name:"Alpha",email:"alpha@example.test",website:"https://example.test",eventDate:"2026-10-20",price:12.5},{name:"Alpha",email:"alpha@example.test",website:"https://example.test",eventDate:"2026-10-20",price:12.5})
    ],
    retrievedAt:"2026-10-20T12:00:00.000Z",
    now:new Date("2026-11-01T12:00:00.000Z")
  });
  ensure(healthy.score===100&&healthy.state==="healthy","healthy baseline");

  const [quality,page,reviewPage,approvedPage,shell,nav,help,css,pkg,statusRaw,doc,queue]=await Promise.all([
    source("../lib/data-quality.ts"),
    source("../app/data-quality/page.tsx"),
    source("../app/data-review/page.tsx"),
    source("../app/approved-data/page.tsx"),
    source("../app/application-shell.tsx"),
    source("../lib/application-navigation.ts"),
    source("../app/help/help-content.ts"),
    source("../app/globals.css"),
    source("../package.json"),
    source("../../../docs/integration/ql266-ai-data-platform-build259-review.json"),
    source("../../../docs/BUILD_259_DATA_QUALITY_WORKBENCH.md"),
    source("../../../docs/NEXT_BUILDS_254_272.md")
  ]);

  ensure(quality.includes("listDataReviewWorkbenchForUser"),"reuse Data Review model");
  ensure(quality.includes("withUserDatabase"),"RLS-scoped current dataset reads");
  ensure(quality.includes("workspace_reviewed_datasets"),"current dataset source");
  ensure(!quality.includes("insert into")&&!quality.includes("update app.")&&!quality.includes("delete from"),"quality model read-only");
  ensure(page.includes("Data Quality Workbench"),"quality page");
  ensure(page.includes("Active deterministic rules"),"rule panel");
  ensure(page.includes("Duplicate groups"),"duplicate groups UI");
  ensure(page.includes('destination="/data-quality"'),"Build 257 saved filters");
  ensure(page.includes("does not silently fix")||page.includes("does not silently"),"advisory boundary");
  ensure(reviewPage.includes('href="/data-quality"'),"Data Review quality handoff");
  ensure(approvedPage.includes('href="/data-quality"'),"Approved Data quality handoff");
  ensure(shell.includes("Build 259 · Operations Command"),"Build 259 shell");
  ensure(shell.includes("Build 258 · Operations Command"),"Build 258 compatibility");
  ensure(nav.includes('href: "/data-quality"')&&nav.includes('label: "Data Quality"'),"Data Quality navigation");
  ensure(help.includes('"data-quality-workbench": {')&&help.includes('"data-quality-rules": {'),"Data Quality help");
  ensure(css.includes("Build 259 — Data Quality Workbench, Validation Rules & Duplicate Detection"),"Build 259 styles");
  ensure(pkg.includes("verify-build-259-data-quality-workbench.ts"),"Build 259 verifier registered");

  const status=JSON.parse(statusRaw);
  ensure(status.build===259,"build");
  ensure(status.source_A_sha==="5a1fcd4dd9619f13b6de6ac553f35c652cd5957b","source A");
  ensure(status.source_ci_run==="https://github.com/RosevearCreations/ai-data-platform/actions/runs/41305884116","source CI");
  ensure(status.source_ci_conclusion==="success","source CI conclusion");
  ensure(status.data_quality.dedicated_workbench===true&&status.data_quality.deterministic_score===true,"quality workbench");
  ensure(status.data_quality.second_quality_database===false&&status.data_quality.ai_scoring===false,"deterministic reuse boundary");
  ensure(status.data_quality.duplicate_groups===true&&status.data_quality.existing_review_rows_reused===true,"duplicate/review reuse");
  ensure(status.authorization.existing_user_scoped_reads===true&&status.authorization.rls_preserved===true,"authorization");
  ensure(status.authorization.quality_mutations===false&&status.authorization.auto_approval===false&&status.authorization.source_overwrite===false,"no quality mutation");
  ensure(status.ql266_status==="UNDER_REVIEW"&&status.ql266_active_gate===false,"QL-266 under review");
  ensure(status.external_test_status==="REVIEW_DEFERRED"&&status.connection_state==="DISCONNECTED","QL-266 boundary");
  ensure(status.new_ql266_test_started===false,"no QL-266 restart");
  ensure(status.next_build===260,"next build");

  const lower=doc.toLowerCase();
  for(const token of [
    "validation rules",
    "quality scoring",
    "duplicate detection",
    "pre-approval boundary",
    "existing build 048 compatibility",
    "under_review",
    "disconnected",
    "build 260"
  ]) ensure(lower.includes(token),"doc "+token);

  ensure(queue.includes("Build 259 — Data Quality Workbench, Validation Rules & Duplicate Detection"),"queue Build 259");
  ensure(queue.includes("Build 260 — Provenance & Data Lineage Explorer"),"queue Build 260");

  console.log("Build 259 Data Quality Workbench verification passed; scoring is deterministic/read-only, duplicate evidence remains governed by Data Review, and QL-266 remains under review.");
}
void main();

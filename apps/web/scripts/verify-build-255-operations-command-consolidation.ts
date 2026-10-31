import { readFile } from "node:fs/promises";

function ensure(c:unknown,m:string):asserts c{if(!c)throw new Error(m);}
async function source(r:string){return readFile(new URL(r,import.meta.url),"utf8");}

async function main(){
  const [shell,panels,css,statusPage,home,dataLibrary,connectors,productionLearning,pkg,statusRaw,doc,queue]=await Promise.all([
    source("../app/application-shell.tsx"),
    source("../app/OperationsCommandPanels.tsx"),
    source("../app/globals.css"),
    source("../app/integration-delivery/page.tsx"),
    source("../app/page.tsx"),
    source("../app/data-library/page.tsx"),
    source("../app/connectors/page.tsx"),
    source("../app/production-learning/page.tsx"),
    source("../package.json"),
    source("../../../docs/integration/ql266-ai-data-platform-build255-review.json"),
    source("../../../docs/BUILD_255_OPERATIONS_COMMAND_CONSOLIDATION.md"),
    source("../../../docs/NEXT_BUILDS_254_272.md")
  ]);

  ensure(shell.includes("Build 255 · Operations Command"),"Build 255 shell");
  ensure(shell.includes("Build 254 · Operations Command"),"Build 254 compatibility");
  ensure(panels.includes("export function OperationsAreaBand("),"shared area band");
  ensure(css.includes("Build 255 — Operations Command consolidation and compact diagnostics"),"Build 255 styles");

  const areaFiles=[
    ["Management",home],
    ["Front End",dataLibrary],
    ["I.T.",connectors],
    ["Statistical",productionLearning],
    ["System Status",statusPage]
  ] as const;
  for(const [area,content] of areaFiles){
    ensure(content.includes("<OperationsAreaBand"),area+" shared area band usage");
    ensure(content.includes('area="'+area+'"'),area+" shared area value");
    ensure(!content.includes('<section className="opsScreenBand"'),area+" manual area band removed");
  }

  for(const id of ["build255-detailed-review-tools","build255-secondary-status-tools","build255-raw-acknowledgements"]){
    ensure(statusPage.includes('id="'+id+'"'),"System Status disclosure "+id);
  }
  ensure(statusPage.includes("Detailed review tools")&&statusPage.includes("Secondary status tools")&&statusPage.includes("Raw acknowledgement cards"),"compact disclosure labels");

  const risk=statusPage.indexOf('id="build254-risk-summary"');
  const detail=statusPage.indexOf('id="build255-detailed-review-tools"');
  const table=statusPage.indexOf('id="build250-consumer-table"');
  const secondary=statusPage.indexOf('id="build255-secondary-status-tools"');
  const delivery=statusPage.indexOf("<IntegrationDeliveryPanel");
  const raw=statusPage.indexOf('id="build255-raw-acknowledgements"');
  ensure(risk>=0&&detail>risk&&table>detail&&secondary>table&&delivery>secondary&&raw>delivery,"System Status primary/secondary ordering");

  ensure(statusPage.includes('id="build250-ql266"'),"QL-266 anchor compatibility");
  ensure(statusPage.includes("Delivery risk summary")&&statusPage.includes("Delivery evidence lane"),"Build 254 primary surfaces retained");
  ensure(statusPage.includes("Consumer configuration")&&statusPage.includes("Connection boundary"),"consumer table/inspector retained");
  ensure(pkg.includes("verify-build-255-operations-command-consolidation.ts"),"Build 255 verifier registered");

  const status=JSON.parse(statusRaw);
  ensure(status.build===255,"build");
  ensure(status.source_A_sha==="f70c47082ff7eadca236eb38c28f0cbb847eab79","source A");
  ensure(status.source_ci_run==="https://github.com/RosevearCreations/ai-data-platform/actions/runs/41226109593","source CI");
  ensure(status.source_ci_conclusion==="success","source CI conclusion");
  ensure(status.consolidation_scope.shared_area_band===true,"shared area band status");
  ensure(status.consolidation_scope.system_status_compact_disclosures===true,"compact disclosure status");
  ensure(status.consolidation_scope.primary_risk_and_delivery_controls_visible===true,"primary controls status");
  ensure(status.ql266_status==="UNDER_REVIEW"&&status.ql266_active_gate===false,"QL-266 under review");
  ensure(status.external_test_status==="REVIEW_DEFERRED"&&status.connection_state==="DISCONNECTED","QL-266 boundary");
  ensure(status.new_ql266_test_started===false,"no QL-266 restart");
  ensure(status.next_build===256,"next build");

  const lower=doc.toLowerCase();
  for(const token of ["operations command","shared operations command standard","system status cleanup","compact disclosure","under_review","disconnected","build 256"]) ensure(lower.includes(token),"doc "+token);
  ensure(queue.includes("Build 255 — Operations Command Consolidation, Screen Cleanup & Component Standardization"),"queue Build 255");
  ensure(queue.includes("Build 256 — Unified Cross-Module Search, Results Explorer & Context Navigation"),"queue Build 256");

  console.log("Build 255 Operations Command consolidation, shared area-band standard and compact System Status verification passed; QL-266 remains under review.");
}
void main();

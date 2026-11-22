import assert from "node:assert/strict";import fs from "node:fs";import path from "node:path";
const root=path.resolve(process.cwd());const read=(p:string)=>fs.readFileSync(path.join(root,p),"utf8");
for(const [p,tokens] of Object.entries<Record<string,string[]>>({
 ".github/rosevear-build433-continuous-production-assurance.v1.json":["staleEvidenceFailsClosed","historicalSevenOfSevenSuccessRate","holdToGreenRecoveries"],
 "apps/web/lib/build433-continuous-production-assurance-database.ts":["greenRatePct","consecutiveGreen","recoveries","STALE"],
 "apps/web/app/continuous-production-assurance/page.tsx":["One GREEN deployment is not permanent evidence","Fail closed by design"],
 "apps/web/app/api/continuous-production-assurance/route.ts":["refreshBuild433Dashboard","Cache-Control"],
 "docs/BUILD_433_CONTINUOUS_PRODUCTION_ASSURANCE.md":["last 96 observations","HOLD-to-GREEN","original-host boundary"]
})){const body=read(p);for(const token of tokens)assert.ok(body.includes(token),p+" missing "+token);}
console.log("Build 433 Durable Seven-Source Continuous Production Assurance, Freshness Expiry, Recovery Evidence & Historical Analytics verification passed.");

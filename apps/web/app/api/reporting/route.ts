import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { buildReportingStudio, renderReportingCsv } from "@/lib/reporting-studio";
import type { ReportingKpiKey, ReportingStudioModel } from "@/lib/reporting-studio-contract";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function scoped(model:ReportingStudioModel,input:{workspace:string;preset:string}):ReportingStudioModel{
 const preset=model.presets.find(item=>item.id===input.preset)??model.presets[0];
 const allowed=new Set<ReportingKpiKey>(preset.kpis);
 const workspaces=model.workspaces
  .filter(item=>!input.workspace||item.workspaceId===input.workspace)
  .map(item=>({...item,kpis:item.kpis.filter(kpi=>allowed.has(kpi.key))}));
 return {...model,workspaces};
}

export async function GET(request:Request){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)return Response.json({error:"Unauthorized"},{status:401});
 const url=new URL(request.url);
 const format=url.searchParams.get("format")??"json";
 const model=scoped(await buildReportingStudio(session.user.id),{
  workspace:url.searchParams.get("workspace")??"",
  preset:url.searchParams.get("preset")??"operations"
 });
 if(format==="csv"){
  return new Response(renderReportingCsv(model),{
   status:200,
   headers:{
    "content-type":"text/csv; charset=utf-8",
    "content-disposition":'attachment; filename="ai-data-platform-report.csv"',
    "cache-control":"no-store"
   }
  });
 }
 if(format!=="json")return Response.json({error:"Unsupported report format."},{status:400});
 return new Response(JSON.stringify(model,null,2)+"\n",{
  status:200,
  headers:{
   "content-type":"application/json; charset=utf-8",
   "content-disposition":'attachment; filename="ai-data-platform-report.json"',
   "cache-control":"no-store"
  }
 });
}

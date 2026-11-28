import {headers} from "next/headers";
import {auth} from "@/lib/auth";
import {readBuild457OwnerForecast} from "@/lib/build457-recurrence-database";
export const dynamic="force-dynamic";export const runtime="nodejs";
const h={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
export async function GET(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)return Response.json({error:"authentication_required"},{status:401,headers:h});
 try{return Response.json(await readBuild457OwnerForecast(session.user.id),{headers:h});}
 catch{return Response.json({error:"owner_recurrence_forecast_unavailable"},{status:403,headers:h});}
}

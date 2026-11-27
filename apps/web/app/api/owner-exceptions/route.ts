import {headers} from "next/headers";
import {auth} from "@/lib/auth";
import {readBuild454OwnerExceptions} from "@/lib/build454-autonomous-recovery-database";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const noStore={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
export async function GET(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)return Response.json({error:"authentication_required"},{status:401,headers:noStore});
 try{return Response.json(await readBuild454OwnerExceptions(session.user.id),{headers:noStore});}
 catch{return Response.json({error:"owner_exception_readback_unavailable"},{status:403,headers:noStore});}
}

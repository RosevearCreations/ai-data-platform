import {headers} from "next/headers";
import {auth} from "@/lib/auth";
import {readBuild445OwnerInventory} from "@/lib/build445-recovery-ledger";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)return Response.json({error:"authentication_required"},{status:401,headers:{"Cache-Control":"no-store"}});
 try{return Response.json(await readBuild445OwnerInventory(session.user.id),{headers:{"Cache-Control":"no-store"}});}
 catch(e){return Response.json({error:e instanceof Error&&e.message==="build445_original_owner_role_required"?"owner_role_required":"owner_inventory_unavailable"},{status:403,headers:{"Cache-Control":"no-store"}});}
}

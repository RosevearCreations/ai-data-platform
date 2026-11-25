import {headers} from "next/headers";
import {auth} from "@/lib/auth";
import {authPool,withUserDatabase} from "@/lib/database";
import {reserveBuild446Verification} from "@/lib/build446-mailbox-ledger";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:Request){
 const origin=request.headers.get("origin");
 if(!origin||origin!==new URL(request.url).origin)return Response.json({error:"same_origin_required"},{status:403,headers:{"Cache-Control":"no-store"}});
 const reqHeaders=await headers();
 const session=await auth.api.getSession({headers:reqHeaders});
 if(!session)return Response.json({error:"authentication_required"},{status:401,headers:{"Cache-Control":"no-store"}});
 const role=await withUserDatabase(session.user.id,async client=>(await client.query<{role:string|null}>("select app.current_master_sysop_role() as role")).rows[0]?.role??null);
 if(role!=="owner")return Response.json({error:"owner_required"},{status:403,headers:{"Cache-Control":"no-store"}});
 const row=await authPool.query<{verified:boolean}>('select u."emailVerified" as verified from auth."user" u where u.id=$1',[session.user.id]);
 if(row.rows[0]?.verified)return Response.json({status:"ALREADY_VERIFIED"},{headers:{"Cache-Control":"no-store"}});
 if(!process.env.RESEND_API_KEY||!process.env.AUTH_RECOVERY_FROM_EMAIL)return Response.json({error:"mail_provider_unconfigured"},{status:503,headers:{"Cache-Control":"no-store"}});
 if(!await reserveBuild446Verification(session.user.id))return Response.json({error:"verification_request_rate_limited"},{status:429,headers:{"Cache-Control":"no-store"}});
 try{
  await auth.api.sendVerificationEmail({headers:reqHeaders,body:{email:session.user.email,callbackURL:"/owner-recovery-closure"}});
  return Response.json({status:"VERIFICATION_REQUESTED_DELIVERY_NOT_YET_PROVEN"},{status:202,headers:{"Cache-Control":"no-store"}});
 }catch{
  return Response.json({error:"verification_transport_unavailable"},{status:503,headers:{"Cache-Control":"no-store"}});
 }
}

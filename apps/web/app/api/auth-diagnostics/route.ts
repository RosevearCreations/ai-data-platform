import {build443Diagnostics,build443TrustedOrigins} from "@/lib/build443-owner-auth-diagnostics";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const origins=build443TrustedOrigins(process.env.BETTER_AUTH_URL??"https://ai-data-platform-johns-projects-8f256ece.vercel.app",process.env.BETTER_AUTH_TRUSTED_ORIGINS??"");
 const info=build443Diagnostics(request.headers.get("origin"),origins,Boolean(process.env.RESEND_API_KEY),Boolean(process.env.AUTH_RECOVERY_FROM_EMAIL),Boolean(process.env.BUILD442_INDEPENDENT_WITNESS_PUBLIC_KEYS_JSON),Boolean(process.env.BUILD443_INDEPENDENT_WITNESS_BINDINGS_JSON));
 return Response.json(info,{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}

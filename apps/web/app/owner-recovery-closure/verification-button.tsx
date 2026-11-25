"use client";
import {useState} from "react";
export function VerifyMailboxButton(){
 const [state,setState]=useState<string|null>(null);
 const [pending,setPending]=useState(false);
 async function send(){
  setPending(true);setState(null);
  try{
   const r=await fetch("/api/owner-mailbox-verification/request",{method:"POST",headers:{"Content-Type":"application/json"}});
   const result=await r.json() as {status?:string;error?:string};
   setState(r.ok?"Verification email requested. Check the original account mailbox. Delivery still needs independent confirmation.":result.error==="verification_request_rate_limited"?"A request has already been made within 30 minutes. Check the mailbox.":"Unable to request verification. Check our sender configuration.");
  }catch{setState("Request failed. Please retry after checking the connection.");}
  finally{setPending(false);}
 }
 return <div><button className="primary" type="button" onClick={send} disabled={pending}>{pending?"Requesting…":"Send original-mailbox verification link"}</button>{state?<p role="status">{state}</p>:null}</div>;
}

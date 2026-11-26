"use client";
import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
export function Build450AutoValidate(){
 const fired=useRef(false),router=useRouter();
 const [status,setStatus]=useState("Checking the seven source endpoints automatically...");
 useEffect(()=>{
  if(fired.current)return;
  fired.current=true;
  let cancelled=false;
  async function run(){
   try{
    const r=await fetch("/api/owner-connection-validation",{
      method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},cache:"no-store"
    });
    const result=await r.json() as {state?:string;error?:string};
    if(cancelled)return;
    if(r.ok){setStatus("Signed source challenge check completed. Reviewing latest real receipts.");router.refresh();}
    else setStatus(result.error==="original_owner_recovery_required"?"Original owner session is required.":"Source check not completed; the dashboard retains the last verified evidence and does not invent results.");
   }catch{if(!cancelled)setStatus("Source check temporarily unavailable. Existing verified history remains displayed.");}
  }
  void run();
  return()=>{cancelled=true;};
 },[router]);
 return <p role="status" className="b449-muted">{status} No manual JSON, screenshots or key entry is required.</p>;
}

"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
export function OriginalEvidenceAutoRefresh(){
 const router=useRouter();
 const [lastChecked,setLastChecked]=useState<string|null>(null);
 useEffect(()=>{
  const refresh=()=>{if(document.visibilityState==="visible"){router.refresh();setLastChecked(new Date().toLocaleTimeString());}};
  const id=window.setInterval(refresh,60000);
  const visible=()=>{if(document.visibilityState==="visible")refresh();};
  document.addEventListener("visibilitychange",visible);
  return()=>{window.clearInterval(id);document.removeEventListener("visibilitychange",visible);};
 },[router]);
 return <p className="b449-muted" aria-live="polite">System evidence refreshes automatically every minute while this page is open.{lastChecked?" Last checked "+lastChecked+"." : ""} No form or JSON entry is required.</p>;
}

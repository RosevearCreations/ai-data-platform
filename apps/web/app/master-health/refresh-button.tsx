"use client";
import {useRouter} from "next/navigation";
import {useState} from "react";
export function Build427RefreshButton(){const router=useRouter();const [state,setState]=useState<"idle"|"running"|"ok"|"error">("idle");async function refresh(){setState("running");try{const r=await fetch("/api/master-health",{method:"POST",headers:{Accept:"application/json"}});if(!r.ok)throw new Error();setState("ok");router.refresh();}catch{setState("error");}}return <button className="primaryButton" type="button" onClick={refresh} disabled={state==="running"}>{state==="running"?"Sweeping seven sources…":state==="error"?"Sweep failed — retry":"Sweep seven sources"}</button>;}

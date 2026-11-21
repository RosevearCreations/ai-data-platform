"use client";
import {useRouter} from "next/navigation";
import {useState} from "react";
export function Build431RefreshButton(){const router=useRouter();const [state,setState]=useState<"idle"|"running"|"ok"|"error">("idle");async function refresh(){setState("running");try{const r=await fetch("/api/genuine-signer-expansion",{method:"POST",headers:{Accept:"application/json"}});if(!r.ok)throw new Error();setState("ok");router.refresh();}catch{setState("error");}}return <button className="primaryButton" type="button" onClick={refresh} disabled={state==="running"}>{state==="running"?"Checking seven sources…":state==="error"?"Sweep failed — retry":"Run seven-source signed sweep"}</button>;}

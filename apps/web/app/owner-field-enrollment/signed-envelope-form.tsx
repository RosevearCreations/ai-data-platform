"use client";
import {useState,type FormEvent} from "react";
export function SignedEnvelopeForm(){
 const [body,setBody]=useState("");
 const [state,setState]=useState("");
 const [pending,setPending]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setState("");
  if(body.length>11000||body.includes("PRIVATE KEY")||body.includes("BEGIN OPENSSH")){
   setState("Only a signed witness envelope is accepted. Never paste or upload any private key.");return;
  }
  let json:unknown;try{json=JSON.parse(body);}catch{setState("The signed envelope is not valid JSON.");return;}
  if(!json||typeof json!=="object"||Array.isArray(json)||
   (json as {schema?:unknown}).schema!=="rosevear.ai-data-platform.build442-original-device-witness.v1"){
   setState("This is not a Build 442 original-device witness envelope.");return;
  }
  setPending(true);
  try{
   const result=await fetch("/api/witness-intake",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(json)});
   const data=await result.json() as {accepted?:boolean;error?:string};
   setState(data.accepted?"Genuine signed envelope accepted. Refresh the dashboard to review its freshness and source certification.":
    data.error==="trusted_witness_enrollment_not_configured"?"The verified independent public key and app/device binding are not configured in production yet.":
    "Envelope was not accepted. Check original-device signature, freshness, app revision, independent key enrollment and replay custody.");
   if(result.ok)setBody("");
  }catch{setState("The witness endpoint could not be reached.");}
  finally{setPending(false);}
 }
 return <form className="authForm" onSubmit={submit}>
  <label htmlFor="b448envelope">Original-device-signed witness envelope (JSON, public fields and signature only)</label>
  <textarea id="b448envelope" rows={8} value={body} onChange={e=>setBody(e.target.value)}
   placeholder='{"schema":"rosevear.ai-data-platform.build442-original-device-witness.v1", "...":"..."}' required/>
  <button className="primary" disabled={pending||!body.trim()} type="submit">{pending?"Verifying…":"Verify and submit signed envelope"}</button>
  {state?<p role="status">{state}</p>:null}
 </form>;
}

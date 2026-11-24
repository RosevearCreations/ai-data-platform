"use client";
import {useState,type FormEvent} from "react";
import {useSearchParams} from "next/navigation";
import Link from "next/link";
import {authClient} from "@/lib/auth-client";
export default function ResetPassword(){
 const params=useSearchParams();const token=params.get("token");
 const [message,setMessage]=useState("");const [pending,setPending]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!token)return;
  const form=new FormData(e.currentTarget);const password=String(form.get("password")??"");
  setPending(true);setMessage("");
  try{const result=await authClient.resetPassword({token,newPassword:password});
   setMessage(result.error?"Reset link was invalid or expired. Request a new link.":"Password updated. Return to sign in.");
  }catch{setMessage("Password reset failed. Request a new link.");}
  finally{setPending(false);}
 }
 return <main className="shell authShell"><section className="authIntro"><p className="eyebrow">AI Data Platform</p><h1>Reset account password</h1><Link href="/sign-in">Return to sign in</Link></section><div className="authCard">{token?<form className="authForm" onSubmit={submit}><label>New password<input name="password" type="password" autoComplete="new-password" minLength={12} required/></label><button className="primary authSubmit" disabled={pending} type="submit">Set new password</button>{message?<p role="status">{message}</p>:null}</form>:<p>This link is missing its reset token. <Link href="/forgot-password">Request a new link</Link>.</p>}</div></main>;
}

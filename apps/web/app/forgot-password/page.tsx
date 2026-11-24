"use client";
import {useState,type FormEvent} from "react";
import Link from "next/link";
import {authClient} from "@/lib/auth-client";
export default function ForgotPassword(){
 const [message,setMessage]=useState("");const [pending,setPending]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setPending(true);setMessage("");
  const form=new FormData(e.currentTarget);
  try{
   await authClient.requestPasswordReset({email:String(form.get("email")??"").trim(),redirectTo:"/reset-password"});
   setMessage("If this email belongs to an account and recovery mail is configured, a reset link will arrive. Check junk mail too.");
  }catch{setMessage("Recovery could not be requested. Contact the platform owner to configure recovery mail.");}
  finally{setPending(false);}
 }
 return <main className="shell authShell"><section className="authIntro"><p className="eyebrow">AI Data Platform</p><h1>Account recovery</h1><p className="lead">The current sign-in uses the email address registered with the account, not a username. No account exists merely because a display name was entered.</p><Link href="/sign-in">Back to sign in</Link></section><div className="authCard"><form className="authForm" onSubmit={submit}><label>Account email<input name="email" type="email" autoComplete="email" required /></label><button className="primary authSubmit" type="submit" disabled={pending}>Request password reset</button>{message?<p role="status">{message}</p>:null}</form></div></main>;
}

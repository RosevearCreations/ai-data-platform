import Link from "next/link";

import { AuthForm } from "./auth-form";
import { HelpInfo } from "../help/HelpInfo";

function safeCallbackUrl(value: string | undefined) {
  if (!value) return "/";

  try {
    const base = new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000");
    const target = new URL(value, base);

    if (target.origin !== base.origin) {
      return "/";
    }

    return target.pathname + target.search + target.hash;
  } catch {
    return "/";
  }
}

export default async function SignInPage({
  searchParams
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const allowSignUp = process.env.AUTH_ALLOW_SIGN_UP === "true";
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);

  return (
    <main className="shell authShell">
      <section className="authIntro">
        <HelpInfo topic="sign-in" />
        <p className="eyebrow">AI Data Platform</p>
        <h1>Secure workspace access</h1>
        <p className="lead">
          Sign in to access approved Rosie Dazzlers, Devil n Dove and Personal
          datasets.
        </p>
        <Link className="textLink" href="/">
          Return to platform overview
        </Link>
      </section>

      <AuthForm allowSignUp={allowSignUp} callbackUrl={callbackUrl} />
    </main>
  );
}

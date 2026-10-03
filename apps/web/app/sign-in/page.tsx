import Link from "next/link";

import { AuthForm } from "./auth-form";

export default function SignInPage() {
  const allowSignUp = process.env.AUTH_ALLOW_SIGN_UP === "true";

  return (
    <main className="shell authShell">
      <section className="authIntro">
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

      <AuthForm allowSignUp={allowSignUp} />
    </main>
  );
}

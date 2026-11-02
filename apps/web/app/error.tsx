"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application route error", error);
  }, [error]);

  return (
    <main className="shell operationalStateShell" role="alert">
      <section className="operationalStateCard">
        <p className="eyebrow">Recovery</p>
        <h1>This screen could not be completed</h1>
        <p>
          The current route hit an unexpected error. Retrying reloads the same governed screen;
          it does not bypass sign-in, workspace permissions or safety gates.
        </p>
        {error.digest ? <p className="operationalStateDigest">Reference: {error.digest}</p> : null}
        <div className="heroActions">
          <button className="primary" type="button" onClick={() => reset()}>Retry</button>
          <Link className="secondaryButton" href="/">Return to Command Center</Link>
        </div>
      </section>
    </main>
  );
}

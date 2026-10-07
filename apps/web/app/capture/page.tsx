import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { listWorkspacesForUser } from "@/lib/database";

import { BarcodeCaptureClient } from "./barcode-capture-client";

export const dynamic = "force-dynamic";

export default async function CapturePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <p className="eyebrow">Build 024</p>
          <h1>Mobile barcode intake</h1>
          <p className="lead">
            Sign in to scan or type UPC/EAN/GTIN identifiers into an authorized
            Personal or Devil n Dove workspace.
          </p>
          <Link className="primaryLink" href="/sign-in?callbackUrl=/capture">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const workspaces = await listWorkspacesForUser(session.user.id);
  const targets: Array<{
    target: "personal-movie" | "devil-supplier";
    workspaceId: string;
    workspaceName: string;
    label: string;
  }> = [];

  for (const workspace of workspaces) {
    if (workspace.slug === "personal" && workspace.type === "personal") {
      targets.push({
        target: "personal-movie",
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        label: "Personal movie library"
      });
    } else if (
      workspace.slug === "devilndove" &&
      workspace.type === "business"
    ) {
      targets.push({
        target: "devil-supplier",
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        label: "Devil n Dove supplier / inventory"
      });
    }
  }

  return (
    <main className="shell captureShell">
      <section className="hero captureHero">
        <p className="eyebrow">Build 024</p>
        <h1>Mobile barcode intake</h1>
        <p className="lead">
          Scan or type a barcode, review the exact/unmatched suggestion, and
          explicitly approve the handoff. Camera access starts only when you ask
          for it and location is never requested.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">
            Back to platform
          </Link>
          <Link className="secondaryButton" href="/intelligence">
            Review intelligence
          </Link>
        </div>
      </section>

      <BarcodeCaptureClient targets={targets} />
    </main>
  );
}

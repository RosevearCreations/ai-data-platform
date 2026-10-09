import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { listWorkspacesForUser } from "@/lib/database";
import { listWorkspaceProfilesForUser } from "@/lib/workspace-profile-database";
import { WorkspaceProfileManager } from "./WorkspaceProfileManager";
import { HelpInfo } from "../help/HelpInfo";

export const dynamic = "force-dynamic";

export default async function WorkspaceProfilesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return <main className="shell"><section className="hero">
      <HelpInfo topic="profiles-overview" />
      <p className="eyebrow">Build 028</p><h1>Workspace profiles</h1>
      <p className="lead">Sign in to manage domain profiles and workspaces.</p>
      <Link className="primaryLink" href="/sign-in?callbackUrl=/workspace-profiles">Sign in</Link>
    </section></main>;
  }

  const [profiles,workspaces]=await Promise.all([
    listWorkspaceProfilesForUser(session.user.id,{includeArchived:true}),
    listWorkspacesForUser(session.user.id)
  ]);

  return <main className="shell">
    <section className="hero">
      <HelpInfo topic="profiles-overview" />
      <p className="eyebrow">Build 028</p>
      <h1>Configurable workspace profiles</h1>
      <p className="lead">
        Reuse normalization, review, provenance, history, templates and
        capability policy across domains without changing extractor core code.
      </p>
      <div className="heroActions"><Link className="secondaryButton" href="/">Back to platform</Link></div>
    </section>
    <WorkspaceProfileManager
      profiles={profiles.map((profile)=>({
        profileKey:profile.profileKey,name:profile.name,
        description:profile.description,workspaceType:profile.workspaceType,
        normalizationFields:profile.normalizationFields,
        reviewDimensions:profile.reviewDimensions,
        capabilities:profile.capabilities,isBuiltin:profile.isBuiltin,
        archivedAt:profile.archivedAt?.toISOString() ?? null
      }))}
      workspaces={workspaces.map((workspace)=>({
        id:workspace.id,name:workspace.name,purpose:workspace.purpose,
        profileKey:workspace.profileKey,profileName:workspace.profileName,
        role:workspace.role
      }))}
    />
  </main>;
}

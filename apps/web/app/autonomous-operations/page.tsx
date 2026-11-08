import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { listAutonomousOperationsForUser } from "@/lib/autonomous-operations-database";
import { listModuleSupervisorPoliciesForUser } from "@/lib/module-supervisor-host-policy-database";

import { HelpInfo } from "../help/HelpInfo";
import { AutonomousOperationsConsole } from "./AutonomousOperationsConsole";
import { ModuleSupervisorPolicyConsole } from "./ModuleSupervisorPolicyConsole";

export const dynamic = "force-dynamic";

export default async function AutonomousOperationsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <HelpInfo topic="learning-overview" />
          <p className="eyebrow">Build 305</p>
          <h1>Autonomous Operations V1 &amp; Production Learning VI</h1>
          <p className="lead">
            Sign in to review owner controls, bounded autonomous monitoring,
            safe recovery and the evidence-driven roadmap renewal checkpoint.
          </p>
          <Link
            className="primaryLink"
            href="/sign-in?callbackUrl=/autonomous-operations"
          >
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  const [model, hostPolicies] = await Promise.all([
    listAutonomousOperationsForUser(session.user.id),
    listModuleSupervisorPoliciesForUser(session.user.id)
  ]);

  return (
    <main className="shell opsCommandScreen opsCommandScreen--it">
      <section className="hero">
        <HelpInfo topic="learning-overview" />
        <p className="eyebrow">
          Build 305 · controlled autonomy · owner authority
        </p>
        <h1>Autonomous Operations V1 &amp; Production Learning VI</h1>
        <p className="lead">
          Run evidence refresh, recovery-plan discovery and only the existing
          bounded connector-health GET/HEAD recovery lane under an explicit
          owner policy and kill switch. Consequential changes stay outside the
          autonomous boundary.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/integration-certification">
            Integration Certification
          </Link>
          <Link className="secondaryButton" href="/integration-recovery">
            Integration Recovery
          </Link>
          <Link className="secondaryButton" href="/integration-health">
            Integration Health
          </Link>
          <Link className="secondaryButton" href="/production-learning">
            Production Learning
          </Link>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 325 Autonomous Module Supervisor</strong>
        <p>
          The reusable per-host supervisor can monitor module health, refresh
          certification through a validated adapter, detect stale mappings,
          credential references and configuration, supervise only explicitly
          granted connector-health GET/HEAD recovery, and create non-authorizing
          owner-review work items. Consequential peer mutations remain outside
          the supervisor boundary.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/api/module-supervisor">
            View module supervisor contract
          </Link>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Owner enablement is required.</strong>
        <p>
          Build 305 deploys disabled with the kill switch engaged. An
          autonomous cycle must be explicitly enabled by an owner/admin and is
          rate-limited. Deployment success is not connection authorization and
          does not resume QL-266.
        </p>
      </section>

      <ModuleSupervisorPolicyConsole model={hostPolicies} />

      <AutonomousOperationsConsole
        model={{
          canManage: model.canManage,
          policy: model.policy,
          cycles: model.cycles,
          learning: model.learning
        }}
      />
    </main>
  );
}

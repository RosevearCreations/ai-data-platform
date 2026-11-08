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
          <p className="eyebrow">Build 330</p>
          <h1>Autonomous Operations V2 &amp; Production Learning VII</h1>
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
          Build 330 · Autonomous Operations V2 · measured module evidence
        </p>
        <h1>Autonomous Operations V2 &amp; Production Learning VII</h1>
        <p className="lead">
          Preserve the existing bounded connector-health GET/HEAD recovery lane
          while reconciling installed-host, certification, lifecycle, recovery
          and policy outcomes. Build 330 does not widen automatic authority;
          consequential changes stay outside the autonomous boundary.
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
          <Link className="secondaryButton" href="/production-learning-vii">
            Production Learning VII
          </Link>
          <Link className="secondaryButton" href="/production-learning">
            Historical Production Learning
          </Link>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Build 330 Autonomous Operations V2 boundary</strong>
        <p>
          Build 330 keeps the Build 305/325 automatic action envelope unchanged:
          only bounded connector-health GET/HEAD recovery may execute under
          existing owner policy, exact host policy, safe-health grant, budget
          and kill-switch controls. Production Learning VII may recommend work,
          but recommendations do not execute work or create numbered builds.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/production-learning-vii">
            Open Build 330 closeout
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

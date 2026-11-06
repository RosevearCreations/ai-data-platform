import { headers } from "next/headers";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { listWorkflowAutomationForUser } from "@/lib/workflow-automation-database";

import { HelpInfo } from "../help/HelpInfo";
import { WorkflowAutomationBuilder } from "./WorkflowAutomationBuilder";

export const dynamic="force-dynamic";

export default async function WorkflowAutomationPage(){
  const session=await auth.api.getSession({headers:await headers()});

  if(!session){
    return <main className="shell">
      <section className="hero">
        <HelpInfo topic="integration-delivery"/>
        <p className="eyebrow">Build 302</p>
        <h1>Cross-App Workflow Automation Builder</h1>
        <p className="lead">
          Sign in to author reviewed event-to-action rules and inspect held cross-app action intents.
        </p>
        <Link className="primaryLink" href="/sign-in?callbackUrl=/workflow-automation">Sign in</Link>
      </section>
    </main>;
  }

  const model=await listWorkflowAutomationForUser(session.user.id);

  return <main className="shell opsCommandScreen opsCommandScreen--it">
    <section className="hero">
      <HelpInfo topic="integration-delivery"/>
      <p className="eyebrow">Build 302 · reviewed event-to-action automation</p>
      <h1>Cross-App Workflow Automation Builder</h1>
      <p className="lead">
        Connect approved event-bus publications to governed cross-app action workbenches
        using reviewed immutable rules. Matches create held action intents only; destination
        modules keep their existing authorization, confirmation and evidence gates.
      </p>
      <div className="heroActions">
        <Link className="secondaryButton" href="/event-bus">Cross-App Event Bus</Link>
        <Link className="secondaryButton" href="/runbooks">Guided Runbooks</Link>
        <Link className="secondaryButton" href="/integration-health">Integration Health</Link>
        <Link className="secondaryButton" href="/integration-recovery">Integration Recovery</Link>
      </div>
    </section>

    <section className="dataQualityPolicyNote">
      <strong>Build 302 execution boundary</strong>
      <p>
        Rules do not call destination APIs. An approved rule may automatically create
        a durable held action intent only for publications created after that approval.
        Event replay, notifications, tasks, schedules, credentials, connections, exports,
        writes and trust changes continue through their existing governed workbenches.
      </p>
    </section>

    <WorkflowAutomationBuilder model={{
      workspaces:model.workspaces.map(item=>({
        id:item.id,
        name:item.name,
        role:item.role
      })),
      applications:model.applications,
      actionKinds:[...model.actionKinds],
      rules:model.rules.map(item=>({
        ...item,
        createdAt:item.createdAt.toISOString(),
        latestReview:item.latestReview?{
          ...item.latestReview,
          reviewedAt:item.latestReview.reviewedAt.toISOString()
        }:null
      })),
      intents:model.intents.map(item=>({
        ...item,
        createdAt:item.createdAt.toISOString()
      })),
      summary:model.summary,
      policy:model.policy
    }}/>
  </main>;
}

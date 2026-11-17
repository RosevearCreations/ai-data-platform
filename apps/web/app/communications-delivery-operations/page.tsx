import {headers} from "next/headers";
import Link from "next/link";
import {redirect} from "next/navigation";
import {auth} from "@/lib/auth";
import {readBuild417CommunicationsOperations} from "@/lib/build417-communications-database";

export const dynamic="force-dynamic";

function pretty(value:string){return value.replaceAll("_"," ");}
function seconds(value:number|null){return value===null?"UNKNOWN":value+"s";}

export default async function CommunicationsDeliveryOperationsPage(){
  const session=await auth.api.getSession({headers:await headers()});
  if(!session)redirect("/sign-in?callbackUrl=%2Fcommunications-delivery-operations");
  const model=await readBuild417CommunicationsOperations(session.user.id,new Date().toISOString());

  return <main className="shell reviewShell masterInstrumentShell opsCommandScreen opsCommandScreen--status">
    <section className="hero reviewHero">
      <p className="eyebrow">Build 417 · Communications Operations</p>
      <h1>Delivery SLA, ACK Latency, Replay Quality & Dead-Letter Recovery</h1>
      <p className="lead">
        Rosevear Comms Hub remains message authority. This dashboard measures only independently
        admitted delivery evidence; missing receipts remain HOLD and never become synthetic zero-latency success.
      </p>
      <div className="heroActions">
        <Link className="secondaryButton" href="/event-recovery">Dead-Letter Console</Link>
        <Link className="secondaryButton" href="/delivery-guarantees">Delivery Guarantees</Link>
        <Link className="secondaryButton" href="/comms-complementary-plane">Comms Plane</Link>
        <Link className="secondaryButton" href="/master-suite">Server Shell</Link>
      </div>
    </section>

    <section className="dataQualityPolicyNote">
      <strong>{pretty(model.governanceState)}</strong>
      <p>
        Target ACK ≤ {model.policy.ackSlaSeconds}s · queue-to-delivery ≤ {model.policy.queueToDeliverySlaSeconds}s ·
        dead-letter recovery ≤ {model.policy.deadLetterRecoveryHours}h · at most {model.policy.maxReplayAttempts} replay attempts.
      </p>
    </section>

    <section className="reviewSummary">
      <div className="commandMetrics">
        <article><strong>{model.counts.relationshipReceipts}/{model.counts.relationships}</strong><span>relationship receipts</span></article>
        <article><strong>{seconds(model.metrics.averageAckLatencySeconds)}</strong><span>average ACK latency</span></article>
        <article><strong>{model.counts.duplicateSuppressions}</strong><span>duplicates suppressed</span></article>
        <article><strong>{model.counts.deadLetters}</strong><span>dead letters observed</span></article>
      </div>
    </section>

    <section className="reviewQueue">
      <div className="sectionHeading"><div>
        <p className="eyebrow">Relationship performance</p>
        <h2>Fourteen canonical communication relationships</h2>
      </div></div>
      <div className="masterGovernanceGrid masterGovernanceGrid--wide">
        {model.relationships.length?model.relationships.map(item=>
          <article className="reviewBatchSummary" key={item.relationship}>
            <h3>{item.relationship.replace("::"," ↔ ")}</h3>
            <p><strong>{item.state}</strong></p>
            <p>Queue → delivery: {seconds(item.queueToDeliverySeconds)}</p>
            <p>Delivery → ACK: {seconds(item.ackLatencySeconds)}</p>
            <p>Replay: {item.replayAttemptCount} · {item.replayOutcome}</p>
            <p>Duplicates: {item.duplicateCount}</p>
          </article>
        ):<article className="reviewBatchSummary">
          <h3>No admitted delivery receipts</h3>
          <p>All 14 relationships remain HOLD until genuine independently verified delivery evidence is admitted.</p>
        </article>}
      </div>
    </section>

    <section className="reviewQueue">
      <div className="sectionHeading"><div>
        <p className="eyebrow">Operations quality</p>
        <h2>Replay and dead-letter controls</h2>
      </div></div>
      <div className="masterGovernanceGrid">
        <article className="reviewBatchSummary">
          <h3>ACK SLA breaches</h3>
          <p>{model.ackSlaBreaches.length}</p>
        </article>
        <article className="reviewBatchSummary">
          <h3>Delivery SLA breaches</h3>
          <p>{model.deliverySlaBreaches.length}</p>
        </article>
        <article className="reviewBatchSummary">
          <h3>Unresolved dead letters</h3>
          <p>{model.unresolvedDeadLetters.length}</p>
        </article>
        <article className="reviewBatchSummary">
          <h3>Recovered dead letters</h3>
          <p>{model.counts.recoveredDeadLetters}</p>
        </article>
      </div>
    </section>

    <section className="dataQualityPolicyNote">
      <strong>Fail-closed communication evidence</strong>
      <p>
        Build 417 does not auto-replay, send a message, activate a receiver, or treat Git/Vercel GREEN as proof
        of external delivery. Direct peer database writes remain forbidden.
      </p>
    </section>
  </main>;
}

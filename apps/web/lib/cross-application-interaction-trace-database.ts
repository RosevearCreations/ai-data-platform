import {
  composeCrossApplicationInteractionTrace,
  type InteractionTraceEvent
} from "./cross-application-interaction-trace";
import {
  listMasterShellSourceIngestionForUser
} from "./master-shell-source-ingestion-database";

export async function listCrossApplicationInteractionTraceForUser(
  userId: string,
  now = new Date()
) {
  const ingestion = await listMasterShellSourceIngestionForUser(userId);
  const events: InteractionTraceEvent[] = ingestion.ingestions.map((item) => ({
    sourceId: item.sourceId,
    masterEventId: item.masterEventId,
    eventType: item.eventType,
    sourceRevision: item.sourceRevision,
    sourceSequence: item.sourceSequence,
    sequenceState: item.sequenceState,
    correlationId: item.correlationId,
    causationId: item.causationId,
    evidenceURI: item.evidenceURI,
    verificationState: item.verificationState,
    freshness: item.freshness,
    occurredAt: item.occurredAt,
    publishedAt: item.publishedAt,
    receivedAt: item.receivedAt
  }));

  return {
    ...composeCrossApplicationInteractionTrace({
      ingestions: events,
      generatedAt: now
    }),
    sourceIngestion: {
      schema: ingestion.schema,
      build: ingestion.build,
      generatedAt: ingestion.generatedAt,
      pendingReceiptCount: ingestion.summary.pending
    }
  };
}

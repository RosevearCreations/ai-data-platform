import {
  MASTER_SHELL_SOURCE_IDS,
  type MasterShellSourceId
} from "./master-shell-contract-v1";

export const CROSS_APPLICATION_INTERACTION_TRACE_BUILD = 343 as const;

export type InteractionTraceEvent = {
  sourceId: MasterShellSourceId;
  masterEventId: string;
  eventType: string;
  sourceRevision: string;
  sourceSequence: number;
  sequenceState: "first" | "in-order" | "out-of-order";
  correlationId: string;
  causationId: string | null;
  evidenceURI: string;
  verificationState: string;
  freshness: "fresh" | "stale";
  occurredAt: string;
  publishedAt: string;
  receivedAt: string;
};

export type TraceDependencyEdge = {
  fromSourceId: MasterShellSourceId;
  toSourceId: MasterShellSourceId;
  correlationId: string;
  relationship: "CORRELATED_FLOW";
  direction: "UNDIRECTED";
  evidenceEventIds: string[];
};

export type FailurePropagationCandidate = {
  correlationId: string;
  candidateUpstreamSourceId: MasterShellSourceId | null;
  impactedSourceIds: MasterShellSourceId[];
  state: "OBSERVED_ADVERSE_EVIDENCE" | "NO_ADVERSE_EVIDENCE";
  confidence: "EVIDENCE_LINKED" | "INSUFFICIENT_EVIDENCE";
  inferenceOnly: true;
  reason: string;
  evidenceEventIds: string[];
};

function eventTime(value: InteractionTraceEvent) {
  return Date.parse(value.occurredAt);
}

function uniqueSources(events: InteractionTraceEvent[]) {
  return [...new Set(events.map((event) => event.sourceId))] as MasterShellSourceId[];
}

function isAdverse(event: InteractionTraceEvent) {
  return (
    event.freshness === "stale" ||
    event.sequenceState === "out-of-order" ||
    event.verificationState !== "independently-verified"
  );
}

export function composeCrossApplicationInteractionTrace(input: {
  ingestions: InteractionTraceEvent[];
  generatedAt?: Date;
}) {
  const generatedAt = input.generatedAt ?? new Date();
  const accepted = input.ingestions
    .filter((event) => MASTER_SHELL_SOURCE_IDS.includes(event.sourceId))
    .slice(0, 200);

  const groupsByCorrelation = new Map<string, InteractionTraceEvent[]>();
  for (const event of accepted) {
    const current = groupsByCorrelation.get(event.correlationId) ?? [];
    current.push(event);
    groupsByCorrelation.set(event.correlationId, current);
  }

  const correlationGroups = [...groupsByCorrelation.entries()]
    .map(([correlationId, events]) => {
      const ordered = [...events].sort((a, b) => eventTime(a) - eventTime(b));
      const sourceIds = uniqueSources(ordered);
      return {
        correlationId,
        sourceIds,
        crossApplication: sourceIds.length > 1,
        eventCount: ordered.length,
        firstOccurredAt: ordered[0]?.occurredAt ?? null,
        lastOccurredAt: ordered.at(-1)?.occurredAt ?? null,
        events: ordered.map((event) => ({
          sourceId: event.sourceId,
          masterEventId: event.masterEventId,
          eventType: event.eventType,
          sourceRevision: event.sourceRevision,
          sourceSequence: event.sourceSequence,
          sequenceState: event.sequenceState,
          causationId: event.causationId,
          evidenceURI: event.evidenceURI,
          verificationState: event.verificationState,
          freshness: event.freshness,
          occurredAt: event.occurredAt
        }))
      };
    })
    .sort((a, b) =>
      String(b.lastOccurredAt).localeCompare(String(a.lastOccurredAt))
    );

  const dependencyEdges: TraceDependencyEdge[] = [];
  for (const group of correlationGroups.filter((item) => item.crossApplication)) {
    for (let left = 0; left < group.sourceIds.length; left += 1) {
      for (let right = left + 1; right < group.sourceIds.length; right += 1) {
        const fromSourceId = group.sourceIds[left]!;
        const toSourceId = group.sourceIds[right]!;
        dependencyEdges.push({
          fromSourceId,
          toSourceId,
          correlationId: group.correlationId,
          relationship: "CORRELATED_FLOW",
          direction: "UNDIRECTED",
          evidenceEventIds: group.events
            .filter(
              (event) =>
                event.sourceId === fromSourceId || event.sourceId === toSourceId
            )
            .map((event) => event.masterEventId)
        });
      }
    }
  }

  const failurePropagation: FailurePropagationCandidate[] = correlationGroups
    .filter((group) => group.crossApplication)
    .map((group) => {
      const adverse = group.events.filter(
        (event) =>
          event.freshness === "stale" ||
          event.sequenceState === "out-of-order" ||
          event.verificationState !== "independently-verified"
      );
      const firstAdverse = adverse[0] ?? null;
      return {
        correlationId: group.correlationId,
        candidateUpstreamSourceId: firstAdverse?.sourceId ?? null,
        impactedSourceIds: group.sourceIds.filter(
          (sourceId) => sourceId !== firstAdverse?.sourceId
        ),
        state: adverse.length
          ? ("OBSERVED_ADVERSE_EVIDENCE" as const)
          : ("NO_ADVERSE_EVIDENCE" as const),
        confidence: adverse.length
          ? ("EVIDENCE_LINKED" as const)
          : ("INSUFFICIENT_EVIDENCE" as const),
        inferenceOnly: true as const,
        reason: adverse.length
          ? "Earliest adverse event in this correlation group is a review candidate only; correlation does not prove causation."
          : "No stale, out-of-order or unverified event establishes a failure origin in this correlation group.",
        evidenceEventIds: adverse.map((event) => event.masterEventId)
      };
    });

  const sourceNodes = MASTER_SHELL_SOURCE_IDS.map((sourceId) => {
    const sourceEvents = accepted.filter((event) => event.sourceId === sourceId);
    const correlatedWith = new Set<MasterShellSourceId>();
    for (const edge of dependencyEdges) {
      if (edge.fromSourceId === sourceId) correlatedWith.add(edge.toSourceId);
      if (edge.toSourceId === sourceId) correlatedWith.add(edge.fromSourceId);
    }
    return {
      sourceId,
      eventCount: sourceEvents.length,
      adverseEventCount: sourceEvents.filter(isAdverse).length,
      correlatedSourceIds: [...correlatedWith],
      evidenceMeasured: sourceEvents.length > 0
    };
  });

  return {
    schema: "ai-data-platform.cross-application-interaction-trace.v1",
    build: CROSS_APPLICATION_INTERACTION_TRACE_BUILD,
    generatedAt: generatedAt.toISOString(),
    sourceCount: MASTER_SHELL_SOURCE_IDS.length,
    sourceNodes,
    correlationGroups,
    dependencyEdges,
    failurePropagation,
    summary: {
      ingestedEventsConsidered: accepted.length,
      correlationGroups: correlationGroups.length,
      crossApplicationGroups: correlationGroups.filter(
        (group) => group.crossApplication
      ).length,
      dependencyEdges: dependencyEdges.length,
      adverseCrossApplicationGroups: failurePropagation.filter(
        (item) => item.state === "OBSERVED_ADVERSE_EVIDENCE"
      ).length
    },
    policy: {
      readOnly: true,
      sourceMutationPerformed: false,
      peerWritePerformed: false,
      externalProbePerformed: false,
      correlationProvesCausation: false,
      inferredFailureOriginIsSourceTruth: false,
      missingTraceMeansNoInteraction: false,
      tenantIdentityInferredFromCorrelation: false,
      customerIdentityInferredFromCorrelation: false,
      sourceProvenanceRetained: true
    }
  };
}

export type CrossApplicationInteractionTraceModel = ReturnType<
  typeof composeCrossApplicationInteractionTrace
>;

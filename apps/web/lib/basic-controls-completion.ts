import type { MasterProductionReadinessModel } from "./master-production-readiness-core";
import {
  MASTER_SHELL_SOURCE_IDS,
  type MasterShellSourceId
} from "./master-shell-contract-v1";

export const BASIC_CONTROLS_BUILD = 351 as const;
export const BASIC_CONTROLS_SCHEMA =
  "rosevear.ai-data-platform.basic-controls-completion.v1" as const;

export const BASIC_CONTROL_STATES = [
  "COMPLETE",
  "PARTIAL",
  "HOLD",
  "STALE",
  "FAIL"
] as const;

export type BasicControlState = (typeof BASIC_CONTROL_STATES)[number];

type BasicControlDefinition = {
  id: string;
  area:
    | "shell"
    | "source-truth"
    | "security"
    | "recovery"
    | "accessibility"
    | "evidence"
    | "operations";
  title: string;
  requirement: string;
  evidence: string;
  sourceDependent: boolean;
};

const DEFINITIONS: BasicControlDefinition[] = [
  {
    id: "BASIC-001",
    area: "shell",
    title: "Master Shell navigation and authenticated context",
    requirement:
      "The Master Shell exposes governed navigation and preserves authenticated role and tenant/workspace context.",
    evidence: "Builds 340-341",
    sourceDependent: false
  },
  {
    id: "BASIC-002",
    area: "source-truth",
    title: "Exact six-source identity and state",
    requirement:
      "The exact six application sources remain explicitly identified and source state is never inferred from deployment success.",
    evidence: "Builds 335-339",
    sourceDependent: true
  },
  {
    id: "BASIC-003",
    area: "evidence",
    title: "Freshness, provenance and evidence separation",
    requirement:
      "Current evidence preserves provenance and distinguishes implemented, tested, integrated, accepted, stale and held states.",
    evidence: "Builds 336-350",
    sourceDependent: true
  },
  {
    id: "BASIC-004",
    area: "operations",
    title: "Health, blocker and HOLD visibility",
    requirement:
      "Operators can see source/module health, blockers, HOLD, stale and failure states without silently mutating them.",
    evidence: "Build 344",
    sourceDependent: true
  },
  {
    id: "BASIC-005",
    area: "security",
    title: "Authorization, consent and fail-closed boundaries",
    requirement:
      "Role authorization, consent, trust and sensitive-data handling remain explicit and fail closed when evidence is missing.",
    evidence: "Build 347",
    sourceDependent: true
  },
  {
    id: "BASIC-006",
    area: "recovery",
    title: "Recovery and rollback visibility",
    requirement:
      "Recovery and rollback evidence is visible and does not execute automatically from Master Shell observation.",
    evidence: "Build 349",
    sourceDependent: true
  },
  {
    id: "BASIC-007",
    area: "accessibility",
    title: "Role and device acceptance evidence",
    requirement:
      "Customer, Worker and Admin acceptance remains separately evidenced across Mobile, Tablet and Desktop.",
    evidence: "Build 345",
    sourceDependent: true
  },
  {
    id: "BASIC-008",
    area: "operations",
    title: "Comms complementary-plane boundary",
    requirement:
      "Rosevear Comms Hub remains the communications/control plane and is not misrepresented as a seventh child source.",
    evidence: "Build 342",
    sourceDependent: false
  },
  {
    id: "BASIC-009",
    area: "evidence",
    title: "Historical preflight and prelaunch truth",
    requirement:
      "Historical preflight/prelaunch labels are informational unless a current requirement explicitly references fresh evidence from them.",
    evidence: "Build 351",
    sourceDependent: false
  },
  {
    id: "BASIC-010",
    area: "operations",
    title: "Production GREEN is deployment evidence only",
    requirement:
      "CI or deployment GREEN does not establish source connectivity, tenant acceptance, owner acceptance or Master Completion.",
    evidence: "Builds 331-350",
    sourceDependent: false
  }
];

function sourceStateToControlState(
  state: MasterProductionReadinessModel["sources"][number]["effectiveState"]
): BasicControlState {
  if (state === "ACCEPTED") return "COMPLETE";
  if (state === "FAIL") return "FAIL";
  if (state === "STALE") return "STALE";
  if (state === "HOLD") return "HOLD";
  return "PARTIAL";
}

function rank(state: BasicControlState) {
  return state === "FAIL"
    ? 4
    : state === "STALE"
      ? 3
      : state === "HOLD"
        ? 2
        : state === "PARTIAL"
          ? 1
          : 0;
}

function sourceState(
  readiness: MasterProductionReadinessModel,
  sourceId: MasterShellSourceId
) {
  const source = readiness.sources.find((item) => item.sourceId === sourceId);
  if (!source) throw new Error("basic_controls_source_missing");
  return {
    sourceId,
    effectiveState: source.effectiveState,
    controlState: sourceStateToControlState(source.effectiveState),
    ownerDecision: source.run?.ownerDecision ?? "missing",
    observedAt: source.run?.observedAt ?? null,
    expiresAt: source.run?.expiresAt ?? null
  };
}

export function buildBasicControlsCompletion(input: {
  readiness: MasterProductionReadinessModel;
  generatedAt?: Date;
}) {
  const sources = MASTER_SHELL_SOURCE_IDS.map((sourceId) =>
    sourceState(input.readiness, sourceId)
  );

  const worstSourceState = sources
    .map((source) => source.controlState)
    .sort((a, b) => rank(b) - rank(a))[0] ?? "PARTIAL";

  const controls = DEFINITIONS.map((definition) => ({
    ...definition,
    state: definition.sourceDependent ? worstSourceState : "COMPLETE",
    truth:
      definition.sourceDependent
        ? "Derived from current Build 349 source-readiness evidence; a non-ACCEPTED source prevents COMPLETE."
        : definition.id === "BASIC-009"
          ? "Historical labels are retained as context, not as automatic production blockers."
          : "Implemented platform control; operational acceptance remains separately evidenced where applicable."
  }));

  const counts = BASIC_CONTROL_STATES.reduce(
    (result, state) => {
      result[state] = controls.filter((control) => control.state === state).length;
      return result;
    },
    {} as Record<BasicControlState, number>
  );

  return {
    schema: BASIC_CONTROLS_SCHEMA,
    build: BASIC_CONTROLS_BUILD,
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    sources,
    controls,
    summary: {
      totalControls: controls.length,
      complete: counts.COMPLETE,
      partial: counts.PARTIAL,
      hold: counts.HOLD,
      stale: counts.STALE,
      failed: counts.FAIL,
      basicControlsComplete: controls.every(
        (control) => control.state === "COMPLETE"
      )
    },
    policy: {
      historicalPreflightIsAutomaticBlocker: false as const,
      currentRequirementEvidenceMayStillBlock: true as const,
      deploymentGreenImpliesAcceptance: false as const,
      sourceSpecificAuthorityRemainsAuthoritative: true as const,
      missingEvidenceIsSuccess: false as const,
      basicControlCompletionDoesNotAuthorizePeerWrites: true as const,
      basicControlCompletionDoesNotReleaseHold: true as const
    }
  };
}

export type BasicControlsCompletionModel = ReturnType<
  typeof buildBasicControlsCompletion
>;

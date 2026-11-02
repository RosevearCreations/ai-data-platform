export type ProviderPilotBaselineState = "measured" | "blocked" | "ready-unmeasured";

export type ProviderPilotBlocker = {
  code: string;
  scope: "global" | "workspace";
  label: string;
};

export type ProviderPilotTerminalEvidence = {
  eventType: "run-succeeded" | "run-failed";
  jobId: string | null;
  occurredAt: string;
  unitsEstimated: number;
  durationMs: number | null;
  responseCode: number | null;
  contentSha256: string | null;
  finalUrl: string | null;
  failureReason: string | null;
};

export type ProviderPilotWorkspaceBaseline = {
  workspaceId: string;
  workspaceName: string;
  role: "owner" | "admin" | "member";
  state: ProviderPilotBaselineState;
  terminalRuns: number;
  successes: number;
  failures: number;
  successRate: number | null;
  providerUnits: number;
  averageDurationMs: number | null;
  approvedPublicSources: number;
  enabledAllowlistSources: number;
  controlEnabled: boolean;
  workspaceKillSwitch: boolean;
  blockers: ProviderPilotBlocker[];
  latestTerminalEvidence: ProviderPilotTerminalEvidence | null;
};

export type ProviderPilotBaselineModel = {
  schema: "ai-data-platform.provider-pilot-baseline.v1";
  generatedAt: string;
  build: 275;
  provider: "browserless";
  state: "measured" | "blocked" | "ready-unmeasured";
  exitCriterion: {
    met: boolean;
    label: string;
    evidence: string;
  };
  globalReadiness: {
    tokenConfigured: boolean;
    executionEnabled: boolean;
    globalKillSwitchActive: boolean;
    readyForLivePilot: boolean;
    blockers: ProviderPilotBlocker[];
  };
  totals: {
    workspaces: number;
    measuredWorkspaces: number;
    blockedWorkspaces: number;
    readyUnmeasuredWorkspaces: number;
    terminalRuns: number;
    successes: number;
    failures: number;
    providerUnits: number;
    averageDurationMs: number | null;
    approvedPublicSources: number;
  };
  stopConditions: string[];
  workspaces: ProviderPilotWorkspaceBaseline[];
};

type ReadinessInput = {
  tokenConfigured: boolean;
  executionEnabled: boolean;
  globalKillSwitchActive: boolean;
  readyForLivePilot: boolean;
};

type EventInput = {
  jobId: string | null;
  eventType: string;
  unitsEstimated: number;
  durationMs: number | null;
  responseCode: number | null;
  details: Record<string, unknown>;
  createdAt: Date;
};

export type ProviderPilotWorkspaceInput = {
  workspace: {
    id: string;
    name: string;
    role: "owner" | "admin" | "member";
  };
  control: {
    enabled: boolean;
    killSwitch: boolean;
  } | null;
  allowlist: Array<{ enabled: boolean }>;
  events: EventInput[];
  report: {
    runs: number;
    successes: number;
    failures: number;
    successRate: number | null;
    providerUnits: number;
    averageDurationMs: number | null;
  };
  approvedPublicSources: number;
};

function textDetail(details: Record<string, unknown>, key: string) {
  const value = details[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function globalBlockers(readiness: ReadinessInput): ProviderPilotBlocker[] {
  const blockers: ProviderPilotBlocker[] = [];
  if (!readiness.tokenConfigured) {
    blockers.push({
      code: "provider-token-missing",
      scope: "global",
      label: "Browserless provider credential is not configured."
    });
  }
  if (!readiness.executionEnabled) {
    blockers.push({
      code: "provider-execution-disabled",
      scope: "global",
      label: "Remote provider execution environment gate is disabled."
    });
  }
  if (readiness.globalKillSwitchActive) {
    blockers.push({
      code: "global-kill-switch-active",
      scope: "global",
      label: "Global remote-execution kill switch is active."
    });
  }
  return blockers;
}

function workspaceBlockers(
  input: ProviderPilotWorkspaceInput,
  inherited: ProviderPilotBlocker[]
): ProviderPilotBlocker[] {
  const blockers = [...inherited];
  if (input.approvedPublicSources === 0) {
    blockers.push({
      code: "approved-public-source-missing",
      scope: "workspace",
      label: "No current approved public source-policy candidate is available."
    });
  }
  if (!input.control) {
    blockers.push({
      code: "workspace-control-missing",
      scope: "workspace",
      label: "Workspace provider control has not been configured."
    });
  } else {
    if (!input.control.enabled) {
      blockers.push({
        code: "workspace-provider-disabled",
        scope: "workspace",
        label: "Workspace remote provider control is disabled."
      });
    }
    if (input.control.killSwitch) {
      blockers.push({
        code: "workspace-kill-switch-active",
        scope: "workspace",
        label: "Workspace kill switch is active."
      });
    }
  }
  if (input.allowlist.filter((item) => item.enabled).length === 0) {
    blockers.push({
      code: "enabled-allowlist-source-missing",
      scope: "workspace",
      label: "No enabled provider allowlist source is configured."
    });
  }
  return blockers;
}

function terminalEvidence(events: EventInput[]): ProviderPilotTerminalEvidence | null {
  const event = events.find(
    (candidate) =>
      candidate.eventType === "run-succeeded" ||
      candidate.eventType === "run-failed"
  );
  if (!event) return null;

  return {
    eventType: event.eventType as "run-succeeded" | "run-failed",
    jobId: event.jobId,
    occurredAt: event.createdAt.toISOString(),
    unitsEstimated: event.unitsEstimated,
    durationMs: event.durationMs,
    responseCode: event.responseCode,
    contentSha256:
      event.eventType === "run-succeeded"
        ? textDetail(event.details, "contentSha256")
        : null,
    finalUrl:
      event.eventType === "run-succeeded"
        ? textDetail(event.details, "finalUrl")
        : null,
    failureReason:
      event.eventType === "run-failed"
        ? textDetail(event.details, "failureCode")
        : null
  };
}

export function buildProviderPilotBaseline(
  readiness: ReadinessInput,
  inputs: ProviderPilotWorkspaceInput[],
  generatedAt = new Date().toISOString()
): ProviderPilotBaselineModel {
  const inherited = globalBlockers(readiness);
  const workspaces = inputs.map((input): ProviderPilotWorkspaceBaseline => {
    const blockers = workspaceBlockers(input, inherited);
    const measured = input.report.runs > 0;
    const state: ProviderPilotBaselineState = measured
      ? "measured"
      : blockers.length > 0
        ? "blocked"
        : "ready-unmeasured";

    return {
      workspaceId: input.workspace.id,
      workspaceName: input.workspace.name,
      role: input.workspace.role,
      state,
      terminalRuns: input.report.runs,
      successes: input.report.successes,
      failures: input.report.failures,
      successRate: input.report.successRate,
      providerUnits: input.report.providerUnits,
      averageDurationMs: input.report.averageDurationMs,
      approvedPublicSources: input.approvedPublicSources,
      enabledAllowlistSources: input.allowlist.filter((item) => item.enabled).length,
      controlEnabled: Boolean(input.control?.enabled),
      workspaceKillSwitch: input.control?.killSwitch ?? true,
      blockers,
      latestTerminalEvidence: terminalEvidence(input.events)
    };
  });

  const terminalEvents = inputs.flatMap((input) =>
    input.events.filter(
      (event) =>
        event.eventType === "run-succeeded" ||
        event.eventType === "run-failed"
    )
  );
  const durations = terminalEvents
    .map((event) => event.durationMs)
    .filter((value): value is number => value !== null);

  const totals = {
    workspaces: workspaces.length,
    measuredWorkspaces: workspaces.filter((workspace) => workspace.state === "measured").length,
    blockedWorkspaces: workspaces.filter((workspace) => workspace.state === "blocked").length,
    readyUnmeasuredWorkspaces: workspaces.filter((workspace) => workspace.state === "ready-unmeasured").length,
    terminalRuns: workspaces.reduce((total, workspace) => total + workspace.terminalRuns, 0),
    successes: workspaces.reduce((total, workspace) => total + workspace.successes, 0),
    failures: workspaces.reduce((total, workspace) => total + workspace.failures, 0),
    providerUnits: workspaces.reduce((total, workspace) => total + workspace.providerUnits, 0),
    averageDurationMs:
      durations.length === 0
        ? null
        : Math.round(durations.reduce((total, value) => total + value, 0) / durations.length),
    approvedPublicSources: workspaces.reduce(
      (total, workspace) => total + workspace.approvedPublicSources,
      0
    )
  };

  const explicitlyBlockedWithoutSimulation =
    totals.terminalRuns === 0 &&
    totals.blockedWorkspaces > 0 &&
    totals.readyUnmeasuredWorkspaces === 0;
  const exitMet = totals.terminalRuns > 0 || explicitlyBlockedWithoutSimulation;
  const state =
    totals.terminalRuns > 0
      ? "measured"
      : totals.readyUnmeasuredWorkspaces > 0
        ? "ready-unmeasured"
        : "blocked";

  return {
    schema: "ai-data-platform.provider-pilot-baseline.v1",
    generatedAt,
    build: 275,
    provider: "browserless",
    state,
    exitCriterion: {
      met: exitMet,
      label:
        "A bounded terminal provider run supplies real cost/latency/outcome evidence, or every currently unmeasured workspace remains explicitly blocked by authorization/source-policy controls rather than a simulated pass.",
      evidence:
        String(totals.terminalRuns) +
        " terminal run(s); " +
        String(totals.providerUnits) +
        " provider unit(s); " +
        String(totals.blockedWorkspaces) +
        " blocked workspace(s); " +
        String(totals.readyUnmeasuredWorkspaces) +
        " ready-but-unmeasured workspace(s)."
    },
    globalReadiness: {
      ...readiness,
      blockers: inherited
    },
    totals,
    stopConditions: [
      "Global or workspace kill switch becomes active.",
      "Remote provider execution environment gate is disabled.",
      "Current source-policy approval, fingerprint or allowlist pin drifts.",
      "One-page, runtime or provider-unit budget is exceeded.",
      "Operator cancellation or job cancellation is requested.",
      "Provider request fails or returns a disallowed response.",
      "Content exceeds the bounded size limit or redirects across origin."
    ],
    workspaces
  };
}

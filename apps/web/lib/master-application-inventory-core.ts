import {
  MASTER_SHELL_SOURCE_DEFINITIONS,
  type MasterShellSourceId
} from "./master-shell-contract-v1";
import {
  buildAppConnectionRegistry,
  type PeerApplicationId
} from "./app-connection-registry";
import {
  AI_DATA_MODULE_ID,
  AI_DATA_MODULE_VERSION,
  MODULE_FEATURE_FLAGS,
  MODULE_HEADLESS_CAPABILITIES
} from "./universal-module-contract";

export const MASTER_APPLICATION_INVENTORY_BUILD = 339 as const;

export type InventoryFreshness =
  | "FRESH"
  | "STALE"
  | "UNMEASURED";

export type InventoryOrigin =
  | "source-readiness-event"
  | "master-completion-requirement"
  | "master-completion-scope"
  | "installed-ai-data-module";

export type SourceRegistryInventoryEvidence = {
  sourceId: MasterShellSourceId;
  environment: "nonproduction" | "production" | null;
  declaredStatus: string;
  effectiveStatus: string;
  freshness: InventoryFreshness;
  statusObservedAt: string | null;
  statusExpiresAt: string | null;
  evidenceURI: string | null;
  manifestURI: string | null;
  immutableRevision: string | null;
  capabilityVersion: string | null;
  approvedOrigin: string | null;
  rolesAllowed: string[];
  evidenceAuthority: string | null;
};

export type SourceModuleReadinessEvidence = {
  sourceId: MasterShellSourceId;
  moduleId: string;
  readinessState:
    | "UNKNOWN"
    | "IN_PROGRESS"
    | "BLOCKED"
    | "READY"
    | "ACCEPTED";
  completionPercent: number | null;
  evidenceURI: string;
  expiresAt: string;
  occurredAt: string;
  publishedAt: string;
  sourceRevision: string;
  sourceSequence: number;
  verificationState: string;
};

export type SourceReleaseEvidence = {
  sourceId: MasterShellSourceId;
  releaseId: string;
  branch: string;
  deploymentStatus: "GREEN" | "RED" | "HOLD" | "UNKNOWN";
  evidenceURI: string;
  expiresAt: string;
  occurredAt: string;
  sourceRevision: string;
  sourceSequence: number;
};

export type CompletionRequirementInventoryInput = {
  requirementId: string;
  sourceId: MasterShellSourceId;
  moduleId: string | null;
  title: string;
  applicability: "required" | "not-applicable" | "unscoped";
};

export type CompletionScopeInventoryInput = {
  sourceId: MasterShellSourceId;
  moduleId: string | null;
  scopeKey: string;
  scopeVersion: number;
  scopeDate: string;
  branch: string;
  commitSha: string;
  denominatorHash: string;
  completion: {
    percent: number | null;
    numerator: number;
    denominator: number;
    blockedByUnknown: number;
    blockedByStale: number;
  };
  evidenceCoverage: {
    percent: number | null;
    numerator: number;
    denominator: number;
    blockedByUnknown: number;
    blockedByStale: number;
  };
  counts: {
    satisfied: number;
    partial: number;
    failed: number;
    unknown: number;
    stale: number;
    criticalFailed: number;
  };
};

export type InstalledAiDataModuleEvidence = {
  sourceId: MasterShellSourceId;
  moduleHostInstanceId: string;
  workspaceId: string;
  hostApplicationId: string;
  hostInstanceId: string;
  environment: string;
  currentVersion: string;
  lastKnownGoodVersion: string;
  lifecycleState: string;
  installationEvidence: string;
  observedAt: string;
  updatedAt: string;
};

export type MasterApplicationInventoryInput = {
  registry: SourceRegistryInventoryEvidence[];
  moduleReadiness: SourceModuleReadinessEvidence[];
  releases: SourceReleaseEvidence[];
  requirements: CompletionRequirementInventoryInput[];
  completionScopes: CompletionScopeInventoryInput[];
  installedAiDataModules: InstalledAiDataModuleEvidence[];
  unmappedHostInstances: number;
  now?: Date;
};

const DISPLAY_NAMES: Record<MasterShellSourceId, string> = {
  yw: "Yard Workers",
  icamp: "iCamp",
  rosiedazzlers: "Rosie Dazzlers",
  devilndove: "Devil n Dove",
  "ai-data-platform": "AI Data Platform",
  "rosevear-ai-hub": "Rosevear AI Hub"
};

const SOURCE_TO_PEER_ID: Partial<
  Record<MasterShellSourceId, PeerApplicationId>
> = {
  yw: "yard-workers",
  icamp: "icamp",
  rosiedazzlers: "rosiedazzlers",
  devilndove: "devilndove",
  "rosevear-ai-hub": "rosevear-ai-hub"
};

function freshness(expiresAt: string | null, now: Date): InventoryFreshness {
  if (!expiresAt || !Number.isFinite(Date.parse(expiresAt))) {
    return "UNMEASURED";
  }
  return Date.parse(expiresAt) <= now.getTime() ? "STALE" : "FRESH";
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort();
}

function latestBySource<T extends {
  sourceId: MasterShellSourceId;
  sourceSequence: number;
}>(items: T[]) {
  const map = new Map<MasterShellSourceId, T>();
  for (const item of items) {
    const current = map.get(item.sourceId);
    if (!current || item.sourceSequence > current.sourceSequence) {
      map.set(item.sourceId, item);
    }
  }
  return map;
}

function completionScopeState(
  scope: CompletionScopeInventoryInput | null
) {
  if (!scope) return "UNSCOPED" as const;
  if (
    scope.completion.blockedByUnknown > 0 ||
    scope.completion.blockedByStale > 0 ||
    scope.completion.percent === null
  ) {
    return "EVIDENCE_INCOMPLETE" as const;
  }
  if (
    scope.counts.failed > 0 ||
    scope.counts.partial > 0
  ) {
    return "EVIDENCE_NOT_COMPLETE" as const;
  }
  if (
    scope.completion.percent === 100 &&
    scope.completion.numerator === scope.completion.denominator
  ) {
    return "EVIDENCE_COMPLETE" as const;
  }
  return "EVIDENCE_NOT_COMPLETE" as const;
}

export function normalizeHostApplicationId(
  value: string
): MasterShellSourceId | null {
  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, MasterShellSourceId> = {
    yw: "yw",
    "yard-workers": "yw",
    yardworkers: "yw",
    icamp: "icamp",
    rosiedazzlers: "rosiedazzlers",
    "rosie-dazzlers": "rosiedazzlers",
    devilndove: "devilndove",
    "devil-n-dove": "devilndove",
    "ai-data-platform": "ai-data-platform",
    "rosevear-ai-hub": "rosevear-ai-hub"
  };
  return aliases[normalized] ?? null;
}

export function buildMasterApplicationInventoryReadModel(
  input: MasterApplicationInventoryInput
) {
  const now = input.now ?? new Date();
  const registry = new Map(
    input.registry.map((item) => [item.sourceId, item])
  );

  const readiness = new Map<string, SourceModuleReadinessEvidence>();
  for (const item of input.moduleReadiness) {
    const key = item.sourceId + "::" + item.moduleId;
    const current = readiness.get(key);
    if (!current || item.sourceSequence > current.sourceSequence) {
      readiness.set(key, item);
    }
  }

  const releases = latestBySource(input.releases);

  const requirementsBySource = new Map<
    MasterShellSourceId,
    CompletionRequirementInventoryInput[]
  >();
  for (const requirement of input.requirements) {
    const items = requirementsBySource.get(requirement.sourceId) ?? [];
    items.push(requirement);
    requirementsBySource.set(requirement.sourceId, items);
  }

  const completionByScope = new Map(
    input.completionScopes.map((item) => [item.scopeKey, item])
  );

  const installedBySource = new Map<
    MasterShellSourceId,
    InstalledAiDataModuleEvidence[]
  >();
  for (const instance of input.installedAiDataModules) {
    const items = installedBySource.get(instance.sourceId) ?? [];
    items.push(instance);
    installedBySource.set(instance.sourceId, items);
  }

  const peerRegistry = buildAppConnectionRegistry(now.toISOString());
  const peerById = new Map(
    peerRegistry.peerApplications.map((item) => [item.id, item])
  );

  const applications = MASTER_SHELL_SOURCE_DEFINITIONS.map((definition) => {
    const registryEvidence = registry.get(definition.sourceId) ?? null;
    const requirements = requirementsBySource.get(definition.sourceId) ?? [];
    const installed = installedBySource.get(definition.sourceId) ?? [];
    const peerId = SOURCE_TO_PEER_ID[definition.sourceId] ?? null;
    const peer = peerId ? peerById.get(peerId) ?? null : null;

    const moduleIds = new Set<string>();
    const origins = new Map<string, Set<InventoryOrigin>>();

    for (const item of input.moduleReadiness) {
      if (item.sourceId !== definition.sourceId) continue;
      moduleIds.add(item.moduleId);
      const set = origins.get(item.moduleId) ?? new Set<InventoryOrigin>();
      set.add("source-readiness-event");
      origins.set(item.moduleId, set);
    }

    for (const requirement of requirements) {
      if (!requirement.moduleId) continue;
      moduleIds.add(requirement.moduleId);
      const set =
        origins.get(requirement.moduleId) ?? new Set<InventoryOrigin>();
      set.add("master-completion-requirement");
      origins.set(requirement.moduleId, set);
    }

    for (const scope of input.completionScopes) {
      if (
        scope.sourceId !== definition.sourceId ||
        !scope.moduleId
      ) {
        continue;
      }
      moduleIds.add(scope.moduleId);
      const set = origins.get(scope.moduleId) ?? new Set<InventoryOrigin>();
      set.add("master-completion-scope");
      origins.set(scope.moduleId, set);
    }

    if (installed.length > 0) {
      moduleIds.add(AI_DATA_MODULE_ID);
      const set =
        origins.get(AI_DATA_MODULE_ID) ?? new Set<InventoryOrigin>();
      set.add("installed-ai-data-module");
      origins.set(AI_DATA_MODULE_ID, set);
    }

    const modules = [...moduleIds]
      .sort()
      .map((moduleId) => {
        const sourceReadiness =
          readiness.get(definition.sourceId + "::" + moduleId) ?? null;
        const scope =
          completionByScope.get(
            definition.sourceId + "::" + moduleId
          ) ?? null;
        const requirementItems = requirements.filter(
          (item) => item.moduleId === moduleId
        );
        const installedInstances =
          moduleId === AI_DATA_MODULE_ID ? installed : [];

        const moduleFreshness = sourceReadiness
          ? freshness(sourceReadiness.expiresAt, now)
          : "UNMEASURED";

        return {
          moduleId,
          inventoryOrigins: [
            ...(origins.get(moduleId) ?? new Set<InventoryOrigin>())
          ].sort(),
          cataloguePresenceImpliesAcceptance: false,
          ownership: {
            productOwner: null,
            ownerRoles: [],
            state: "UNMEASURED" as const,
            inferencePerformed: false
          },
          sourceReportedReadiness: sourceReadiness
            ? {
                readinessState: sourceReadiness.readinessState,
                completionPercent: sourceReadiness.completionPercent,
                evidenceURI: sourceReadiness.evidenceURI,
                freshness: moduleFreshness,
                observedAt: sourceReadiness.occurredAt,
                publishedAt: sourceReadiness.publishedAt,
                expiresAt: sourceReadiness.expiresAt,
                sourceRevision: sourceReadiness.sourceRevision,
                sourceSequence: sourceReadiness.sourceSequence,
                verificationState: sourceReadiness.verificationState,
                acceptedBySource:
                  sourceReadiness.readinessState === "ACCEPTED",
                masterAcceptanceInferred: false
              }
            : {
                readinessState: "UNKNOWN" as const,
                completionPercent: null,
                evidenceURI: null,
                freshness: "UNMEASURED" as const,
                observedAt: null,
                publishedAt: null,
                expiresAt: null,
                sourceRevision: null,
                sourceSequence: null,
                verificationState: "unknown",
                acceptedBySource: false,
                masterAcceptanceInferred: false
              },
          masterCompletion: scope
            ? {
                scopeKey: scope.scopeKey,
                scopeVersion: scope.scopeVersion,
                scopeDate: scope.scopeDate,
                branch: scope.branch,
                commitSha: scope.commitSha,
                denominatorHash: scope.denominatorHash,
                completion: scope.completion,
                evidenceCoverage: scope.evidenceCoverage,
                counts: scope.counts,
                evidenceState: completionScopeState(scope),
                productionAcceptanceInferred: false
              }
            : {
                scopeKey: null,
                scopeVersion: null,
                scopeDate: null,
                branch: null,
                commitSha: null,
                denominatorHash: null,
                completion: null,
                evidenceCoverage: null,
                counts: null,
                evidenceState: "UNSCOPED" as const,
                productionAcceptanceInferred: false
              },
          requirementInventory: {
            requirements: requirementItems.length,
            required: requirementItems.filter(
              (item) => item.applicability === "required"
            ).length,
            notApplicable: requirementItems.filter(
              (item) => item.applicability === "not-applicable"
            ).length,
            unscoped: requirementItems.filter(
              (item) => item.applicability === "unscoped"
            ).length
          },
          versionEvidence: {
            sourceModuleVersion: null,
            sourceModuleVersionState: "UNMEASURED" as const,
            installedAiDataModuleVersion:
              installedInstances.length > 0
                ? uniqueSorted(
                    installedInstances.map((item) => item.currentVersion)
                  )
                : [],
            installedInstances: installedInstances.map((item) => ({
              moduleHostInstanceId: item.moduleHostInstanceId,
              hostInstanceId: item.hostInstanceId,
              environment: item.environment,
              currentVersion: item.currentVersion,
              lastKnownGoodVersion: item.lastKnownGoodVersion,
              lifecycleState: item.lifecycleState,
              installationEvidence: item.installationEvidence,
              observedAt: item.observedAt,
              updatedAt: item.updatedAt
            })),
            installedVersionProvesSourceModuleAcceptance: false
          },
          capabilityEvidence:
            moduleId === AI_DATA_MODULE_ID
              ? {
                  declaredCapabilities: [...MODULE_HEADLESS_CAPABILITIES],
                  featureFlags: [...MODULE_FEATURE_FLAGS],
                  provenance: "ai-data-platform-source-contract" as const,
                  capabilityVersion: AI_DATA_MODULE_VERSION,
                  acceptedCapabilitiesInferred: false
                }
              : {
                  declaredCapabilities: [],
                  featureFlags: [],
                  provenance: "UNMEASURED" as const,
                  capabilityVersion: null,
                  acceptedCapabilitiesInferred: false
                }
        };
      });

    const sourceWideCompletion =
      completionByScope.get(definition.sourceId + "::*") ?? null;
    const release = releases.get(definition.sourceId) ?? null;

    const discoveryCapabilities =
      peer?.discoveryCapabilities ?? [];

    return {
      sourceId: definition.sourceId,
      displayName: DISPLAY_NAMES[definition.sourceId],
      shellId: definition.shellId,
      repository: definition.repository,
      shellBoundary: definition.shellBoundary,
      tenancyModel: definition.tenancyModel,
      applicationState: registryEvidence
        ? {
            declaredStatus: registryEvidence.declaredStatus,
            effectiveStatus: registryEvidence.effectiveStatus,
            freshness: registryEvidence.freshness,
            environment: registryEvidence.environment,
            statusObservedAt: registryEvidence.statusObservedAt,
            statusExpiresAt: registryEvidence.statusExpiresAt,
            evidenceURI: registryEvidence.evidenceURI,
            evidenceAuthority: registryEvidence.evidenceAuthority
          }
        : {
            declaredStatus: "UNKNOWN",
            effectiveStatus: "UNKNOWN",
            freshness: "UNMEASURED" as const,
            environment: null,
            statusObservedAt: null,
            statusExpiresAt: null,
            evidenceURI: null,
            evidenceAuthority: null
          },
      versionEvidence: {
        immutableRevision: registryEvidence?.immutableRevision ?? null,
        capabilityVersion: registryEvidence?.capabilityVersion ?? null,
        manifestURI: registryEvidence?.manifestURI ?? null,
        latestRelease: release
          ? {
              releaseId: release.releaseId,
              branch: release.branch,
              deploymentStatus: release.deploymentStatus,
              evidenceURI: release.evidenceURI,
              freshness: freshness(release.expiresAt, now),
              expiresAt: release.expiresAt,
              observedAt: release.occurredAt,
              sourceRevision: release.sourceRevision,
              sourceSequence: release.sourceSequence
            }
          : null,
        versionInferencePerformed: false
      },
      ownership: {
        productOwner: null,
        rolesAllowed: registryEvidence?.rolesAllowed ?? [],
        state:
          (registryEvidence?.rolesAllowed.length ?? 0) > 0
            ? "ROLES_REPORTED"
            : "UNMEASURED",
        provenance:
          (registryEvidence?.rolesAllowed.length ?? 0) > 0
            ? "master-shell-source-registry"
            : null,
        personIdentityInferred: false
      },
      capabilities: {
        sourceCapabilityVersion:
          registryEvidence?.capabilityVersion ?? null,
        sourceManifestURI: registryEvidence?.manifestURI ?? null,
        sourceDeclaredCapabilities:
          definition.sourceId === "ai-data-platform"
            ? [...MODULE_HEADLESS_CAPABILITIES]
            : [],
        sourceDeclaredFeatureFlags:
          definition.sourceId === "ai-data-platform"
            ? [...MODULE_FEATURE_FLAGS]
            : [],
        discoveryCapabilities,
        discoveryState: peer?.discoveryState ?? "not-applicable",
        discoveryProvenance: peer
          ? "build-281-read-only-catalog"
          : definition.sourceId === "ai-data-platform"
            ? "ai-data-platform-source-contract"
            : null,
        discoveryImpliesAuthorization: false,
        discoveryImpliesAcceptance: false
      },
      masterCompletion: sourceWideCompletion
        ? {
            scopeKey: sourceWideCompletion.scopeKey,
            scopeVersion: sourceWideCompletion.scopeVersion,
            scopeDate: sourceWideCompletion.scopeDate,
            branch: sourceWideCompletion.branch,
            commitSha: sourceWideCompletion.commitSha,
            denominatorHash: sourceWideCompletion.denominatorHash,
            completion: sourceWideCompletion.completion,
            evidenceCoverage: sourceWideCompletion.evidenceCoverage,
            counts: sourceWideCompletion.counts,
            evidenceState: completionScopeState(sourceWideCompletion),
            productionAcceptanceInferred: false
          }
        : null,
      modules,
      moduleSummary: {
        modules: modules.length,
        freshSourceReadiness: modules.filter(
          (item) =>
            item.sourceReportedReadiness.freshness === "FRESH"
        ).length,
        staleSourceReadiness: modules.filter(
          (item) =>
            item.sourceReportedReadiness.freshness === "STALE"
        ).length,
        unmeasuredSourceReadiness: modules.filter(
          (item) =>
            item.sourceReportedReadiness.freshness === "UNMEASURED"
        ).length,
        withApprovedCompletionScope: modules.filter(
          (item) => item.masterCompletion.scopeKey !== null
        ).length,
        withCalculableCompletion: modules.filter(
          (item) =>
            item.masterCompletion.completion?.percent !== null &&
            item.masterCompletion.completion?.percent !== undefined
        ).length,
        withInstalledAiDataModuleEvidence: modules.filter(
          (item) =>
            item.versionEvidence.installedInstances.length > 0
        ).length
      }
    };
  });

  return {
    schema: "ai-data-platform.master-application-inventory.v1",
    build: MASTER_APPLICATION_INVENTORY_BUILD,
    generatedAt: now.toISOString(),
    applications,
    summary: {
      applications: applications.length,
      modules: applications.reduce(
        (sum, app) => sum + app.moduleSummary.modules,
        0
      ),
      applicationsWithFreshRegistryEvidence: applications.filter(
        (app) => app.applicationState.freshness === "FRESH"
      ).length,
      applicationsWithStaleRegistryEvidence: applications.filter(
        (app) => app.applicationState.freshness === "STALE"
      ).length,
      applicationsWithUnmeasuredRegistryEvidence: applications.filter(
        (app) => app.applicationState.freshness === "UNMEASURED"
      ).length,
      modulesWithFreshSourceReadiness: applications.reduce(
        (sum, app) => sum + app.moduleSummary.freshSourceReadiness,
        0
      ),
      modulesWithStaleSourceReadiness: applications.reduce(
        (sum, app) => sum + app.moduleSummary.staleSourceReadiness,
        0
      ),
      modulesWithUnmeasuredSourceReadiness: applications.reduce(
        (sum, app) => sum + app.moduleSummary.unmeasuredSourceReadiness,
        0
      ),
      modulesWithApprovedCompletionScope: applications.reduce(
        (sum, app) =>
          sum + app.moduleSummary.withApprovedCompletionScope,
        0
      ),
      modulesWithCalculableCompletion: applications.reduce(
        (sum, app) => sum + app.moduleSummary.withCalculableCompletion,
        0
      ),
      unmappedHostInstances: input.unmappedHostInstances
    },
    policy: {
      exactSixApplications: true,
      readOnlyComposition: true,
      cataloguePresenceImpliesAcceptance: false,
      discoveryImpliesAuthorization: false,
      sourceReportedAcceptedImpliesMasterAcceptance: false,
      greenReleaseImpliesFunctionalAcceptance: false,
      installedVersionImpliesSourceModuleAcceptance: false,
      unknownFieldsRemainUnmeasured: true,
      sourceAndMasterCompletionReadinessRemainSeparate: true,
      commsHubIsComplementaryControlPlaneNotChildApplication: true
    }
  };
}

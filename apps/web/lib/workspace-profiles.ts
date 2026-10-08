export const WORKSPACE_PROFILE_CAPABILITIES = [
  "history",
  "sourcePolicy",
  "scheduledJobs",
  "remoteExecution",
  "barcodeIntake",
  "businessIntegrations"
] as const;

export type WorkspaceProfileCapability =
  (typeof WORKSPACE_PROFILE_CAPABILITIES)[number];

export type WorkspaceType = "business" | "personal";

export interface WorkspaceProfileDraft {
  name: string;
  description: string;
  workspaceType: WorkspaceType;
  normalizationFields: string[];
  reviewDimensions: string[];
  capabilities: Record<WorkspaceProfileCapability, boolean>;
}

export interface WorkspaceProfileConfiguration {
  normalizationFields: Array<{
    key: string;
    label: string;
    kind: "text";
    transforms: ["trim", "collapse-whitespace"];
  }>;
  reviewDimensions: Array<{
    key: string;
    label: string;
    required: boolean;
  }>;
  provenancePolicy: {
    requireSourceUrl: true;
    requireRetrievedAt: true;
    retainRawEvidence: false;
  };
  historyPolicy: {
    enabled: boolean;
    identityStrategy: "operator-defined";
    snapshotLimit: 500;
  };
  reviewPolicy: {
    mode: "explicit";
    requireHumanApproval: true;
    allowAutomaticWrites: false;
  };
  templates: Array<{
    id: "default";
    name: "Default extraction";
    fieldKeys: string[];
  }>;
  capabilities: Record<WorkspaceProfileCapability, boolean>;
}

function titleFromKey(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeProfileToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export function normalizeWorkspaceSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function normalizedTokenList(value: unknown, fallback: string[]) {
  const input = Array.isArray(value) ? value : fallback;
  const result: string[] = [];
  for (const item of input.slice(0, 40)) {
    if (typeof item !== "string") continue;
    const key = normalizeProfileToken(item);
    if (key && !result.includes(key)) result.push(key);
  }
  return result.length ? result : fallback;
}

export function defaultCapabilities(
  _workspaceType: WorkspaceType
): Record<WorkspaceProfileCapability, boolean> {
  return {
    history: true,
    sourcePolicy: true,
    scheduledJobs: false,
    remoteExecution: false,
    barcodeIntake: false,
    businessIntegrations: false
  };
}

export function safeCustomProfileDraft(
  workspaceType: WorkspaceType
): WorkspaceProfileDraft {
  return {
    name: workspaceType === "business" ? "Custom business" : "Custom personal",
    description:
      "Conservative custom profile. Enable additional capabilities only after review.",
    workspaceType,
    normalizationFields: ["name", "source_url", "retrieved_at"],
    reviewDimensions: ["identity", "source_evidence", "accuracy"],
    capabilities: defaultCapabilities(workspaceType)
  };
}

export function parseWorkspaceProfileDraft(
  value: unknown,
  options: { fixedWorkspaceType?: WorkspaceType } = {}
): WorkspaceProfileDraft {
  const object =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const name =
    typeof object.name === "string" ? object.name.trim().slice(0, 120) : "";
  if (name.length < 3) throw new Error("workspace_profile_name_invalid");

  const requestedType =
    object.workspaceType === "personal" ? "personal" : "business";
  const workspaceType = options.fixedWorkspaceType ?? requestedType;
  if (
    options.fixedWorkspaceType &&
    object.workspaceType &&
    object.workspaceType !== options.fixedWorkspaceType
  ) {
    throw new Error("workspace_profile_type_immutable");
  }

  const defaults = safeCustomProfileDraft(workspaceType);
  const description =
    typeof object.description === "string" && object.description.trim()
      ? object.description.trim().slice(0, 1000)
      : defaults.description;

  const normalizationFields = normalizedTokenList(
    object.normalizationFields,
    defaults.normalizationFields
  );
  const reviewDimensions = normalizedTokenList(
    object.reviewDimensions,
    defaults.reviewDimensions
  );

  const rawCapabilities =
    object.capabilities &&
    typeof object.capabilities === "object" &&
    !Array.isArray(object.capabilities)
      ? (object.capabilities as Record<string, unknown>)
      : {};

  const capabilities = defaultCapabilities(workspaceType);
  for (const key of WORKSPACE_PROFILE_CAPABILITIES) {
    if (typeof rawCapabilities[key] === "boolean") {
      capabilities[key] = rawCapabilities[key] as boolean;
    }
  }

  return {
    name,
    description,
    workspaceType,
    normalizationFields,
    reviewDimensions,
    capabilities
  };
}

export function buildWorkspaceProfileConfiguration(
  draft: WorkspaceProfileDraft
): WorkspaceProfileConfiguration {
  return {
    normalizationFields: draft.normalizationFields.map((key) => ({
      key,
      label: titleFromKey(key),
      kind: "text",
      transforms: ["trim", "collapse-whitespace"]
    })),
    reviewDimensions: draft.reviewDimensions.map((key) => ({
      key,
      label: titleFromKey(key),
      required: true
    })),
    provenancePolicy: {
      requireSourceUrl: true,
      requireRetrievedAt: true,
      retainRawEvidence: false
    },
    historyPolicy: {
      enabled: draft.capabilities.history,
      identityStrategy: "operator-defined",
      snapshotLimit: 500
    },
    reviewPolicy: {
      mode: "explicit",
      requireHumanApproval: true,
      allowAutomaticWrites: false
    },
    templates: [
      {
        id: "default",
        name: "Default extraction",
        fieldKeys: draft.normalizationFields
      }
    ],
    capabilities: draft.capabilities
  };
}

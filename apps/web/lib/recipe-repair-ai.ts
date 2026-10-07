import {
  DEFAULT_AI_SUGGESTION_MODEL,
  estimateGatewayCost
} from "./ai-suggestions";

export interface RepairRankingCandidate {
  id: string;
  selector: string;
  score: number;
  coverage: number;
  reasons: string[];
  context: string[];
  samples: string[];
}

export interface RepairExplanationRequest {
  workspaceId: string;
  pageUrl: string;
  recipeName: string;
  issue: {
    cause: string;
    label: string;
    currentSelector: string;
    currentCoverage: number | null;
    previousCoverage: number | null;
    context: string[];
  };
  candidates: RepairRankingCandidate[];
}

export interface RepairExplanationResponse {
  summary: string;
  rankings: Array<{
    candidateId: string;
    rank: number;
    confidence: number;
    reason: string;
  }>;
  telemetry: {
    mode: "gateway" | "deterministic-fallback";
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostUsd: number | null;
    actualCostUsd: number | null;
  };
  warnings: string[];
}

function clean(value: unknown, max: number) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

export function parseRepairExplanationRequest(
  value: unknown
): RepairExplanationRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Repair explanation request must be an object.");
  }
  const body = value as Record<string, unknown>;
  const issue =
    body.issue && typeof body.issue === "object" && !Array.isArray(body.issue)
      ? (body.issue as Record<string, unknown>)
      : null;
  if (!issue) throw new Error("Repair issue is required.");

  const workspaceId = clean(body.workspaceId, 80);
  const recipeName = clean(body.recipeName, 160);
  const currentSelector = clean(issue.currentSelector, 800);
  const cause = clean(issue.cause, 80);
  const label = clean(issue.label, 160);
  if (!workspaceId || !recipeName || !cause || !label || !currentSelector) {
    throw new Error("Repair request is missing required bounded metadata.");
  }

  const rawCandidates = Array.isArray(body.candidates)
    ? body.candidates.slice(0, 5)
    : [];
  const candidates = rawCandidates.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const candidate = value as Record<string, unknown>;
    const id = clean(candidate.id, 120);
    const selector = clean(candidate.selector, 800);
    if (!id || !selector) return [];
    return [{
      id,
      selector,
      score: Math.max(0, Math.min(1, numberOrNull(candidate.score) ?? 0)),
      coverage: Math.max(
        0,
        Math.min(1, numberOrNull(candidate.coverage) ?? 0)
      ),
      reasons: Array.isArray(candidate.reasons)
        ? candidate.reasons
            .map((item) => clean(item, 220))
            .filter(Boolean)
            .slice(0, 4)
        : [],
      context: Array.isArray(candidate.context)
        ? candidate.context
            .map((item) => clean(item, 280))
            .filter(Boolean)
            .slice(0, 3)
        : [],
      samples: Array.isArray(candidate.samples)
        ? candidate.samples
            .map((item) => clean(item, 180))
            .filter(Boolean)
            .slice(0, 3)
        : []
    }];
  });
  if (!candidates.length) {
    throw new Error("At least one deterministic repair candidate is required.");
  }

  return {
    workspaceId,
    pageUrl: clean(body.pageUrl, 1000),
    recipeName,
    issue: {
      cause,
      label,
      currentSelector,
      currentCoverage: numberOrNull(issue.currentCoverage),
      previousCoverage: numberOrNull(issue.previousCoverage),
      context: Array.isArray(issue.context)
        ? issue.context
            .map((item) => clean(item, 280))
            .filter(Boolean)
            .slice(0, 3)
        : []
    },
    candidates
  };
}

export function deterministicRepairExplanation(
  request: RepairExplanationRequest
): RepairExplanationResponse {
  const ranked = [...request.candidates].sort(
    (left, right) =>
      right.score - left.score ||
      right.coverage - left.coverage ||
      left.selector.localeCompare(right.selector)
  );

  return {
    summary:
      "Candidates are ranked from deterministic selector coverage, structural proximity and retained selector evidence. No candidate is approved automatically.",
    rankings: ranked.map((candidate, index) => ({
      candidateId: candidate.id,
      rank: index + 1,
      confidence: candidate.score,
      reason:
        candidate.reasons.join("; ") ||
        Math.round(candidate.coverage * 100) +
          "% bounded sample coverage."
    })),
    telemetry: {
      mode: "deterministic-fallback",
      model: "none",
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      actualCostUsd: null
    },
    warnings: [
      "AI ranking is optional. Deterministic ranking remains available without AI credentials."
    ]
  };
}

export const repairExplanationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "rankings"],
  properties: {
    summary: { type: "string", minLength: 1, maxLength: 600 },
    rankings: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["candidateId", "rank", "confidence", "reason"],
        properties: {
          candidateId: { type: "string", minLength: 1, maxLength: 120 },
          rank: { type: "integer", minimum: 1, maximum: 5 },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          reason: { type: "string", minLength: 1, maxLength: 360 }
        }
      }
    }
  }
} as const;

export function sanitizeRepairExplanation(
  value: unknown,
  request: RepairExplanationRequest
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("AI repair explanation was not an object.");
  }
  const record = value as Record<string, unknown>;
  const summary = clean(record.summary, 600);
  const allowed = new Set(request.candidates.map((candidate) => candidate.id));
  const rankings = Array.isArray(record.rankings)
    ? record.rankings
        .slice(0, 5)
        .flatMap((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            return [];
          }
          const ranking = item as Record<string, unknown>;
          const candidateId = clean(ranking.candidateId, 120);
          const rank =
            typeof ranking.rank === "number" &&
            Number.isInteger(ranking.rank) &&
            ranking.rank >= 1 &&
            ranking.rank <= 5
              ? ranking.rank
              : 0;
          const confidence =
            typeof ranking.confidence === "number"
              ? Math.max(0, Math.min(1, ranking.confidence))
              : 0;
          const reason = clean(ranking.reason, 360);
          if (!allowed.has(candidateId) || !rank || !reason) return [];
          return [{ candidateId, rank, confidence, reason }];
        })
    : [];

  if (!summary || !rankings.length) {
    throw new Error("AI repair explanation contained no usable rankings.");
  }

  const unique = new Map(
    rankings.map((ranking) => [ranking.candidateId, ranking])
  );
  return {
    summary,
    rankings: Array.from(unique.values())
      .sort((left, right) => left.rank - right.rank)
      .slice(0, request.candidates.length)
  };
}

export function defaultRepairModel() {
  return (
    process.env.AI_SUGGESTION_MODEL?.trim() ||
    DEFAULT_AI_SUGGESTION_MODEL
  );
}

export { estimateGatewayCost };

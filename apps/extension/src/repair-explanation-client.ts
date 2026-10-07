import { getWorkspaceSyncCredentials } from "./workspace-session";
import type {
  SavedScraper,
  ScraperDriftIssue
} from "./types";

export interface RepairCandidateExplanation {
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

export async function explainRepairCandidates(
  scraper: SavedScraper,
  issue: ScraperDriftIssue
): Promise<RepairCandidateExplanation> {
  if (!issue.candidates.length) {
    throw new Error("This drift issue has no deterministic repair candidates.");
  }

  const credentials = await getWorkspaceSyncCredentials();
  if (scraper.workspaceId !== credentials.workspaceId) {
    throw new Error(
      "Select the workspace that owns this saved scraper before requesting an explanation."
    );
  }

  const response = await fetch(
    new URL("/api/extension/repair-explain", credentials.platformOrigin),
    {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: "Bearer " + credentials.token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        workspaceId: credentials.workspaceId,
        pageUrl: scraper.lastCheck?.url ?? scraper.sourceUrl,
        recipeName: scraper.name,
        issue: {
          cause: issue.cause,
          label: issue.label,
          currentSelector: issue.currentSelector,
          currentCoverage: issue.currentCoverage,
          previousCoverage: issue.previousCoverage,
          context: issue.context.slice(0, 3)
        },
        candidates: issue.candidates.slice(0, 5).map((candidate) => ({
          id: candidate.id,
          selector: candidate.selector,
          score: candidate.score,
          coverage: candidate.coverage,
          reasons: candidate.reasons.slice(0, 4),
          context: candidate.context.slice(0, 3),
          samples: candidate.samples.slice(0, 3)
        }))
      })
    }
  );

  if (response.status === 401) {
    throw new Error("The extension session expired before AI explanation.");
  }
  if (response.status === 403) {
    throw new Error("The current account no longer has access to this workspace.");
  }
  if (!response.ok) {
    let message = "Repair explanation request failed with HTTP " + response.status + ".";
    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body.error === "string" && body.error) message = body.error;
    } catch {
      // Keep the HTTP fallback.
    }
    throw new Error(message);
  }

  return (await response.json()) as RepairCandidateExplanation;
}

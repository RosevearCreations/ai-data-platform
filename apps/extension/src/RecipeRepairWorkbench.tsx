import { useEffect, useMemo, useRef, useState } from "react";

import { recordRecipeRepairInteractionBestEffort } from "./operational-outcomes";
import { explainRepairCandidates } from "./repair-explanation-client";
import { applySavedScraperRepair } from "./saved-scrapers";
import type {
  ExtractionRecipe,
  SavedScraper,
  ScraperCompatibilityReport,
  ScraperDriftIssue,
  ScraperRepairCandidate
} from "./types";

interface RecipeRepairWorkbenchProps {
  scraper: SavedScraper;
  report: ScraperCompatibilityReport;
  onApplyRecipe: (recipe: ExtractionRecipe) => void;
  onRepaired: (scraper: SavedScraper, message: string) => void;
}

function percentage(value: number | null) {
  return value === null ? "—" : Math.round(value * 100) + "%";
}

function causeLabel(issue: ScraperDriftIssue) {
  return issue.cause
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function RecipeRepairWorkbench({
  scraper,
  report,
  onApplyRecipe,
  onRepaired
}: RecipeRepairWorkbenchProps) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [approved, setApproved] = useState(false);
  const [pendingIssue, setPendingIssue] = useState("");
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const lastProposalSignature = useRef("");
  const [explanations, setExplanations] = useState<
    Record<
      string,
      Awaited<ReturnType<typeof explainRepairCandidates>>
    >
  >({});

  useEffect(() => {
    setSelected({});
    setApproved(false);
    setMessage(null);
    setExplanations({});
    lastProposalSignature.current = "";
  }, [report.checkedAt, scraper.id]);

  const selectedRepairs = useMemo(() => {
    const repairs: Array<{
      issue: ScraperDriftIssue;
      candidate: ScraperRepairCandidate;
    }> = [];

    for (const issue of report.issues) {
      const candidateId = selected[issue.id];
      if (!candidateId) continue;
      const candidate = issue.candidates.find(
        (item) => item.id === candidateId
      );
      if (candidate) repairs.push({ issue, candidate });
    }
    return repairs;
  }, [report.issues, selected]);

  useEffect(() => {
    if (!selectedRepairs.length) return;
    const workspaceId = scraper.workspaceId;
    if (!workspaceId) return;

    const signature =
      report.checkedAt +
      "|" +
      selectedRepairs
        .map(({ issue, candidate }) => issue.id + ":" + candidate.id)
        .sort()
        .join("|");

    if (lastProposalSignature.current === signature) return;
    lastProposalSignature.current = signature;

    void recordRecipeRepairInteractionBestEffort({
      workspaceId,
      eventType: "repair-proposed",
      recordId: scraper.id,
      revision: scraper.revision,
      details: {
        issueCount: report.issues.length,
        selectedCount: selectedRepairs.length,
        candidateCount: report.repairCandidateCount,
        reportStatus: report.status
      }
    });
  }, [
    report.checkedAt,
    report.issues.length,
    report.repairCandidateCount,
    report.status,
    scraper.id,
    scraper.revision,
    scraper.workspaceId,
    selectedRepairs
  ]);

  async function explain(issue: ScraperDriftIssue) {
    setPendingIssue(issue.id);
    setMessage(null);
    try {
      const response = await explainRepairCandidates(scraper, issue);
      setExplanations((current) => ({
        ...current,
        [issue.id]: response
      }));
      setMessage(
        response.telemetry.mode === "gateway"
          ? "AI explained/ranked only the deterministic candidates. It did not create or approve a selector."
          : "Deterministic explanation is shown. AI Gateway was unavailable or not configured; no repair capability was lost."
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to explain repair candidates."
      );
    } finally {
      setPendingIssue("");
    }
  }

  async function rejectRepairProposal() {
    if (!selectedRepairs.length) return;
    const workspaceId = scraper.workspaceId;
    if (!workspaceId) {
      setMessage("This legacy scraper is not assigned to a workspace, so no repair telemetry was recorded.");
      return;
    }

    await recordRecipeRepairInteractionBestEffort({
      workspaceId,
      eventType: "repair-rejected",
      recordId: scraper.id,
      revision: scraper.revision,
      details: {
        issueCount: report.issues.length,
        selectedCount: selectedRepairs.length,
        candidateCount: report.repairCandidateCount,
        reportStatus: report.status
      }
    });

    setSelected({});
    setApproved(false);
    lastProposalSignature.current = "";
    setMessage("Proposed repair rejected. No saved-scraper revision was changed.");
  }

  async function applyRepair() {
    if (!approved || !selectedRepairs.length) return;

    setApplying(true);
    setMessage(null);
    try {
      let recordSelector: string | undefined;
      const fieldSelectors: Record<string, string> = {};

      for (const { issue, candidate } of selectedRepairs) {
        if (issue.target === "record") {
          recordSelector = candidate.selector;
        } else if (issue.target === "field" && issue.fieldKey) {
          fieldSelectors[issue.fieldKey] = candidate.selector;
        }
      }

      const updated = await applySavedScraperRepair({
        id: scraper.id,
        recordSelector,
        fieldSelectors
      });

      onApplyRecipe(updated.recipe);
      onRepaired(
        updated,
        "Approved repair created revision " +
          updated.revision +
          ". Scheduled jobs remain pinned to their prior revision and cannot run until Refresh + re-review."
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to create the repaired recipe revision."
      );
    } finally {
      setApplying(false);
    }
  }

  if (!report.issues.length) return null;

  return (
    <div className="repairWorkbench">
      <div className="repairWorkbenchHeader">
        <div>
          <p className="eyebrow">Build 023</p>
          <strong>Recipe drift repair workbench</strong>
        </div>
        <span>
          {report.issues.length} issue
          {report.issues.length === 1 ? "" : "s"} ·{" "}
          {report.repairCandidateCount} candidates
        </span>
      </div>

      <p className="repairIntro">
        Deterministic candidates are bounded to the current page and never
        modify the recipe automatically. Review selector evidence and samples,
        choose repairs, then explicitly approve a new recipe revision.
      </p>

      {report.structuralChanged ? (
        <p className="repairStructuralWarning">
          Structural fingerprint changed from{" "}
          {report.previousStructuralFingerprint ?? "unknown"} to{" "}
          {report.structuralFingerprint}. This is evidence of DOM drift, not
          permission to repair automatically.
        </p>
      ) : null}

      <div className="repairIssues">
        {report.issues.map((issue) => {
          const oldField =
            issue.fieldKey
              ? report.fields.find((field) => field.key === issue.fieldKey)
              : null;
          const explanation = explanations[issue.id];

          return (
            <article className="repairIssue" key={issue.id}>
              <div className="repairIssueTop">
                <div>
                  <span
                    className={
                      "repairSeverity repairSeverity-" + issue.severity
                    }
                  >
                    {issue.severity}
                  </span>
                  <strong>{issue.label}</strong>
                </div>
                <small>{causeLabel(issue)}</small>
              </div>

              <div className="repairOldEvidence">
                <span>Current selector</span>
                <code>{issue.currentSelector || "(empty)"}</code>
                <small>
                  Coverage: {percentage(issue.currentCoverage)}
                  {issue.previousCoverage !== null
                    ? " · previous " +
                      percentage(issue.previousCoverage)
                    : ""}
                </small>
                {oldField?.samples.length ? (
                  <div className="repairSamples">
                    <span>Current samples</span>
                    {oldField.samples.slice(0, 3).map((sample, index) => (
                      <code key={index}>{sample || "∅"}</code>
                    ))}
                  </div>
                ) : null}
                {issue.context.length ? (
                  <div className="repairContext">
                    <span>Bounded structural context</span>
                    {issue.context.map((context) => (
                      <code key={context}>{context}</code>
                    ))}
                  </div>
                ) : null}
              </div>

              {issue.candidates.length ? (
                <>
                  <div className="repairCandidateHeader">
                    <strong>Deterministic candidates</strong>
                    <button
                      disabled={Boolean(pendingIssue) || applying}
                      onClick={() => void explain(issue)}
                      type="button"
                    >
                      {pendingIssue === issue.id
                        ? "Explaining…"
                        : "Explain / rank (optional AI)"}
                    </button>
                  </div>

                  <div className="repairCandidates">
                    {issue.candidates.map((candidate, index) => {
                      const aiRank = explanation?.rankings.find(
                        (ranking) =>
                          ranking.candidateId === candidate.id
                      );
                      return (
                        <label
                          className={
                            "repairCandidate " +
                            (selected[issue.id] === candidate.id
                              ? "repairCandidateSelected"
                              : "")
                          }
                          key={candidate.id}
                        >
                          <input
                            checked={selected[issue.id] === candidate.id}
                            disabled={applying}
                            name={"repair-" + issue.id}
                            onChange={() => {
                              setSelected((current) => ({
                                ...current,
                                [issue.id]: candidate.id
                              }));
                              setApproved(false);
                            }}
                            type="radio"
                          />
                          <div>
                            <div className="repairCandidateTop">
                              <code>{candidate.selector}</code>
                              <strong>
                                #{index + 1} ·{" "}
                                {Math.round(candidate.score * 100)}%
                              </strong>
                            </div>
                            <small>
                              {candidate.matchedRecords} matches ·{" "}
                              {Math.round(candidate.coverage * 100)}% bounded
                              sample coverage
                            </small>
                            <ul>
                              {candidate.reasons.map((reason) => (
                                <li key={reason}>{reason}</li>
                              ))}
                            </ul>
                            {candidate.samples.length ? (
                              <div className="repairSamples">
                                <span>Candidate samples</span>
                                {candidate.samples
                                  .slice(0, 3)
                                  .map((sample, sampleIndex) => (
                                    <code key={sampleIndex}>
                                      {sample || "∅"}
                                    </code>
                                  ))}
                              </div>
                            ) : null}
                            {candidate.context.length ? (
                              <div className="repairContext">
                                {candidate.context.map((context) => (
                                  <code key={context}>{context}</code>
                                ))}
                              </div>
                            ) : null}
                            {aiRank ? (
                              <p className="repairAiReason">
                                AI rank {aiRank.rank} ·{" "}
                                {Math.round(aiRank.confidence * 100)}%:{" "}
                                {aiRank.reason}
                              </p>
                            ) : null}
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {explanation ? (
                    <div className="repairExplanation">
                      <strong>
                        {explanation.telemetry.mode === "gateway"
                          ? "AI explanation"
                          : "Deterministic explanation"}
                      </strong>
                      <p>{explanation.summary}</p>
                      {explanation.warnings.map((warning) => (
                        <small key={warning}>{warning}</small>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="repairNoCandidate">
                  No bounded deterministic selector candidate passed the repair
                  threshold. Adjust the recipe manually; Build 023 will not
                  invent a selector.
                </p>
              )}
            </article>
          );
        })}
      </div>

      {selectedRepairs.length ? (
        <div className="repairApproval">
          <strong>Proposed repair preview</strong>
          <ul>
            {selectedRepairs.map(({ issue, candidate }) => (
              <li key={issue.id}>
                {issue.label}: <code>{issue.currentSelector}</code> →{" "}
                <code>{candidate.selector}</code>
              </li>
            ))}
          </ul>
          <label>
            <input
              checked={approved}
              disabled={applying}
              onChange={(event) => setApproved(event.target.checked)}
              type="checkbox"
            />
            <span>
              I reviewed the old/new selectors, bounded structural evidence and
              sample comparison. Create a new saved-scraper revision with only
              the selected repairs.
            </span>
          </label>
          <div className="heroActions">
            <button
              disabled={applying}
              onClick={() => void rejectRepairProposal()}
              type="button"
            >
              Reject proposed repair
            </button>
            <button
              className="repairApproveButton"
              disabled={!approved || applying}
              onClick={() => void applyRepair()}
              type="button"
            >
              {applying ? "Creating repair revision…" : "Approve repair revision"}
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className="repairMessage" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

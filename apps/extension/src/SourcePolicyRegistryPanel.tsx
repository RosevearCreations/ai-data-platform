import { useEffect, useMemo, useState } from "react";

import {
  evaluateSourcePolicyEntry,
  listWorkspaceSourcePolicies,
  normalizeSourcePolicyOrigin,
  setSourcePolicyStatus,
  upsertSourcePolicy
} from "./source-policy-registry";
import { getActiveWorkspaceId } from "./workspace-session";
import type {
  SourcePolicyCollectionMethod,
  SourcePolicyDataSensitivity,
  SourcePolicyEntry,
  SourcePolicyRobotsDecision,
  SourcePolicyStatus
} from "./types";

function defaultOrigin() {
  return "";
}

export function SourcePolicyRegistryPanel() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [entries, setEntries] = useState<SourcePolicyEntry[]>([]);
  const [origin, setOrigin] = useState(defaultOrigin());
  const [displayName, setDisplayName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [collectionMethod, setCollectionMethod] =
    useState<SourcePolicyCollectionMethod>("public-webpage");
  const [publicOrAuthorized, setPublicOrAuthorized] = useState(false);
  const [termsReviewed, setTermsReviewed] = useState(false);
  const [termsUrl, setTermsUrl] = useState("");
  const [robotsDecision, setRobotsDecision] =
    useState<SourcePolicyRobotsDecision>("unknown");
  const [robotsUrl, setRobotsUrl] = useState("");
  const [noAccessControlBypass, setNoAccessControlBypass] = useState(false);
  const [dataSensitivity, setDataSensitivity] =
    useState<SourcePolicyDataSensitivity>("public-facts");
  const [minimumDelayMs, setMinimumDelayMs] = useState(1500);
  const [maxPagesPerRun, setMaxPagesPerRun] = useState(10);
  const [maxRecordsPerRun, setMaxRecordsPerRun] = useState(500);
  const [reviewDays, setReviewDays] = useState(90);
  const [policyStatus, setPolicyStatus] =
    useState<SourcePolicyStatus>("review-required");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const active = await getActiveWorkspaceId();
    setWorkspaceId(active);
    setEntries(await listWorkspaceSourcePolicies(active));
  }

  useEffect(() => {
    void refresh().catch(() => undefined);
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName === "local" && Object.keys(changes).length) {
        void refresh().catch(() => undefined);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const approvedCount = useMemo(
    () => entries.filter((entry) => evaluateSourcePolicyEntry(entry).allowed).length,
    [entries]
  );

  async function useActiveTabOrigin() {
    setMessage(null);
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });
      if (!tab?.url) throw new Error("The active tab does not have a usable URL.");
      const normalized = normalizeSourcePolicyOrigin(tab.url);
      setOrigin(normalized);
      setDisplayName((current) => current || new URL(normalized).hostname);
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "Unable to read the active tab origin."
      );
    }
  }

  function edit(entry: SourcePolicyEntry) {
    setOrigin(entry.origin);
    setDisplayName(entry.displayName);
    setPurpose(entry.purpose);
    setCollectionMethod(entry.collectionMethod);
    setPublicOrAuthorized(entry.publicOrAuthorized);
    setTermsReviewed(entry.termsReviewed);
    setTermsUrl(entry.termsUrl);
    setRobotsDecision(entry.robotsDecision);
    setRobotsUrl(entry.robotsUrl);
    setNoAccessControlBypass(entry.noAccessControlBypass);
    setDataSensitivity(entry.dataSensitivity);
    setMinimumDelayMs(entry.minimumDelayMs);
    setMaxPagesPerRun(entry.maxPagesPerRun);
    setMaxRecordsPerRun(entry.maxRecordsPerRun);
    const remaining = Math.max(
      1,
      Math.ceil((Date.parse(entry.reviewExpiresAt) - Date.now()) / 86400000)
    );
    setReviewDays(Math.min(365, remaining));
    setPolicyStatus(entry.status);
    setNotes(entry.notes);
    setMessage("Loaded " + entry.origin + " revision " + entry.revision + " for review.");
  }

  async function save() {
    setPending(true);
    setMessage(null);
    try {
      const entry = await upsertSourcePolicy({
        origin,
        displayName,
        purpose,
        collectionMethod,
        publicOrAuthorized,
        termsReviewed,
        termsUrl,
        robotsDecision,
        robotsUrl,
        noAccessControlBypass,
        dataSensitivity,
        minimumDelayMs,
        maxPagesPerRun,
        maxRecordsPerRun,
        reviewDays,
        status: policyStatus,
        notes
      });
      const evaluation = evaluateSourcePolicyEntry(entry);
      await refresh();
      setMessage(
        evaluation.allowed
          ? "Source policy approved as revision " +
              entry.revision +
              ". Scheduled jobs can now pin this exact policy fingerprint."
          : "Source policy saved as revision " +
              entry.revision +
              ", but it is not runnable: " +
              evaluation.reasons.join(" ")
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "Unable to save source policy."
      );
    } finally {
      setPending(false);
    }
  }

  async function changeStatus(entry: SourcePolicyEntry, status: SourcePolicyStatus) {
    setPending(true);
    setMessage(null);
    try {
      const updated = await setSourcePolicyStatus(entry.id, status);
      await refresh();
      setMessage(
        "Source policy moved to " +
          updated.status +
          " at revision " +
          updated.revision +
          ". Existing scheduled jobs pinned to the prior fingerprint now require re-review."
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "Unable to update source policy."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="sourcePolicyRegistry">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Build 025</p>
          <h2>Source policy registry & crawl governance</h2>
        </div>
        <span className="sourcePolicyBadge">
          {approvedCount}/{entries.length} approved
        </span>
      </div>

      <p className="sourcePolicyIntro">
        Register each recurring source once per workspace. Scheduling is allowed
        only while the exact policy revision is approved, unexpired and matched
        to the saved scraper origin. Policy changes invalidate older job approvals.
      </p>

      {!workspaceId ? (
        <p className="sourcePolicyWarning">
          Connect the extension and select an authorized workspace before saving source policies.
        </p>
      ) : null}

      <div className="sourcePolicyEditor">
        <div className="sourcePolicyOriginRow">
          <label>
            Source URL / origin
            <input
              disabled={pending}
              onChange={(event) => setOrigin(event.target.value)}
              placeholder="https://example.com"
              value={origin}
            />
          </label>
          <button disabled={pending} onClick={useActiveTabOrigin} type="button">
            Use active tab
          </button>
        </div>

        <div className="sourcePolicyGrid">
          <label>
            Source name
            <input
              disabled={pending}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Supplier site or dataset"
              value={displayName}
            />
          </label>
          <label>
            Collection method
            <select
              disabled={pending}
              onChange={(event) =>
                setCollectionMethod(event.target.value as SourcePolicyCollectionMethod)
              }
              value={collectionMethod}
            >
              <option value="official-api">Official API</option>
              <option value="official-dataset">Official dataset/feed</option>
              <option value="user-export">User-authorized export/file</option>
              <option value="public-webpage">Public webpage</option>
            </select>
          </label>
          <label>
            Robots/crawl decision
            <select
              disabled={pending}
              onChange={(event) =>
                setRobotsDecision(event.target.value as SourcePolicyRobotsDecision)
              }
              value={robotsDecision}
            >
              <option value="allowed">Allowed</option>
              <option value="disallowed">Disallowed</option>
              <option value="not-applicable">Not applicable</option>
              <option value="unknown">Unknown / needs review</option>
            </select>
          </label>
          <label>
            Data sensitivity
            <select
              disabled={pending}
              onChange={(event) =>
                setDataSensitivity(event.target.value as SourcePolicyDataSensitivity)
              }
              value={dataSensitivity}
            >
              <option value="public-facts">Public facts</option>
              <option value="user-authorized">User-authorized data</option>
              <option value="restricted">Restricted/private — block crawler use</option>
            </select>
          </label>
          <label>
            Minimum delay (ms)
            <input
              disabled={pending}
              min={500}
              onChange={(event) => setMinimumDelayMs(Number(event.target.value))}
              type="number"
              value={minimumDelayMs}
            />
          </label>
          <label>
            Max pages / run
            <input
              disabled={pending}
              max={50}
              min={1}
              onChange={(event) => setMaxPagesPerRun(Number(event.target.value))}
              type="number"
              value={maxPagesPerRun}
            />
          </label>
          <label>
            Max records / run
            <input
              disabled={pending}
              max={5000}
              min={1}
              onChange={(event) => setMaxRecordsPerRun(Number(event.target.value))}
              type="number"
              value={maxRecordsPerRun}
            />
          </label>
          <label>
            Review valid for days
            <input
              disabled={pending}
              max={365}
              min={1}
              onChange={(event) => setReviewDays(Number(event.target.value))}
              type="number"
              value={reviewDays}
            />
          </label>
          <label>
            Registry status
            <select
              disabled={pending}
              onChange={(event) =>
                setPolicyStatus(event.target.value as SourcePolicyStatus)
              }
              value={policyStatus}
            >
              <option value="approved">Approved for bounded use</option>
              <option value="review-required">Review required</option>
              <option value="blocked">Blocked</option>
            </select>
          </label>
        </div>

        <label>
          Collection purpose
          <textarea
            disabled={pending}
            onChange={(event) => setPurpose(event.target.value)}
            placeholder="What factual data are we collecting and why?"
            rows={2}
            value={purpose}
          />
        </label>

        <label>
          Terms / policy evidence URL
          <input
            disabled={pending}
            onChange={(event) => setTermsUrl(event.target.value)}
            placeholder="Optional URL to applicable terms/API policy"
            value={termsUrl}
          />
        </label>

        <label>
          Robots / crawl evidence URL
          <input
            disabled={pending}
            onChange={(event) => setRobotsUrl(event.target.value)}
            placeholder="Optional robots.txt or crawl-policy URL"
            value={robotsUrl}
          />
        </label>

        <div className="sourcePolicyChecks">
          <label>
            <input
              checked={publicOrAuthorized}
              disabled={pending}
              onChange={(event) => setPublicOrAuthorized(event.target.checked)}
              type="checkbox"
            />
            <span>The source is public or we are explicitly authorized to access it.</span>
          </label>
          <label>
            <input
              checked={termsReviewed}
              disabled={pending}
              onChange={(event) => setTermsReviewed(event.target.checked)}
              type="checkbox"
            />
            <span>Applicable source terms/API conditions were reviewed.</span>
          </label>
          <label>
            <input
              checked={noAccessControlBypass}
              disabled={pending}
              onChange={(event) => setNoAccessControlBypass(event.target.checked)}
              type="checkbox"
            />
            <span>No login, paywall, CAPTCHA, ban or technical access control must be bypassed.</span>
          </label>
        </div>

        <textarea
          disabled={pending}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Policy notes, approved paths, exclusions, cadence or evidence"
          rows={3}
          value={notes}
        />

        <button
          className="sourcePolicySave"
          disabled={pending || !workspaceId || !origin.trim() || !purpose.trim()}
          onClick={save}
          type="button"
        >
          {pending ? "Saving policy…" : "Save source policy revision"}
        </button>
      </div>

      <div className="sourcePolicyListHeader">
        <strong>Registered sources</strong>
        <span>{entries.length} in active workspace</span>
      </div>

      {entries.length ? (
        <div className="sourcePolicyList">
          {entries.map((entry) => {
            const evaluation = evaluateSourcePolicyEntry(entry);
            return (
              <article key={entry.id}>
                <div className="sourcePolicyTop">
                  <div>
                    <span
                      className={
                        "sourcePolicyState " +
                        (evaluation.allowed
                          ? "sourcePolicyState-approved"
                          : entry.status === "blocked"
                            ? "sourcePolicyState-blocked"
                            : "sourcePolicyState-review")
                      }
                    >
                      {evaluation.allowed ? "approved" : entry.status}
                    </span>
                    <strong>{entry.displayName || entry.origin}</strong>
                  </div>
                  <small>r{entry.revision}</small>
                </div>
                <span className="sourcePolicyOrigin">{entry.origin}</span>
                <small>
                  {entry.collectionMethod} · {entry.dataSensitivity} · min{" "}
                  {entry.minimumDelayMs} ms · {entry.maxPagesPerRun} pages ·{" "}
                  {entry.maxRecordsPerRun} records
                </small>
                <small>
                  Review expires {new Date(entry.reviewExpiresAt).toLocaleDateString()} ·{" "}
                  fingerprint {entry.fingerprint}
                </small>
                {evaluation.reasons.length ? (
                  <p className="sourcePolicyWarning">{evaluation.reasons.join(" ")}</p>
                ) : null}
                {evaluation.warnings.length ? (
                  <p className="sourcePolicyCaution">{evaluation.warnings.join(" ")}</p>
                ) : null}
                <div className="sourcePolicyActions">
                  <button disabled={pending} onClick={() => edit(entry)} type="button">
                    Edit / renew
                  </button>
                  <button
                    disabled={pending || entry.status === "review-required"}
                    onClick={() => changeStatus(entry, "review-required")}
                    type="button"
                  >
                    Require review
                  </button>
                  <button
                    disabled={pending || entry.status === "blocked"}
                    onClick={() => changeStatus(entry, "blocked")}
                    type="button"
                  >
                    Block
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="sourcePolicyEmpty">
          No source policies yet. Use the active tab origin, document the purpose and evidence, then approve only if the governance checks are satisfied.
        </p>
      )}

      {message ? <p className="sourcePolicyMessage">{message}</p> : null}
    </section>
  );
}

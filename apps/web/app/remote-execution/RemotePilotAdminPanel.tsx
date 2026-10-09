"use client";

import { useState } from "react";

import { HelpInfo } from "../help/HelpInfo";

type Candidate = {
  id: string;
  origin: string;
  revision: number;
  fingerprint: string;
  displayName: string;
  maxRecordsPerRun: number;
};

type WorkspaceModel = {
  id: string;
  name: string;
  role: string;
  control: {
    enabled: boolean;
    killSwitch: boolean;
    region: "us-east" | "us-west" | "eu-uk" | "eu-ams";
  } | null;
  allowlist: Array<{
    sourceOrigin: string;
    policyId: string;
    policyRevision: number;
    policyFingerprint: string;
    enabled: boolean;
    maxRecords: number;
    maxRuntimeSeconds: number;
    maxUnitsPerRun: number;
  }>;
  candidates: Candidate[];
};

async function jsonRequest(url: string, method: string, body: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string" ? payload.error : "Request failed."
    );
  }
  return payload;
}

export function RemotePilotAdminPanel({
  workspaces
}: {
  workspaces: WorkspaceModel[];
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function act(key: string, operation: () => Promise<unknown>) {
    setBusy(key);
    setMessage("");
    try {
      await operation();
      setMessage("Saved. Reloading current remote-pilot evidence.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section aria-labelledby="pilot-admin-heading">
      <div className="sectionHeading">
        <p className="eyebrow">Controlled pilot</p>
        <h2 id="pilot-admin-heading">Workspace controls</h2>
        <HelpInfo topic="remote-controls" />
      </div>

      {message ? <p className="barcodeMessage">{message}</p> : null}

      <div className="grid">
        {workspaces.map((workspace) => {
          const control = workspace.control;
          const admin = workspace.role === "owner" || workspace.role === "admin";
          return (
            <article className="card" key={workspace.id}>
              <h3>{workspace.name}</h3>
              <p>
                {control
                  ? `Browserless · ${control.region} · ${control.killSwitch ? "KILLED" : control.enabled ? "armed" : "disabled"}`
                  : "No workspace pilot control exists yet."}
              </p>

              {admin ? (
                <div className="heroActions">
                  <button
                    className="secondaryButton"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      act("arm-" + workspace.id, () =>
                        jsonRequest("/api/remote-execution/control", "PATCH", {
                          workspaceId: workspace.id,
                          enabled: true,
                          killSwitch: false,
                          region: control?.region ?? "us-east",
                          maxUnitsPerRun: 2
                        })
                      )
                    }
                  >
                    {busy === "arm-" + workspace.id ? "Saving…" : "Arm workspace pilot"}
                  </button>
                  <button
                    className="secondaryButton"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      act("kill-" + workspace.id, () =>
                        jsonRequest("/api/remote-execution/control", "PATCH", {
                          workspaceId: workspace.id,
                          enabled: false,
                          killSwitch: true,
                          region: control?.region ?? "us-east",
                          maxUnitsPerRun: 2
                        })
                      )
                    }
                  >
                    {busy === "kill-" + workspace.id ? "Stopping…" : "Kill remote execution"}
                  </button>
                </div>
              ) : null}

              <p>
                Allowlisted: {workspace.allowlist.filter((item) => item.enabled).length}
                {" · "}Approved public-source candidates: {workspace.candidates.length}
              </p>

              {admin
                ? workspace.candidates.map((candidate) => {
                    const allowed = workspace.allowlist.find(
                      (item) => item.sourceOrigin === candidate.origin && item.enabled
                    );
                    return (
                      <div key={candidate.id}>
                        <strong>{candidate.displayName}</strong>
                        <p>{candidate.origin}</p>
                        <div className="heroActions">
                          {!allowed ? (
                            <button
                              className="secondaryButton"
                              disabled={Boolean(busy)}
                              onClick={() =>
                                act(
                                  "allow-" + workspace.id + "-" + candidate.id,
                                  () =>
                                    jsonRequest(
                                      "/api/remote-execution/allowlist",
                                      "POST",
                                      {
                                        workspaceId: workspace.id,
                                        sourceUrl: candidate.origin + "/",
                                        policyId: candidate.id,
                                        policyRevision: candidate.revision,
                                        policyFingerprint: candidate.fingerprint,
                                        maxRecords: Math.min(
                                          candidate.maxRecordsPerRun,
                                          100
                                        ),
                                        maxRuntimeSeconds: 60,
                                        maxUnitsPerRun: 2
                                      }
                                    )
                                )
                              }
                            >
                              Allowlist direct pilot
                            </button>
                          ) : (
                            <button
                              className="secondaryButton"
                              disabled={Boolean(busy)}
                              onClick={() =>
                                act(
                                  "run-" + workspace.id + "-" + candidate.id,
                                  () =>
                                    jsonRequest(
                                      "/api/remote-execution/pilot",
                                      "POST",
                                      {
                                        workspaceId: workspace.id,
                                        sourceUrl: candidate.origin + "/",
                                        policyId: candidate.id,
                                        policyRevision: candidate.revision,
                                        policyFingerprint: candidate.fingerprint
                                      }
                                    )
                                )
                              }
                            >
                              Run one-page pilot
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

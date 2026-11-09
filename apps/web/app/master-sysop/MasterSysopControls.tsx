"use client";

import { useState } from "react";
import type { FormEvent } from "react";

type Destination = {
  key: string;
  displayName: string;
  state: string;
  handoffAllowed: boolean;
  destinationAuthenticationRequired: boolean;
  destinationAuthorizationGranted: boolean;
  tenantContext: {
    state: string;
    workspaceName: string | null;
    workspaceRole: string | null;
  };
};

type Member = {
  userId: string;
  name: string;
  email: string;
  role: "owner" | "operator";
  active: boolean;
};

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/master-sysop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error ?? "master_sysop_operation_failed");
  }
  return result;
}

export function MasterSysopControls({
  activeSysop,
  claimEligible,
  sysopRole,
  destinations,
  members
}: {
  activeSysop: boolean;
  claimEligible: boolean;
  sysopRole: "owner" | "operator" | null;
  destinations: Destination[];
  members: Member[];
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [launches, setLaunches] = useState<
    Record<string, { url: string; expiresAt: string }>
  >({});

  async function run(
    key: string,
    body: Record<string, unknown>,
    reload = false
  ) {
    setBusy(key);
    setMessage(null);
    try {
      const result = await post(body);
      if (
        body.action === "prepare-handoff" &&
        result.prepared === true &&
        typeof result.launchUrl === "string"
      ) {
        setLaunches((current) => ({
          ...current,
          [String(body.destinationKey)]: {
            url: result.launchUrl,
            expiresAt: String(result.expiresAt)
          }
        }));
        setMessage(
          result.destinationReauthenticationRequired
            ? "Handoff prepared. The destination must authenticate and authorize this session independently."
            : "Internal Master Shell navigation is ready."
        );
      } else if (
        body.action === "prepare-handoff" &&
        result.prepared === false
      ) {
        setMessage(
          "Handoff remains fail-closed: " + String(result.state)
        );
      } else {
        setMessage("Recorded successfully.");
        if (reload) window.location.reload();
      }
      return result;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "master_sysop_operation_failed"
      );
      return null;
    } finally {
      setBusy(null);
    }
  }

  if (!activeSysop) {
    return (
      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Master Sysop authority</p>
            <h2>Outer shell access</h2>
          </div>
        </div>
        <article className="reviewBatchSummary">
          <p>
            This authenticated account is not an active Master Sysop.
            Tenant owner/admin membership alone does not grant outer-shell
            authority.
          </p>
          {claimEligible ? (
            <button
              className="primaryButton"
              disabled={busy !== null}
              onClick={() =>
                void run("claim", { action: "claim" }, true)
              }
            >
              {busy === "claim"
                ? "Claiming…"
                : "Claim initial Master Sysop owner"}
            </button>
          ) : (
            <p>
              An active Master Sysop owner must enroll this separately
              authenticated account.
            </p>
          )}
          {message ? <p role="status">{message}</p> : null}
        </article>
      </section>
    );
  }

  return (
    <>
      <section className="reviewQueue">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Context handoff</p>
            <h2>Open a destination without granting authority</h2>
          </div>
        </div>
        <div className="sysopDestinationGrid">
          {destinations.map((destination) => {
            const launch = launches[destination.key];
            return (
              <article
                className="reviewBatchSummary"
                key={destination.key}
              >
                <span className="reviewStatus">
                  {destination.state}
                </span>
                <h3>{destination.displayName}</h3>
                <p>
                  Tenant context:{" "}
                  <strong>{destination.tenantContext.state}</strong>
                  {destination.tenantContext.workspaceName
                    ? " · " +
                      destination.tenantContext.workspaceName +
                      " · " +
                      destination.tenantContext.workspaceRole
                    : ""}
                </p>
                <p>
                  Destination authentication required{" "}
                  <strong>
                    {destination.destinationAuthenticationRequired
                      ? "yes"
                      : "no"}
                  </strong>{" "}
                  · destination authorization granted{" "}
                  <strong>no</strong>
                </p>
                <button
                  className="secondaryButton"
                  type="button"
                  disabled={
                    busy !== null || !destination.handoffAllowed
                  }
                  onClick={() =>
                    void run(
                      "handoff:" + destination.key,
                      {
                        action: "prepare-handoff",
                        destinationKey: destination.key
                      }
                    )
                  }
                >
                  {busy === "handoff:" + destination.key
                    ? "Preparing…"
                    : destination.handoffAllowed
                      ? "Prepare handoff"
                      : "Handoff unavailable"}
                </button>
                {launch ? (
                  <p>
                    <a
                      className="primaryButton"
                      href={launch.url}
                      rel="noreferrer"
                    >
                      Open destination
                    </a>
                    <br />
                    <small>
                      Context expires {launch.expiresAt}. It carries no
                      login or authorization.
                    </small>
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
        {message ? <p role="status">{message}</p> : null}
      </section>

      {sysopRole === "owner" ? (
        <section className="reviewQueue">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">Separate Sysop accounts</p>
              <h2>Enroll an existing authenticated user</h2>
            </div>
          </div>
          <form
            className="reviewBatchSummary"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              void run(
                "grant",
                {
                  action: "grant",
                  email: data.get("email"),
                  role: data.get("role"),
                  note: data.get("note")
                },
                true
              );
            }}
          >
            <label>
              Exact account email
              <input type="email" name="email" required />
            </label>
            <label>
              Master Sysop role
              <select name="role" defaultValue="operator">
                <option value="operator">operator</option>
                <option value="owner">owner</option>
              </select>
            </label>
            <label>
              Note
              <input
                name="note"
                defaultValue="Build 341 separate authenticated Sysop enrollment."
              />
            </label>
            <button
              className="primaryButton"
              disabled={busy !== null}
              type="submit"
            >
              {busy === "grant"
                ? "Enrolling…"
                : "Enroll existing account"}
            </button>
          </form>

          <div className="reviewBatchList">
            {members.map((member) => (
              <article
                className="reviewBatchSummary"
                key={member.userId}
              >
                <span className="reviewStatus">
                  {member.active ? "ACTIVE" : "REVOKED"} ·{" "}
                  {member.role}
                </span>
                <h3>{member.name}</h3>
                <p>{member.email}</p>
                {member.active ? (
                  <button
                    className="secondaryButton"
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      void run(
                        "revoke:" + member.userId,
                        {
                          action: "revoke",
                          userId: member.userId
                        },
                        true
                      )
                    }
                  >
                    {busy === "revoke:" + member.userId
                      ? "Revoking…"
                      : "Revoke Sysop"}
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

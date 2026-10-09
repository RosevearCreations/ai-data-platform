"use client";

import { useState } from "react";

type Batch = {
  id: string;
  target: "rosie-dazzlers" | "devil-n-dove";
  status: "approved" | "exported";
  approvedAt: string | null;
};

type WorkspaceModel = {
  id: string;
  name: string;
  role: string;
  batches: Batch[];
};

type ConsumerReadiness = {
  target: "rosie-dazzlers" | "devil-n-dove";
  configured: boolean;
  endpointOrigin: string | null;
  urlName: string;
  tokenName: string;
};

async function postJson(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload && typeof payload.error === "string"
        ? payload.error
        : "Request failed.";
    throw new Error(message);
  }
  return payload as Record<string, unknown>;
}

export function IntegrationDeliveryPanel({
  workspaces,
  consumers
}: {
  workspaces: WorkspaceModel[];
  consumers: ConsumerReadiness[];
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function run(
    kind: "conformance" | "probe" | "deliver",
    workspaceId: string,
    batch: Batch
  ) {
    const key = kind + ":" + workspaceId + ":" + batch.id;
    setBusy(key);
    setMessage("");
    try {
      const payload =
        kind === "conformance"
          ? await postJson("/api/integrations/consumer-conformance", {
              workspaceId,
              target: batch.target,
              batchId: batch.id
            })
          : await postJson("/api/integrations/delivery", {
              workspaceId,
              target: batch.target,
              batchId: batch.id,
              action: kind === "probe" ? "probe" : "deliver"
            });
      setMessage(
        kind === "conformance"
          ? "Conformance receiver recorded " + String(payload.status ?? "accepted") + "."
          : kind === "probe"
            ? "Consumer handshake accepted."
            : "Live consumer dry-run acknowledgement accepted."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Integration delivery failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="stack">
      {message ? <div className="notice">{message}</div> : null}
      {workspaces.map((workspace) => (
        <section key={workspace.id}>
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">{workspace.role} workspace</p>
              <h2>{workspace.name}</h2>
            </div>
          </div>
          {workspace.batches.length ? (
            <div className="grid">
              {workspace.batches.map((batch) => {
                const consumer = consumers.find((item) => item.target === batch.target);
                const conformanceKey =
                  "conformance:" + workspace.id + ":" + batch.id;
                const probeKey = "probe:" + workspace.id + ":" + batch.id;
                const deliveryKey = "deliver:" + workspace.id + ":" + batch.id;
                return (
                  <article className="card" key={batch.id}>
                    <h3>{batch.target}</h3>
                    <p>
                      {batch.id} · {batch.status}
                      {batch.approvedAt ? " · approved " + new Date(batch.approvedAt).toLocaleString() : ""}
                    </p>
                    <p>
                      External consumer:{" "}
                      {consumer?.configured
                        ? "configured at " + consumer.endpointOrigin
                        : "not configured — fail closed"}
                    </p>
                    <div className="heroActions">
                      <button
                        className="secondaryButton"
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => void run("conformance", workspace.id, batch)}
                      >
                        {busy === conformanceKey ? "Checking…" : "Run conformance"}
                      </button>
                      <button
                        className="secondaryButton"
                        type="button"
                        disabled={Boolean(busy) || !consumer?.configured}
                        onClick={() => void run("probe", workspace.id, batch)}
                      >
                        {busy === probeKey ? "Probing…" : "Test handshake"}
                      </button>
                      <button
                        className="primaryLink"
                        type="button"
                        disabled={Boolean(busy) || !consumer?.configured}
                        onClick={() => void run("deliver", workspace.id, batch)}
                      >
                        {busy === deliveryKey ? "Sending…" : "Send dry-run"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="emptyState">
              <p>No approved/exported integration batch is available for delivery.</p>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

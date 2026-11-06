"use client";

import { useMemo, useState } from "react";

const businessApplications = [
  "devilndove",
  "rosiedazzlers",
  "yard-workers",
  "icamp"
] as const;

const itemKinds = [
  "product",
  "service",
  "package",
  "addon",
  "campsite",
  "amenity",
  "rental"
] as const;

type Model = {
  workspaces: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  items: Array<{
    itemId: string;
    workspaceId: string;
    sourceApplicationId: string;
    canonicalTenantKey: string;
    sourceRecordId: string;
    sourceRecordVersion: string | null;
    itemKind: string;
    contractId: string;
    contractVersion: string;
    portableRecord: Record<string, unknown>;
    contentSha256: string;
    recordedAt: string;
  }>;
  packages: Array<{
    packageId: string;
    workspaceId: string;
    sourceItemId: string;
    sourceApplicationId: string;
    sourceRecordId: string;
    itemKind: string;
    itemName: string;
    destinationApplicationId: string;
    destinationTenantKey: string;
    contractId: string;
    contractVersion: string;
    payloadSha256: string;
    state: "held";
    holdReason: "catalogue-exchange-not-authorized";
    reviewDecision: "approve" | "reject" | null;
    reviewReason: string | null;
    reviewedAt: string | null;
    createdAt: string;
  }>;
  summary: {
    items: number;
    heldPackages: number;
    pendingReviews: number;
    approvedForFutureTransport: number;
    rejected: number;
  };
  policy: {
    build286ContractsReused: boolean;
    productContractId: string;
    serviceContractId: string;
    campgroundKindsUseServiceContract: boolean;
    packageState: string;
    outboundNetworkRequests: boolean;
    peerApplicationWrites: boolean;
    automaticDispatch: boolean;
    ownerAdminReviewRequired: boolean;
    ql266Resumed: boolean;
  };
};

export function CatalogueExchangeConsole({
  model
}: {
  model: Model;
}) {
  const adminWorkspaces = useMemo(
    () =>
      model.workspaces.filter(
        (workspace) =>
          workspace.role === "owner" ||
          workspace.role === "admin"
      ),
    [model.workspaces]
  );

  const [workspaceId, setWorkspaceId] = useState(
    adminWorkspaces[0]?.id ?? ""
  );
  const [sourceApplicationId, setSourceApplicationId] =
    useState<(typeof businessApplications)[number]>(
      "devilndove"
    );
  const [canonicalTenantKey, setCanonicalTenantKey] =
    useState("");
  const [sourceRecordId, setSourceRecordId] = useState("");
  const [sourceRecordVersion, setSourceRecordVersion] =
    useState("");
  const [itemKind, setItemKind] =
    useState<(typeof itemKinds)[number]>("product");
  const [updatedAt, setUpdatedAt] = useState(
    new Date().toISOString()
  );
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [priceCad, setPriceCad] = useState("");
  const [durationMinutes, setDurationMinutes] =
    useState("");
  const [serviceAreas, setServiceAreas] = useState("");

  const [sourceItemId, setSourceItemId] = useState(
    model.items[0]?.itemId ?? ""
  );
  const [destinationApplicationId, setDestinationApplicationId] =
    useState<(typeof businessApplications)[number]>(
      "rosiedazzlers"
    );
  const [destinationTenantKey, setDestinationTenantKey] =
    useState("");

  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [reasons, setReasons] =
    useState<Record<string, string>>({});

  async function post(body: Record<string, unknown>) {
    const response = await fetch("/api/catalogue-exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        typeof payload.error === "string"
          ? payload.error
          : "Catalogue exchange request failed."
      );
    }
    return payload;
  }

  async function recordItem() {
    setBusy("record");
    setMessage("");
    try {
      await post({
        action: "record-item",
        workspaceId,
        sourceApplicationId,
        canonicalTenantKey,
        sourceRecordId,
        sourceRecordVersion,
        itemKind,
        updatedAt,
        sku,
        name,
        description,
        category,
        status,
        priceCad,
        durationMinutes,
        serviceAreas
      });
      setMessage(
        "Catalogue record normalized into the shared contract. Reloading."
      );
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Catalogue item failed."
      );
    } finally {
      setBusy("");
    }
  }

  async function preparePackage() {
    setBusy("package");
    setMessage("");
    try {
      await post({
        action: "prepare-package",
        sourceItemId,
        destinationApplicationId,
        destinationTenantKey
      });
      setMessage(
        "Exchange package prepared in HELD state. No external request was made. Reloading."
      );
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Exchange package failed."
      );
    } finally {
      setBusy("");
    }
  }

  async function reviewPackage(
    packageId: string,
    decision: "approve" | "reject"
  ) {
    setBusy(packageId + ":" + decision);
    setMessage("");
    try {
      await post({
        action: "review-package",
        packageId,
        decision,
        reason: reasons[packageId] ?? ""
      });
      setMessage(
        decision === "approve"
          ? "Package approved for possible future transport, but it remains HELD. Reloading."
          : "Package rejected with immutable review evidence. Reloading."
      );
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Package review failed."
      );
    } finally {
      setBusy("");
    }
  }

  const pendingPackages = model.packages.filter(
    (item) => item.reviewDecision === null
  );

  return (
    <>
      {message ? (
        <p className="barcodeMessage" role="status">
          {message}
        </p>
      ) : null}

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Catalogue standing</p>
            <h2>Normalized exchange evidence</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article>
            <strong>{model.summary.items}</strong>
            <span>normalized items</span>
          </article>
          <article>
            <strong>{model.summary.heldPackages}</strong>
            <span>held packages</span>
          </article>
          <article>
            <strong>{model.summary.pendingReviews}</strong>
            <span>pending reviews</span>
          </article>
          <article>
            <strong>
              {model.summary.approvedForFutureTransport}
            </strong>
            <span>approved, still held</span>
          </article>
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Source catalogue intake</p>
            <h2>Normalize a product or service record</h2>
          </div>
        </div>
        <div className="card">
          <p>
            Product records use the shared product v1 contract.
            Services, packages, add-ons, campsites, amenities and
            rentals use the shared service v1 contract.
          </p>
          {adminWorkspaces.length ? (
            <div className="formGrid">
              <label>
                Workspace
                <select
                  value={workspaceId}
                  onChange={(event) =>
                    setWorkspaceId(event.target.value)
                  }
                >
                  {adminWorkspaces.map((workspace) => (
                    <option
                      key={workspace.id}
                      value={workspace.id}
                    >
                      {workspace.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Source application
                <select
                  value={sourceApplicationId}
                  onChange={(event) =>
                    setSourceApplicationId(
                      event.target.value as
                        (typeof businessApplications)[number]
                    )
                  }
                >
                  {businessApplications.map((application) => (
                    <option key={application} value={application}>
                      {application}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tenant key
                <input
                  value={canonicalTenantKey}
                  onChange={(event) =>
                    setCanonicalTenantKey(event.target.value)
                  }
                  placeholder="rosevear-main"
                />
              </label>
              <label>
                Source record ID
                <input
                  value={sourceRecordId}
                  onChange={(event) =>
                    setSourceRecordId(event.target.value)
                  }
                />
              </label>
              <label>
                Source record version
                <input
                  value={sourceRecordVersion}
                  onChange={(event) =>
                    setSourceRecordVersion(event.target.value)
                  }
                  placeholder="optional"
                />
              </label>
              <label>
                Item kind
                <select
                  value={itemKind}
                  onChange={(event) =>
                    setItemKind(
                      event.target.value as
                        (typeof itemKinds)[number]
                    )
                  }
                >
                  {itemKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Source updated at
                <input
                  value={updatedAt}
                  onChange={(event) =>
                    setUpdatedAt(event.target.value)
                  }
                />
              </label>
              <label>
                Name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label>
                SKU
                <input
                  value={sku}
                  onChange={(event) => setSku(event.target.value)}
                  disabled={itemKind !== "product"}
                />
              </label>
              <label>
                Category
                <input
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value)
                  }
                  placeholder={itemKind}
                />
              </label>
              <label>
                Status
                <input
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value)
                  }
                  placeholder="active"
                />
              </label>
              <label>
                Price CAD / starting price
                <input
                  value={priceCad}
                  onChange={(event) =>
                    setPriceCad(event.target.value)
                  }
                  inputMode="decimal"
                />
              </label>
              <label>
                Duration minutes
                <input
                  value={durationMinutes}
                  onChange={(event) =>
                    setDurationMinutes(event.target.value)
                  }
                  disabled={itemKind === "product"}
                  inputMode="numeric"
                />
              </label>
              <label>
                Service areas
                <input
                  value={serviceAreas}
                  onChange={(event) =>
                    setServiceAreas(event.target.value)
                  }
                  disabled={itemKind === "product"}
                  placeholder="Tillsonburg, Woodstock"
                />
              </label>
              <label>
                Description
                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                />
              </label>
              <button
                className="primaryButton"
                type="button"
                disabled={
                  busy !== "" ||
                  !workspaceId ||
                  !canonicalTenantKey ||
                  !sourceRecordId ||
                  !name
                }
                onClick={recordItem}
              >
                {busy === "record"
                  ? "Normalizing…"
                  : "Normalize catalogue item"}
              </button>
            </div>
          ) : (
            <p>Owner or admin access is required.</p>
          )}
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Held exchange package</p>
            <h2>Prepare a destination package</h2>
          </div>
        </div>
        <div className="card">
          {model.items.length ? (
            <div className="formGrid">
              <label>
                Source item
                <select
                  value={sourceItemId}
                  onChange={(event) =>
                    setSourceItemId(event.target.value)
                  }
                >
                  {model.items.map((item) => (
                    <option
                      key={item.itemId}
                      value={item.itemId}
                    >
                      {String(item.portableRecord.name ?? item.sourceRecordId)}
                      {" · "}
                      {item.sourceApplicationId}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Destination application
                <select
                  value={destinationApplicationId}
                  onChange={(event) =>
                    setDestinationApplicationId(
                      event.target.value as
                        (typeof businessApplications)[number]
                    )
                  }
                >
                  {businessApplications.map((application) => (
                    <option key={application} value={application}>
                      {application}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Destination tenant key
                <input
                  value={destinationTenantKey}
                  onChange={(event) =>
                    setDestinationTenantKey(event.target.value)
                  }
                  placeholder="rosevear-main"
                />
              </label>
              <button
                className="primaryButton"
                type="button"
                disabled={
                  busy !== "" ||
                  !sourceItemId ||
                  !destinationTenantKey
                }
                onClick={preparePackage}
              >
                {busy === "package"
                  ? "Preparing…"
                  : "Prepare HELD exchange package"}
              </button>
            </div>
          ) : (
            <p>Record a normalized catalogue item first.</p>
          )}
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Owner review queue</p>
            <h2>Held packages awaiting decision</h2>
          </div>
        </div>
        <div className="cardGrid">
          {pendingPackages.length ? (
            pendingPackages.map((item) => (
              <article className="card" key={item.packageId}>
                <strong>{item.itemName}</strong>
                <p>
                  {item.sourceApplicationId} →{" "}
                  {item.destinationApplicationId}
                </p>
                <p>
                  {item.itemKind} · <code>{item.contractId}</code>
                </p>
                <p>
                  State: <strong>HELD</strong> ·{" "}
                  <code>{item.holdReason}</code>
                </p>
                <label>
                  Review reason
                  <textarea
                    value={reasons[item.packageId] ?? ""}
                    onChange={(event) =>
                      setReasons((current) => ({
                        ...current,
                        [item.packageId]: event.target.value
                      }))
                    }
                    placeholder="Explain why this normalized package is or is not suitable for future exchange."
                  />
                </label>
                <div className="heroActions">
                  <button
                    className="primaryButton"
                    type="button"
                    disabled={busy !== ""}
                    onClick={() =>
                      reviewPackage(item.packageId, "approve")
                    }
                  >
                    {busy === item.packageId + ":approve"
                      ? "Approving…"
                      : "Approve for future transport"}
                  </button>
                  <button
                    className="secondaryButton"
                    type="button"
                    disabled={busy !== ""}
                    onClick={() =>
                      reviewPackage(item.packageId, "reject")
                    }
                  >
                    {busy === item.packageId + ":reject"
                      ? "Rejecting…"
                      : "Reject package"}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <article className="card">
              <p>No held catalogue packages await review.</p>
            </article>
          )}
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Normalized source records</p>
            <h2>Current catalogue snapshots</h2>
          </div>
        </div>
        <div className="cardGrid">
          {model.items.length ? (
            model.items.map((item) => (
              <article className="card" key={item.itemId}>
                <strong>
                  {String(
                    item.portableRecord.name ?? item.sourceRecordId
                  )}
                </strong>
                <p>
                  {item.sourceApplicationId} · {item.itemKind}
                </p>
                <p>
                  <code>{item.contractId}</code>
                </p>
                <p>
                  Record: <code>{item.sourceRecordId}</code>
                </p>
              </article>
            ))
          ) : (
            <article className="card">
              <p>No normalized catalogue records yet.</p>
            </article>
          )}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Exchange policy</strong>
        <p>
          Outbound network requests:{" "}
          {model.policy.outboundNetworkRequests ? "enabled" : "disabled"} ·
          peer-app writes:{" "}
          {model.policy.peerApplicationWrites ? "enabled" : "disabled"} ·
          automatic dispatch:{" "}
          {model.policy.automaticDispatch ? "enabled" : "disabled"} ·
          QL-266 resumed:{" "}
          {model.policy.ql266Resumed ? "yes" : "no"}.
        </p>
      </section>
    </>
  );
}

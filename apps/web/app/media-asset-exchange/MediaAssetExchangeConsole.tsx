"use client";

import { useMemo, useState } from "react";

const applications = [
  "devilndove",
  "rosiedazzlers",
  "yard-workers",
  "icamp",
  "rosevear-comms-hub",
  "rosevear-ai-hub"
] as const;

const assetKinds = [
  "photo",
  "document",
  "receipt",
  "generated-media",
  "video",
  "audio"
] as const;

const mediaTypes = [
  "image",
  "video",
  "document",
  "audio"
] as const;

type Model = {
  workspaces: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  assets: Array<{
    assetId: string;
    workspaceId: string;
    canonicalTenantKey: string;
    dedupeSha256: string;
    dedupeBasis: "content-sha256" | "reference-url-sha256";
    mediaType: string;
    assetKind: string;
    mimeType: string | null;
    byteSize: number | null;
    contentSha256: string | null;
    referenceCount: number;
    firstRecordedAt: string;
  }>;
  references: Array<{
    referenceId: string;
    workspaceId: string;
    assetId: string;
    sourceApplicationId: string;
    canonicalTenantKey: string;
    sourceRecordId: string;
    sourceRecordVersion: string | null;
    assetKind: string;
    sourceUrl: string;
    contractId: string;
    contractVersion: string;
    portableRecord: Record<string, unknown>;
    referenceSha256: string;
    dedupeSha256: string;
    dedupeBasis: "content-sha256" | "reference-url-sha256";
    mediaType: string;
    mimeType: string | null;
    byteSize: number | null;
    contentSha256: string | null;
    recordedAt: string;
  }>;
  packages: Array<{
    packageId: string;
    workspaceId: string;
    sourceReferenceId: string;
    sourceApplicationId: string;
    sourceRecordId: string;
    assetKind: string;
    mediaType: string;
    sourceUrl: string;
    destinationApplicationId: string;
    destinationTenantKey: string;
    payloadSha256: string;
    state: "held";
    holdReason: "media-exchange-not-authorized";
    reviewDecision: "approve" | "reject" | null;
    reviewReason: string | null;
    reviewedAt: string | null;
    createdAt: string;
  }>;
  summary: {
    canonicalAssets: number;
    sourceReferences: number;
    duplicateReferencesAvoided: number;
    heldPackages: number;
    pendingReviews: number;
    approvedForFutureTransport: number;
  };
  policy: {
    build286MediaContractReused: boolean;
    contractId: string;
    binaryUploadsPerformed: boolean;
    binaryDownloadsPerformed: boolean;
    dedupeContentHashPreferred: boolean;
    dedupeStableUrlFallback: boolean;
    packageState: string;
    peerApplicationWrites: boolean;
    outboundNetworkRequests: boolean;
    automaticDispatch: boolean;
    ownerAdminReviewRequired: boolean;
    ql266Resumed: boolean;
  };
};

export function MediaAssetExchangeConsole({
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
    useState<(typeof applications)[number]>("devilndove");
  const [canonicalTenantKey, setCanonicalTenantKey] =
    useState("");
  const [sourceRecordId, setSourceRecordId] = useState("");
  const [sourceRecordVersion, setSourceRecordVersion] =
    useState("");
  const [updatedAt, setUpdatedAt] = useState(
    new Date().toISOString()
  );
  const [assetKind, setAssetKind] =
    useState<(typeof assetKinds)[number]>("photo");
  const [mediaType, setMediaType] =
    useState<(typeof mediaTypes)[number]>("image");
  const [url, setUrl] = useState("");
  const [ownerKind, setOwnerKind] = useState("");
  const [ownerRecordId, setOwnerRecordId] = useState("");
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [mimeType, setMimeType] = useState("");
  const [byteSize, setByteSize] = useState("");
  const [contentSha256, setContentSha256] = useState("");

  const [sourceReferenceId, setSourceReferenceId] = useState(
    model.references[0]?.referenceId ?? ""
  );
  const [destinationApplicationId, setDestinationApplicationId] =
    useState<(typeof applications)[number]>("rosiedazzlers");
  const [destinationTenantKey, setDestinationTenantKey] =
    useState("");

  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [reasons, setReasons] =
    useState<Record<string, string>>({});

  async function post(body: Record<string, unknown>) {
    const response = await fetch("/api/media-asset-exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        typeof payload.error === "string"
          ? payload.error
          : "Media exchange request failed."
      );
    }
    return payload;
  }

  async function recordReference() {
    setBusy("record");
    setMessage("");
    try {
      const payload = await post({
        action: "record-reference",
        workspaceId,
        sourceApplicationId,
        canonicalTenantKey,
        sourceRecordId,
        sourceRecordVersion,
        updatedAt,
        assetKind,
        mediaType,
        url,
        ownerKind,
        ownerRecordId,
        altText,
        caption,
        createdAt,
        mimeType,
        byteSize,
        contentSha256
      });
      const deduplicated = Boolean(
        payload?.result?.deduplicated
      );
      setMessage(
        deduplicated
          ? "Reference recorded and linked to an existing canonical asset. No upload occurred. Reloading."
          : "Reference recorded as a new canonical asset. No upload occurred. Reloading."
      );
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Media reference failed."
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
        sourceReferenceId,
        destinationApplicationId,
        destinationTenantKey
      });
      setMessage(
        "Media exchange package prepared in HELD state. No binary transfer or external request occurred. Reloading."
      );
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Media package failed."
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
          ? "Package approved for possible future transport, but it remains HELD and no file moved. Reloading."
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
            <p className="eyebrow">Media standing</p>
            <h2>Reference-first asset inventory</h2>
          </div>
        </div>
        <div className="commandMetrics">
          <article>
            <strong>{model.summary.canonicalAssets}</strong>
            <span>canonical assets</span>
          </article>
          <article>
            <strong>{model.summary.sourceReferences}</strong>
            <span>source references</span>
          </article>
          <article>
            <strong>
              {model.summary.duplicateReferencesAvoided}
            </strong>
            <span>duplicate asset records avoided</span>
          </article>
          <article>
            <strong>{model.summary.pendingReviews}</strong>
            <span>pending package reviews</span>
          </article>
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Source media reference</p>
            <h2>Register a photo, document or generated asset</h2>
          </div>
        </div>
        <div className="card">
          <p>
            Supply a stable HTTPS reference. A SHA-256 content hash is
            preferred because it safely deduplicates the same asset
            even when different applications use different URLs.
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
                    <option key={workspace.id} value={workspace.id}>
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
                        (typeof applications)[number]
                    )
                  }
                >
                  {applications.map((application) => (
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
                Source updated at
                <input
                  value={updatedAt}
                  onChange={(event) =>
                    setUpdatedAt(event.target.value)
                  }
                  placeholder="ISO timestamp"
                />
              </label>
              <label>
                Asset kind
                <select
                  value={assetKind}
                  onChange={(event) =>
                    setAssetKind(
                      event.target.value as
                        (typeof assetKinds)[number]
                    )
                  }
                >
                  {assetKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Build 286 media type
                <select
                  value={mediaType}
                  onChange={(event) =>
                    setMediaType(
                      event.target.value as
                        (typeof mediaTypes)[number]
                    )
                  }
                >
                  {mediaTypes.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Stable HTTPS URL
                <input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://..."
                />
              </label>
              <label>
                Content SHA-256
                <input
                  value={contentSha256}
                  onChange={(event) =>
                    setContentSha256(event.target.value)
                  }
                  placeholder="optional 64-hex digest"
                />
              </label>
              <label>
                MIME type
                <input
                  value={mimeType}
                  onChange={(event) =>
                    setMimeType(event.target.value)
                  }
                  placeholder="image/webp"
                />
              </label>
              <label>
                Byte size
                <input
                  value={byteSize}
                  onChange={(event) =>
                    setByteSize(event.target.value)
                  }
                  inputMode="numeric"
                  placeholder="optional"
                />
              </label>
              <label>
                Owner kind
                <input
                  value={ownerKind}
                  onChange={(event) =>
                    setOwnerKind(event.target.value)
                  }
                  placeholder="product, booking, job..."
                />
              </label>
              <label>
                Owner record ID
                <input
                  value={ownerRecordId}
                  onChange={(event) =>
                    setOwnerRecordId(event.target.value)
                  }
                />
              </label>
              <label>
                Created at
                <input
                  value={createdAt}
                  onChange={(event) =>
                    setCreatedAt(event.target.value)
                  }
                  placeholder="optional ISO timestamp"
                />
              </label>
              <label>
                Alt text
                <input
                  value={altText}
                  onChange={(event) =>
                    setAltText(event.target.value)
                  }
                />
              </label>
              <label>
                Caption
                <textarea
                  value={caption}
                  onChange={(event) =>
                    setCaption(event.target.value)
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
                  !url
                }
                onClick={recordReference}
              >
                {busy === "record"
                  ? "Registering…"
                  : "Register media reference"}
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
            <h2>Prepare a destination reference package</h2>
          </div>
        </div>
        <div className="card">
          {model.references.length ? (
            <div className="formGrid">
              <label>
                Source reference
                <select
                  value={sourceReferenceId}
                  onChange={(event) =>
                    setSourceReferenceId(event.target.value)
                  }
                >
                  {model.references.map((item) => (
                    <option
                      key={item.referenceId}
                      value={item.referenceId}
                    >
                      {item.assetKind} · {item.sourceApplicationId} ·{" "}
                      {item.sourceRecordId}
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
                        (typeof applications)[number]
                    )
                  }
                >
                  {applications.map((application) => (
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
                  !sourceReferenceId ||
                  !destinationTenantKey
                }
                onClick={preparePackage}
              >
                {busy === "package"
                  ? "Preparing…"
                  : "Prepare HELD media package"}
              </button>
            </div>
          ) : (
            <p>Register a media reference first.</p>
          )}
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Owner review queue</p>
            <h2>Held media packages awaiting decision</h2>
          </div>
        </div>
        <div className="cardGrid">
          {pendingPackages.length ? (
            pendingPackages.map((item) => (
              <article className="card" key={item.packageId}>
                <strong>
                  {item.assetKind} · {item.mediaType}
                </strong>
                <p>
                  {item.sourceApplicationId} →{" "}
                  {item.destinationApplicationId}
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
                    placeholder="Explain why this reference package is or is not suitable for future exchange."
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
              <p>No held media packages await review.</p>
            </article>
          )}
        </div>
      </section>

      <section>
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Canonical assets</p>
            <h2>Deduplicated media identities</h2>
          </div>
        </div>
        <div className="cardGrid">
          {model.assets.length ? (
            model.assets.map((asset) => (
              <article className="card" key={asset.assetId}>
                <strong>
                  {asset.assetKind} · {asset.mediaType}
                </strong>
                <p>
                  {asset.referenceCount} source reference
                  {asset.referenceCount === 1 ? "" : "s"}
                </p>
                <p>
                  Dedupe: <code>{asset.dedupeBasis}</code>
                </p>
                <p>
                  Tenant: <code>{asset.canonicalTenantKey}</code>
                </p>
              </article>
            ))
          ) : (
            <article className="card">
              <p>No shared media references yet.</p>
            </article>
          )}
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Exchange policy</strong>
        <p>
          Binary uploads:{" "}
          {model.policy.binaryUploadsPerformed ? "enabled" : "disabled"} ·
          binary downloads:{" "}
          {model.policy.binaryDownloadsPerformed ? "enabled" : "disabled"} ·
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

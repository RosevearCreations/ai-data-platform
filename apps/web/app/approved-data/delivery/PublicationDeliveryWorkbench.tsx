"use client";

import { useMemo, useState } from "react";

import type {
  PublicationBridgePublication,
  PublicationDeliveryBridgeModel,
  PublicationDeliveryMapping
} from "@/lib/publication-delivery-bridge";
import type { IntegrationTarget } from "@/lib/integration-delivery";

import { HelpInfo } from "../../help/HelpInfo";

async function request(
  method: "POST" | "PATCH",
  body: Record<string, unknown>
) {
  const response = await fetch("/api/approved-data/delivery", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload && typeof payload.error === "string"
        ? payload.error
        : "Publication delivery request failed."
    );
  }
  return payload as Record<string, unknown>;
}

function preferredField(fields: string[], candidates: string[]) {
  return candidates.find((candidate) => fields.includes(candidate)) ?? fields[0] ?? "";
}

function initialFieldMap(
  fields: string[],
  allowed: string[]
) {
  return Object.fromEntries(
    allowed.filter((field) => fields.includes(field)).map((field) => [field, field])
  );
}

function MappingForm({
  publication,
  model,
  disabled,
  onCreated
}: {
  publication: PublicationBridgePublication;
  model: PublicationDeliveryBridgeModel;
  disabled: boolean;
  onCreated: (model: PublicationDeliveryBridgeModel, message: string) => void;
}) {
  const [target, setTarget] = useState<IntegrationTarget>("rosie-dazzlers");
  const [keyField, setKeyField] = useState(
    preferredField(publication.fieldOrder, ["integrationKey", "id", "sku", "supplierSku", "name"])
  );
  const [timestampField, setTimestampField] = useState(
    preferredField(publication.fieldOrder, ["retrievedAt", "updatedAt", "observedAt", "capturedAt"])
  );
  const [urlField, setUrlField] = useState(
    publication.fieldOrder.includes("sourceUrl") ? "sourceUrl" : ""
  );
  const [operationAction, setOperationAction] = useState<"create" | "update">("create");
  const contract = model.contracts.find((item) => item.target === target)!;
  const [fieldMapText, setFieldMapText] = useState(() =>
    JSON.stringify(initialFieldMap(publication.fieldOrder, contract.allowedFields), null, 2)
  );
  const [working, setWorking] = useState(false);

  function changeTarget(next: IntegrationTarget) {
    setTarget(next);
    const nextContract = model.contracts.find((item) => item.target === next)!;
    setFieldMapText(
      JSON.stringify(initialFieldMap(publication.fieldOrder, nextContract.allowedFields), null, 2)
    );
  }

  async function create() {
    setWorking(true);
    try {
      const parsed = JSON.parse(fieldMapText) as unknown;
      const payload = await request("POST", {
        action: "create-mapping",
        workspaceId: publication.workspaceId,
        publicationId: publication.publicationId,
        target,
        integrationKeyField: keyField,
        operationAction,
        evidenceUrlField: urlField,
        evidenceTimestampField: timestampField,
        fieldMap: parsed
      });
      onCreated(
        payload.model as PublicationDeliveryBridgeModel,
        "Immutable delivery mapping created and package validation passed."
      );
    } catch (error) {
      onCreated(model, error instanceof Error ? error.message : "Unable to create mapping.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <article className="bridgePublicationCard">
      <div>
        <span className="badge">{publication.workspaceName}</span>
        <h3>{publication.title}</h3>
        <p>{publication.rowCount} published row(s)</p>
        <code>{publication.publicationFingerprint}</code>
      </div>
      <div className="bridgeFormGrid">
        <label>
          Consumer
          <select value={target} onChange={(event) => changeTarget(event.target.value as IntegrationTarget)}>
            <option value="rosie-dazzlers">Rosie Dazzlers</option>
            <option value="devil-n-dove">Devil n Dove</option>
          </select>
        </label>
        <label>
          Consumer action
          <select value={operationAction} onChange={(event) => setOperationAction(event.target.value as "create" | "update")}>
            <option value="create">create</option>
            <option value="update">update</option>
          </select>
        </label>
        <label>
          Integration-key source field
          <select value={keyField} onChange={(event) => setKeyField(event.target.value)}>
            {publication.fieldOrder.map((field) => <option key={field}>{field}</option>)}
          </select>
        </label>
        <label>
          Evidence timestamp source field
          <select value={timestampField} onChange={(event) => setTimestampField(event.target.value)}>
            {publication.fieldOrder.map((field) => <option key={field}>{field}</option>)}
          </select>
        </label>
        <label>
          Evidence URL source field
          <select value={urlField} onChange={(event) => setUrlField(event.target.value)}>
            <option value="">Use publication source URL</option>
            {publication.fieldOrder.map((field) => <option key={field}>{field}</option>)}
          </select>
        </label>
      </div>
      <label className="bridgeFieldMap">
        Contract field map (consumer field → publication field)
        <textarea
          value={fieldMapText}
          onChange={(event) => setFieldMapText(event.target.value)}
          spellCheck={false}
        />
      </label>
      <p className="bridgeHint">
        Allowed {target} fields: {contract.allowedFields.join(", ")}
      </p>
      <button
        className="primary"
        type="button"
        disabled={disabled || working || publication.status !== "published"}
        onClick={() => void create()}
      >
        {working ? "Validating…" : "Create immutable mapping"}
      </button>
    </article>
  );
}

export function PublicationDeliveryWorkbench({
  initialModel
}: {
  initialModel: PublicationDeliveryBridgeModel;
}) {
  const [model, setModel] = useState(initialModel);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  const published = useMemo(
    () => model.publications.filter((publication) => publication.status === "published"),
    [model.publications]
  );

  async function refresh() {
    const response = await fetch("/api/approved-data/delivery", { cache: "no-store" });
    if (response.ok) setModel((await response.json()) as PublicationDeliveryBridgeModel);
  }

  async function run(
    action: "conformance" | "probe" | "deliver",
    mapping: PublicationDeliveryMapping
  ) {
    const key = action + ":" + mapping.mappingId;
    setBusy(key);
    setMessage("");
    try {
      await request("POST", {
        action,
        workspaceId: mapping.workspaceId,
        mappingId: mapping.mappingId
      });
      await refresh();
      setMessage(
        action === "conformance"
          ? "Publication package accepted by the conformance consumer and receipt evidence recorded."
          : action === "probe"
            ? "External consumer handshake accepted."
            : "External consumer dry-run acknowledgement recorded against the publication and mapping fingerprints."
      );
    } catch (error) {
      await refresh();
      setMessage(error instanceof Error ? error.message : "Delivery bridge action failed.");
    } finally {
      setBusy("");
    }
  }

  async function retire(mapping: PublicationDeliveryMapping) {
    if (!window.confirm("Retire this mapping? Existing receipts remain immutable.")) return;
    setBusy("retire:" + mapping.mappingId);
    setMessage("");
    try {
      const next = (await request("PATCH", {
        action: "retire-mapping",
        workspaceId: mapping.workspaceId,
        mappingId: mapping.mappingId,
        retirementNote: "Retired from the Build 050 delivery workbench."
      })) as unknown as PublicationDeliveryBridgeModel;
      setModel(next);
      setMessage("Mapping retired. Existing delivery and receipt evidence remains available.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to retire mapping.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <section className="bridgeSummary">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Publication → consumer evidence</p>
            <h2>Bridge status</h2>
          </div>
          <HelpInfo topic="publication-delivery-overview" />
        </div>
        <div className="commandMetrics">
          <article><strong>{model.totals.published}</strong><span>published snapshots</span></article>
          <article><strong>{model.totals.activeMappings}</strong><span>active mappings</span></article>
          <article><strong>{model.totals.readyMappings}</strong><span>package-ready mappings</span></article>
          <article><strong>{model.totals.acceptedReceipts}</strong><span>accepted bridge receipts</span></article>
        </div>
      </section>

      {message ? <p className="publishMessage">{message}</p> : null}

      <section className="bridgeSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Immutable mapping</p>
            <h2>Create a publication delivery map</h2>
          </div>
          <HelpInfo topic="publication-delivery-mapping" />
        </div>
        <div className="bridgePublicationGrid">
          {published.map((publication) => (
            <MappingForm
              key={publication.publicationId}
              publication={publication}
              model={model}
              disabled={Boolean(busy) || publication.role === "member"}
              onCreated={(next, note) => {
                setModel(next);
                setMessage(note);
              }}
            />
          ))}
          {!published.length ? (
            <div className="emptyState">No active Build 049 publication is available for mapping.</div>
          ) : null}
        </div>
      </section>

      <section className="bridgeSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Controlled delivery</p>
            <h2>Mappings & consumer actions</h2>
          </div>
          <HelpInfo topic="publication-delivery-consumer" />
        </div>
        <div className="publicationList">
          {model.mappings.map((mapping) => {
            const publication = model.publications.find(
              (item) =>
                item.workspaceId === mapping.workspaceId &&
                item.publicationId === mapping.publicationId
            );
            const consumer = model.contracts.find((item) => item.target === mapping.target);
            return (
              <article className="publicationCard" key={mapping.mappingId}>
                <header>
                  <div>
                    <span className={"publishState publishState-" + (mapping.readiness.ready ? "published" : "withdrawn")}>
                      {mapping.readiness.ready ? "ready" : "blocked"}
                    </span>
                    <h3>{publication?.title ?? mapping.publicationId}</h3>
                    <p>{mapping.workspaceName} · {mapping.target} · {mapping.operationAction}</p>
                  </div>
                  <span className="badge">{mapping.status}</span>
                </header>
                <dl className="publicationEvidence">
                  <div><dt>Publication fingerprint</dt><dd>{publication?.publicationFingerprint}</dd></div>
                  <div><dt>Mapping fingerprint</dt><dd>{mapping.mappingFingerprint}</dd></div>
                  <div><dt>Key field</dt><dd>{mapping.integrationKeyField}</dd></div>
                  <div><dt>Evidence time</dt><dd>{mapping.evidenceTimestampField}</dd></div>
                </dl>
                <div className="publicationFields">
                  {Object.entries(mapping.fieldMap).map(([targetField, sourceField]) => (
                    <span key={targetField}>{targetField} ← {sourceField}</span>
                  ))}
                </div>
                {!mapping.readiness.ready ? (
                  <div className="bridgeBlockers">
                    {mapping.readiness.blockers.map((blocker) => <span key={blocker}>{blocker}</span>)}
                  </div>
                ) : null}
                <p className="bridgeHint">
                  External consumer: {consumer?.configured ? consumer.endpointOrigin : "not configured — fail closed"}
                </p>
                <div className="heroActions">
                  <button
                    className="secondaryButton"
                    type="button"
                    disabled={Boolean(busy) || !mapping.readiness.ready || !mapping.canManage}
                    onClick={() => void run("conformance", mapping)}
                  >
                    {busy === "conformance:" + mapping.mappingId ? "Checking…" : "Run conformance"}
                  </button>
                  <button
                    className="secondaryButton"
                    type="button"
                    disabled={Boolean(busy) || !mapping.readiness.ready || !mapping.canManage || !consumer?.configured}
                    onClick={() => void run("probe", mapping)}
                  >
                    {busy === "probe:" + mapping.mappingId ? "Probing…" : "Test handshake"}
                  </button>
                  <button
                    className="primary"
                    type="button"
                    disabled={Boolean(busy) || !mapping.readiness.ready || !mapping.canManage || !consumer?.configured}
                    onClick={() => void run("deliver", mapping)}
                  >
                    {busy === "deliver:" + mapping.mappingId ? "Sending…" : "Send dry-run"}
                  </button>
                  {mapping.status === "active" && mapping.canManage ? (
                    <button
                      className="secondaryButton"
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => void retire(mapping)}
                    >
                      {busy === "retire:" + mapping.mappingId ? "Retiring…" : "Retire mapping"}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
          {!model.mappings.length ? <div className="emptyState">No delivery mappings exist yet.</div> : null}
        </div>
      </section>

      <section className="bridgeSection">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">Append-only proof</p>
            <h2>Consumer receipt bridge</h2>
          </div>
          <HelpInfo topic="publication-delivery-receipts" />
        </div>
        <div className="publicationList">
          {model.receipts.map((receipt) => (
            <article className="publicationCard" key={receipt.receiptId}>
              <header>
                <div>
                  <span className={"publishState publishState-" + (receipt.receiptStatus === "accepted" ? "published" : "withdrawn")}>
                    {receipt.receiptStatus}
                  </span>
                  <h3>{receipt.target} · {receipt.transportMode}</h3>
                  <p>{receipt.workspaceName} · {receipt.validationCode}</p>
                </div>
                <span className="badge">{receipt.dryRun ? "dry-run" : "live"}</span>
              </header>
              <dl className="publicationEvidence">
                <div><dt>Publication</dt><dd>{receipt.publicationId}</dd></div>
                <div><dt>Publication fingerprint</dt><dd>{receipt.publicationFingerprint}</dd></div>
                <div><dt>Mapping fingerprint</dt><dd>{receipt.mappingFingerprint}</dd></div>
                <div><dt>Package</dt><dd>{receipt.packageId}</dd></div>
                <div><dt>Package fingerprint</dt><dd>{receipt.packageFingerprint}</dd></div>
                <div><dt>Consumer</dt><dd>{receipt.consumerId}</dd></div>
              </dl>
              <small>
                Recorded {new Date(receipt.createdAt).toLocaleString()}
                {receipt.consumerReceivedAt
                  ? " · consumer " + new Date(receipt.consumerReceivedAt).toLocaleString()
                  : ""}
              </small>
            </article>
          ))}
          {!model.receipts.length ? <div className="emptyState">No publication-linked consumer receipt exists yet.</div> : null}
        </div>
      </section>
    </>
  );
}

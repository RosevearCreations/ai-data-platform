"use client";

import { useMemo, useState } from "react";

type ContractOption = {
  contractId: string;
  title: string;
  version: string;
  schemaId: string;
  schemaFingerprint: string;
};

type ApplicationOption = {
  applicationId: string;
  displayName: string;
};

type CompatibilityResult = {
  compatible: boolean;
  code: string;
  detail: string;
  registryVersion: string | null;
  implementationVerified: false;
  fieldMappingRequired: true;
};

export function DataContractCompatibilityChecker({
  contracts,
  applications
}: {
  contracts: ContractOption[];
  applications: ApplicationOption[];
}) {
  const [contractId, setContractId] = useState(contracts[0]?.contractId ?? "");
  const [producerApplicationId, setProducerApplicationId] = useState(
    applications[0]?.applicationId ?? ""
  );
  const [consumerApplicationId, setConsumerApplicationId] = useState(
    applications[1]?.applicationId ?? applications[0]?.applicationId ?? ""
  );
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");

  const contract = useMemo(
    () => contracts.find((item) => item.contractId === contractId) ?? contracts[0],
    [contractId, contracts]
  );

  async function checkCompatibility() {
    if (!contract) return;
    setRunning(true);
    setMessage("");
    setResult(null);
    try {
      const response = await fetch("/api/data-contracts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "compatibility",
          contractId: contract.contractId,
          producerApplicationId,
          consumerApplicationId,
          producerVersion: contract.version,
          consumerVersion: contract.version,
          schemaId: contract.schemaId,
          schemaFingerprint: contract.schemaFingerprint
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Compatibility check failed.");
      }
      setResult(payload.result);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Compatibility check failed."
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="reviewEditor" aria-labelledby="contract-compatibility-title">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Structural compatibility preflight</p>
          <h2 id="contract-compatibility-title">Check an app-to-app contract pair</h2>
        </div>
      </div>

      <div className="reviewFormGrid">
        <label>
          Contract
          <select
            value={contractId}
            onChange={(event) => setContractId(event.target.value)}
          >
            {contracts.map((item) => (
              <option value={item.contractId} key={item.contractId}>
                {item.title} · {item.version}
              </option>
            ))}
          </select>
        </label>

        <label>
          Producer application
          <select
            value={producerApplicationId}
            onChange={(event) => setProducerApplicationId(event.target.value)}
          >
            {applications.map((item) => (
              <option value={item.applicationId} key={item.applicationId}>
                {item.displayName}
              </option>
            ))}
          </select>
        </label>

        <label>
          Consumer application
          <select
            value={consumerApplicationId}
            onChange={(event) => setConsumerApplicationId(event.target.value)}
          >
            {applications.map((item) => (
              <option value={item.applicationId} key={item.applicationId}>
                {item.displayName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="heroActions">
        <button
          className="primaryButton"
          type="button"
          onClick={() => void checkCompatibility()}
          disabled={running || !contract}
        >
          {running ? "Checking…" : "Check structural compatibility"}
        </button>
      </div>

      {message ? (
        <p className="dataQualityPolicyNote" role="status">
          {message}
        </p>
      ) : null}

      {result ? (
        <div className="dataQualityPolicyNote" role="status">
          <strong>
            {result.compatible ? "Compatible" : "Blocked"} · {result.code}
          </strong>
          <p>{result.detail}</p>
          <p>
            Registry version: {result.registryVersion ?? "not registered"} ·
            implementation verified: no · field mapping still required: yes
          </p>
        </div>
      ) : null}
    </section>
  );
}

import {
  integrationV1GatewayPublicKeyFingerprintSha256,
  prepareIntegrationV1GatewayAudit,
  revokeIntegrationV1ConnectionKey,
  rotateIntegrationV1ConnectionKey
} from "../lib/integration-v1-gateway";

function arg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

async function main() {
  const action = process.argv[2];

  if (action === "fingerprint") {
    console.log(JSON.stringify({
      gatewayPublicSpkiSha256: integrationV1GatewayPublicKeyFingerprintSha256(),
      note: "Public fingerprint only. Verify it through a separate trusted channel."
    }));
    return;
  }

  const connectionId = arg("--connection");
  if (!connectionId) throw new Error("connection_required");

  if (action === "prepare-audit") {
    const envelope = await prepareIntegrationV1GatewayAudit(connectionId);
    console.log(JSON.stringify({
      receiptId: envelope.payload.gateway_audit_id,
      sourceRevision: envelope.payload.source_revision,
      connectionStatus: envelope.payload.connection_status,
      signaturePresent: typeof envelope.signature === "string"
    }));
    return;
  }

  if (action === "revoke") {
    console.log(JSON.stringify({
      revoked: await revokeIntegrationV1ConnectionKey(connectionId),
      connectionId
    }));
    return;
  }

  if (action === "rotate") {
    const next = {
      currentConnectionId: connectionId,
      newConnectionId: arg("--new-connection") ?? "",
      newKeyId: arg("--new-key-id") ?? "",
      newSecretEnvVar: arg("--secret-env-var") ?? "",
      healthReceiptId: arg("--health-receipt-id") ?? "",
      capabilitiesReceiptId: arg("--capabilities-receipt-id") ?? "",
      gatewayAuditId: arg("--gateway-audit-id") ?? ""
    };
    await rotateIntegrationV1ConnectionKey(next);
    console.log(JSON.stringify({
      rotated: true,
      oldConnectionId: connectionId,
      newConnectionId: next.newConnectionId,
      newKeyId: next.newKeyId,
      note: "Secret value remains server-side in the named environment variable."
    }));
    return;
  }

  throw new Error("usage: fingerprint | prepare-audit | revoke | rotate");
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "integration_v1_admin_failed");
  process.exitCode = 1;
});

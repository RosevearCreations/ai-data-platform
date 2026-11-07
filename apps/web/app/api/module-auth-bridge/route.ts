import { NextResponse } from "next/server";

import {
  HOST_SESSION_ASSERTION_SCHEMA,
  HOST_SESSION_BRIDGE_SCHEMA,
  HOST_SESSION_BRIDGE_VERSION,
  HOST_SESSION_SIGNATURE_ALGORITHMS
} from "@/lib/host-session-context-bridge";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      schema: "rosevear.ai-data-platform.auth-context-bridge-config.v1",
      bridge: {
        schema: HOST_SESSION_BRIDGE_SCHEMA,
        version: HOST_SESSION_BRIDGE_VERSION,
        assertionSchema: HOST_SESSION_ASSERTION_SCHEMA
      },
      signature: {
        algorithms: HOST_SESSION_SIGNATURE_ALGORITHMS,
        detachedSignatureRequired: true,
        keyIdRequired: true,
        privateKeysAcceptedByBrowser: false,
        rawHostTokensAccepted: false
      },
      claims: {
        required: [
          "issuer",
          "audience",
          "assertionId",
          "hostApplicationId",
          "hostEnvironment",
          "hostInstanceId",
          "hostSubjectId",
          "sessionId",
          "issuedAt",
          "expiresAt",
          "auditCorrelationId"
        ],
        additionalProperties: false
      },
      validation: {
        audienceBoundToModule: true,
        hostIdentityBound: true,
        subjectMappingRequired: true,
        sessionExpiryEnforced: true,
        replayGuardRequired: true,
        identityMismatchRejected: true,
        acceptedAndRejectedAuditEvidence: true
      },
      reauthentication: {
        handoffMode: "host-reauthentication",
        carriesCredential: false,
        requiresNewSignedAssertion: true
      },
      security: {
        hostSessionGrantsAuthorization: false,
        rawPasswordsAccepted: false,
        rawCookiesAccepted: false,
        bearerTokensAccepted: false,
        secretTokensAccepted: false,
        ql266ResumedByAuthBridge: false
      }
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-rosevear-auth-context-bridge": HOST_SESSION_BRIDGE_VERSION
      }
    }
  );
}

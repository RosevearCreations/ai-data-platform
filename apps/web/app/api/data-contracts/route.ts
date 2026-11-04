import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  buildCrossAppDataContractJsonSchema,
  buildCrossAppDataContractRegistry,
  evaluateCrossAppDataContractCompatibility,
  validateCrossAppDataContractRecord
} from "@/lib/cross-app-data-contract-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function userId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function bodyObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function GET(request: Request) {
  const id = await userId();
  if (!id) return Response.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const contractId = url.searchParams.get("contractId");
  const schema = contractId
    ? buildCrossAppDataContractJsonSchema(contractId)
    : null;

  if (contractId && !schema) {
    return Response.json(
      { error: "cross_app_contract_not_found" },
      { status: 404 }
    );
  }

  return Response.json(
    contractId
      ? { contractId, schema }
      : buildCrossAppDataContractRegistry(),
    { headers: { "cache-control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const id = await userId();
  if (!id) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = bodyObject(await request.json().catch(() => null));
  const action = String(body.action ?? "");

  if (action === "compatibility") {
    const result = evaluateCrossAppDataContractCompatibility({
      contractId: String(body.contractId ?? ""),
      producerApplicationId: String(body.producerApplicationId ?? ""),
      consumerApplicationId: String(body.consumerApplicationId ?? ""),
      producerVersion: String(body.producerVersion ?? ""),
      consumerVersion: String(body.consumerVersion ?? ""),
      schemaId:
        typeof body.schemaId === "string" ? body.schemaId : null,
      schemaFingerprint:
        typeof body.schemaFingerprint === "string"
          ? body.schemaFingerprint
          : null
    });
    return Response.json({ result }, { headers: { "cache-control": "no-store" } });
  }

  if (action === "validate-record") {
    const result = validateCrossAppDataContractRecord(
      String(body.contractId ?? ""),
      body.record
    );
    return Response.json({ result }, { headers: { "cache-control": "no-store" } });
  }

  return Response.json(
    { error: "cross_app_contract_action_invalid" },
    { status: 400 }
  );
}

import { headers } from "next/headers";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import {
  buildCorrectiveGenerationAuditExport,
  correctiveGenerationAuditExportCsv,
  listCorrectiveGenerationOperationsForUser,
  type CorrectiveGenerationOperationsFilters,
  type CorrectiveGenerationTimelineEventType
} from "@/lib/corrective-generation-operations";
import type {
  CorrectiveGenerationInvariantSeverity,
  CorrectiveGenerationMachinePhase
} from "@/lib/corrective-generation-state-machine";
import type { IntegrationTarget } from "@/lib/integration-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const targets = new Set<IntegrationTarget>(["rosie-dazzlers", "devil-n-dove"]);
const severities = new Set<CorrectiveGenerationInvariantSeverity>(["warning", "critical"]);
const phases = new Set<CorrectiveGenerationMachinePhase>([
  "successor-ready",
  "retriage-open",
  "retriage-dismissed",
  "plan-proposed",
  "plan-approved",
  "activation-active",
  "activation-revoked",
  "delivery-reserved",
  "delivery-transport-error",
  "delivery-rejected",
  "delivery-accepted",
  "reconciliation-error",
  "reconciliation-drift",
  "verified-awaiting-reclosure",
  "reclosed-awaiting-monitor",
  "reclosed-stable",
  "recurrence-pending-governance",
  "recurred"
]);
const eventTypes = new Set<CorrectiveGenerationTimelineEventType>([
  "generation-registered",
  "legacy-terminal-recurrence",
  "successor-created",
  "retriage-created",
  "retriage-updated",
  "plan-created",
  "plan-reviewed",
  "activation-created",
  "activation-revoked",
  "delivery-created",
  "delivery-updated",
  "reconciliation-recorded",
  "reclosure-recorded",
  "regression-check-recorded",
  "recurrence-governed"
]);

function trimmed(value: string | null) {
  return value?.trim() || undefined;
}

function parseFilters(request: NextRequest): CorrectiveGenerationOperationsFilters {
  const search = request.nextUrl.searchParams;
  const generationRaw = trimmed(search.get("generation"));
  let generationNumber: number | undefined;
  if (generationRaw) {
    const parsedGeneration = Number(generationRaw);
    if (
      !Number.isInteger(parsedGeneration) ||
      parsedGeneration < 1 ||
      parsedGeneration > 10000
    ) {
      throw new Error("corrective_generation_audit_generation_invalid");
    }
    generationNumber = parsedGeneration;
  }

  const target = trimmed(search.get("target"));
  const phase = trimmed(search.get("phase"));
  const severity = trimmed(search.get("severity"));
  const eventType = trimmed(search.get("eventType"));

  if (target && !targets.has(target as IntegrationTarget)) {
    throw new Error("corrective_generation_audit_target_invalid");
  }
  if (phase && !phases.has(phase as CorrectiveGenerationMachinePhase)) {
    throw new Error("corrective_generation_audit_phase_invalid");
  }
  if (severity && !severities.has(severity as CorrectiveGenerationInvariantSeverity)) {
    throw new Error("corrective_generation_audit_severity_invalid");
  }
  if (eventType && !eventTypes.has(eventType as CorrectiveGenerationTimelineEventType)) {
    throw new Error("corrective_generation_audit_event_type_invalid");
  }

  return {
    workspaceId: trimmed(search.get("workspaceId")),
    caseId: trimmed(search.get("caseId")),
    target: target as IntegrationTarget | undefined,
    generationNumber,
    phase: phase as CorrectiveGenerationMachinePhase | undefined,
    severity: severity as CorrectiveGenerationInvariantSeverity | undefined,
    eventType: eventType as CorrectiveGenerationTimelineEventType | undefined
  };
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const filters = parseFilters(request);
    const model = await listCorrectiveGenerationOperationsForUser(session.user.id);
    const audit = buildCorrectiveGenerationAuditExport(model, filters);
    const format = trimmed(request.nextUrl.searchParams.get("format")) ?? "json";
    const stamp = audit.generatedAt.slice(0, 10);
    const baseName = "corrective-generation-audit-" + stamp;

    if (format === "csv") {
      return new Response(correctiveGenerationAuditExportCsv(audit), {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename="' + baseName + '.csv"',
          "cache-control": "no-store",
          "x-audit-digest": audit.digest.value
        }
      });
    }
    if (format !== "json") {
      return Response.json(
        { error: "corrective_generation_audit_format_invalid" },
        { status: 400 }
      );
    }

    return new Response(JSON.stringify(audit, null, 2) + "\n", {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": 'attachment; filename="' + baseName + '.json"',
        "cache-control": "no-store",
        "x-audit-digest": audit.digest.value
      }
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "corrective_generation_audit_export_failed"
      },
      { status: 400 }
    );
  }
}

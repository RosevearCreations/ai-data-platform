import { NextResponse } from "next/server";

import {
  TENANT_WORKSPACE_MAPPING_SCHEMA,
  TENANT_WORKSPACE_RESOLUTION_SCHEMA,
  TENANT_WORKSPACE_RESOLUTION_VERSION
} from "@/lib/tenant-workspace-context-resolution";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      schema: "rosevear.ai-data-platform.tenant-context-resolution-config.v1",
      resolver: {
        schema: TENANT_WORKSPACE_RESOLUTION_SCHEMA,
        version: TENANT_WORKSPACE_RESOLUTION_VERSION,
        mappingSchema: TENANT_WORKSPACE_MAPPING_SCHEMA
      },
      mappingKey: [
        "hostApplicationId",
        "hostEnvironment",
        "hostTenantId",
        "hostOrganizationId",
        "hostBusinessId"
      ],
      resolution: {
        exactMappingRequired: true,
        implicitFallbackAllowed: false,
        ambiguityBlocked: true,
        disabledMappingAccepted: false,
        deletedMappingAccepted: false,
        authenticatedHostBindingRequired: true
      },
      rls: {
        verificationRequired: true,
        ownWorkspaceReadableRequired: true,
        foreignWorkspaceDeniedRequired: true,
        crossTenantDeniedRequired: true
      },
      security: {
        tenantResolutionGrantsAuthorization: false,
        tenantResolutionActivatesConnection: false,
        crossTenantFallbackAllowed: false,
        ql266ResumedByTenantResolution: false
      }
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-rosevear-tenant-context-resolution":
          TENANT_WORKSPACE_RESOLUTION_VERSION
      }
    }
  );
}

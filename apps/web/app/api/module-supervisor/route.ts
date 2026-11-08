import { NextResponse } from "next/server";

import {
  AUTONOMOUS_MODULE_SUPERVISOR_VERSION,
  autonomousModuleSupervisorDescriptor
} from "@/lib/autonomous-module-supervisor";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ...autonomousModuleSupervisorDescriptor(),
      usage: {
        discoveryOnly: true,
        liveHostCycleRequiresValidatedAdapters: true,
        certificationRefreshDoesNotGrantAuthority: true,
        ownerReviewWorkItemsDoNotGrantAuthority: true,
        safeHealthExecutionRequiresExactScopedGrant: true,
        safeHealthExecutionLimitedToGetHead: true,
        consequentialPeerMutationsRemainOwnerControlled: true,
        build326WillAddPerHostPolicyBudgets: true
      }
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-rosevear-module-supervisor":
          AUTONOMOUS_MODULE_SUPERVISOR_VERSION
      }
    }
  );
}

import { NextResponse } from "next/server";

import {
  WORKFLOW_ACTION_PLUGIN_VERSION,
  workflowActionPluginDescriptor
} from "@/lib/workflow-action-plugin";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ...workflowActionPluginDescriptor(),
      sourceAutomationBuild: 302,
      operatorSurface: "/workflow-automation",
      usage: {
        sourceHeldIntentRequired: true,
        explicitOwnerOrReviewerDecisionRequired: true,
        handoffRequiresIndependentHostGrant: true,
        hostCallbackReceiptRequired: true,
        directExecutionAvailableFromDiscoveryRoute: false
      }
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-rosevear-workflow-action-plugin":
          WORKFLOW_ACTION_PLUGIN_VERSION
      }
    }
  );
}

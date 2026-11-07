import { NextResponse } from "next/server";

import {
  ACCESSIBLE_DIALOG_CONTRACT_SCHEMA,
  FORCED_COLORS_STATES,
  HOST_DENSITIES,
  HOST_PRESENTATION_BRIDGE_SCHEMA,
  HOST_PRESENTATION_BRIDGE_VERSION,
  HOST_THEME_PREFERENCES,
  REDUCED_MOTION_PREFERENCES
} from "@/lib/host-theme-accessibility-locale-bridge";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      schema: "rosevear.ai-data-platform.presentation-bridge-config.v1",
      version: HOST_PRESENTATION_BRIDGE_VERSION,
      bridgeSchema: HOST_PRESENTATION_BRIDGE_SCHEMA,
      accessibleDialogSchema: ACCESSIBLE_DIALOG_CONTRACT_SCHEMA,
      theme: {
        preferences: HOST_THEME_PREFERENCES,
        density: HOST_DENSITIES,
        semanticTokensOnly: true,
        rawCssAccepted: false,
        arbitrarySelectorsAccepted: false
      },
      accessibility: {
        reducedMotion: REDUCED_MOTION_PREFERENCES,
        forcedColors: FORCED_COLORS_STATES,
        keyboardNavigationRequired: true,
        visibleFocusRequired: true,
        focusBoundaryChecksSupported: true,
        accessibleDialogContractSupported: true,
        securityIndicatorsMayBeHidden: false,
        approvalStatesMayBeHidden: false
      },
      locale: {
        bcp47LocaleRequired: true,
        ianaTimeZoneRequired: true
      },
      security: {
        stylingGrantsAuthorization: false,
        themeMayHideSecurityStates: false,
        themeMayHideApprovalStates: false,
        ql266ResumedByPresentationBridge: false
      }
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-rosevear-presentation-bridge":
          HOST_PRESENTATION_BRIDGE_VERSION
      }
    }
  );
}

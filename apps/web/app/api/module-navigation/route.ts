import { NextResponse } from "next/server";

import {
  HOST_NAVIGATION_BRIDGE_VERSION,
  HOST_NAVIGATION_LAUNCH_SCHEMA,
  HOST_NAVIGATION_REGISTRATION_SCHEMA
} from "@/lib/host-navigation-deep-link-bridge";
import { MODULE_SURFACES } from "@/lib/universal-module-contract";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      schema: "rosevear.ai-data-platform.host-navigation-config.v1",
      version: HOST_NAVIGATION_BRIDGE_VERSION,
      registrationSchema: HOST_NAVIGATION_REGISTRATION_SCHEMA,
      launchSchema: HOST_NAVIGATION_LAUNCH_SCHEMA,
      supportedSurfaces: MODULE_SURFACES.map((surface) => ({
        id: surface.id,
        route: surface.route,
        mode: surface.mode,
        mutating: surface.mutating
      })),
      navigation: {
        hostRegistrationSupported: true,
        deepLinksSupported: true,
        breadcrumbsSupported: true,
        boundedBackStackSupported: true,
        commandPaletteSupported: true,
        contextualLaunchParametersSupported: true,
        explicitCompatibilityFallbackSupported: true
      },
      safety: {
        supportedSurfacesOnly: true,
        exactHostOriginRequired: true,
        exactModuleOriginRequired: true,
        absoluteReturnUrlsAccepted: false,
        hostRelativeReturnPathRequired: true,
        rawSecretsAcceptedInLaunchContext: false,
        credentialLikeContextRejected: true,
        fallbackRequiresExplicitLaunchOptIn: true
      },
      security: {
        navigationRegistrationGrantsAuthorization: false,
        deepLinkGrantsAuthorization: false,
        commandPaletteEntryGrantsAuthorization: false,
        contextualLaunchParametersGrantAuthorization: false,
        ql266ResumedByNavigationBridge: false
      }
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-rosevear-host-navigation-bridge":
          HOST_NAVIGATION_BRIDGE_VERSION
      }
    }
  );
}

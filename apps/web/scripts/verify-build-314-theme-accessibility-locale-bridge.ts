import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  ACCESSIBLE_DIALOG_CONTRACT_SCHEMA,
  HOST_PRESENTATION_BRIDGE_SCHEMA,
  HOST_PRESENTATION_BRIDGE_VERSION,
  HostPresentationBridgeError,
  checkKeyboardFocusBoundary,
  createAccessibleDialogContract,
  createHostPresentationBridge,
  presentationBridgeInputFromHostContext
} from "../lib/host-theme-accessibility-locale-bridge";
import { createModuleHostContext } from "../lib/module-host-adapter-pack";

const root = path.resolve(process.cwd());

async function source(relativePath: string) {
  return readFile(path.join(root, relativePath), "utf8");
}

function expectBridgeError(
  fn: () => unknown,
  code: HostPresentationBridgeError["code"]
) {
  assert.throws(
    fn,
    (error: unknown) =>
      error instanceof HostPresentationBridgeError &&
      error.code === code
  );
}

async function main() {
  assert.equal(HOST_PRESENTATION_BRIDGE_VERSION, "1.0.0");
  assert.equal(
    HOST_PRESENTATION_BRIDGE_SCHEMA,
    "rosevear.ai-data-platform.host-presentation-bridge.v1"
  );
  assert.equal(
    ACCESSIBLE_DIALOG_CONTRACT_SCHEMA,
    "rosevear.ai-data-platform.accessible-dialog-contract.v1"
  );

  const result = createHostPresentationBridge({
    theme: "dark",
    density: "comfortable",
    typography: {
      family: "system-ui",
      scale: 1,
      lineHeight: 1.5
    },
    designTokens: {
      colorBackground: "#101114",
      colorSurface: "#181a20",
      colorText: "#ffffff",
      colorMutedText: "#b0b5bf",
      colorBorder: "#343844",
      colorAccent: "#9f7aea",
      colorDanger: "#ff6b6b",
      colorWarning: "#f6ad55",
      colorSuccess: "#68d391",
      radiusPx: 10,
      spacingUnitPx: 8,
      focusRingWidthPx: 3
    },
    reducedMotion: "no-preference",
    forcedColors: "none",
    locale: "en-ca",
    timeZone: "America/Toronto"
  });

  assert.equal(result.theme.preference, "dark");
  assert.equal(result.theme.effective, "dark");
  assert.equal(result.density, "comfortable");
  assert.equal(result.locale.canonical, "en-CA");
  assert.equal(result.locale.timeZone, "America/Toronto");
  assert.equal(result.accessibility.motionDurationMs, 160);
  assert.equal(
    result.accessibility.hostColorsSuppressedByForcedColors,
    false
  );
  assert.equal(result.security.rawCssAccepted, false);
  assert.equal(result.security.arbitrarySelectorsAccepted, false);
  assert.equal(result.security.securityStatesStyleable, false);
  assert.equal(result.security.approvalStatesStyleable, false);
  assert.equal(result.security.stylingGrantsAuthorization, false);
  assert.equal(
    result.cssVariables["--rosevear-module-color-background"],
    "#101114"
  );
  assert.equal(
    result.cssVariables["--rosevear-module-motion-duration"],
    "160ms"
  );

  const reducedForced = createHostPresentationBridge({
    theme: "system",
    systemResolvedTheme: "light",
    density: "compact",
    typography: {
      family: "sans-serif",
      scale: 0.9,
      lineHeight: 1.4
    },
    designTokens: {
      colorAccent: "#ff0000"
    },
    reducedMotion: "reduce",
    forcedColors: "active",
    locale: "fr-CA",
    timeZone: "America/Toronto"
  });

  assert.equal(reducedForced.theme.effective, "light");
  assert.equal(reducedForced.accessibility.motionDurationMs, 0);
  assert.equal(
    reducedForced.accessibility.hostColorsSuppressedByForcedColors,
    true
  );
  assert.equal(
    reducedForced.cssVariables["--rosevear-module-motion-duration"],
    "0ms"
  );
  assert.equal(
    reducedForced.cssVariables["--rosevear-module-color-accent"],
    undefined
  );
  assert.equal(reducedForced.designTokens.colorAccent, "#6750a4");

  const hostContext = {
    ...createModuleHostContext({
      hostApplicationId: "rosevear.icamp",
      environment: "test",
      hostInstanceId: "host_build314_001",
      subjectId: "module_subject_314",
      tenantId: "tenant_build314",
      workspaceId: "workspace_build314",
      auditCorrelationId: "audit_build314_001",
      requestedCapabilities: ["manifest.read"]
    }),
    theme: "system" as const,
    locale: "en-CA",
    timeZone: "America/Toronto"
  };

  const projectedInput = presentationBridgeInputFromHostContext(
    hostContext,
    {
      systemResolvedTheme: "dark",
      density: "spacious",
      typography: {
        family: "system-ui",
        scale: 1.1,
        lineHeight: 1.6
      },
      designTokens: {
        colorAccent: "#6d28d9"
      },
      reducedMotion: "reduce",
      forcedColors: "none"
    }
  );
  const projected = createHostPresentationBridge(projectedInput);
  assert.equal(projected.theme.preference, "system");
  assert.equal(projected.theme.effective, "dark");
  assert.equal(projected.locale.canonical, "en-CA");
  assert.equal(projected.density, "spacious");

  expectBridgeError(
    () =>
      createHostPresentationBridge({
        theme: "system",
        density: "comfortable",
        typography: {
          family: "system-ui",
          scale: 1,
          lineHeight: 1.5
        },
        reducedMotion: "no-preference",
        forcedColors: "none",
        locale: "en-CA",
        timeZone: "America/Toronto"
      }),
    "theme_invalid"
  );

  expectBridgeError(
    () =>
      createHostPresentationBridge({
        theme: "light",
        density: "comfortable",
        typography: {
          family: "system-ui",
          scale: 2,
          lineHeight: 1.5
        },
        reducedMotion: "no-preference",
        forcedColors: "none",
        locale: "en-CA",
        timeZone: "America/Toronto"
      }),
    "typography_invalid"
  );

  expectBridgeError(
    () =>
      createHostPresentationBridge({
        theme: "light",
        density: "comfortable",
        typography: {
          family: "system-ui",
          scale: 1,
          lineHeight: 1.5
        },
        designTokens: {
          colorAccent: "url(javascript:alert(1))"
        },
        reducedMotion: "no-preference",
        forcedColors: "none",
        locale: "en-CA",
        timeZone: "America/Toronto"
      }),
    "design_token_invalid"
  );

  expectBridgeError(
    () =>
      createHostPresentationBridge({
        theme: "light",
        density: "comfortable",
        typography: {
          family: "system-ui",
          scale: 1,
          lineHeight: 1.5
        },
        designTokens: {
          colorAccent: "#ffffff",
          rawCss: "display:none"
        } as never,
        reducedMotion: "no-preference",
        forcedColors: "none",
        locale: "en-CA",
        timeZone: "America/Toronto"
      }),
    "design_token_invalid"
  );

  expectBridgeError(
    () =>
      createHostPresentationBridge({
        theme: "light",
        density: "comfortable",
        typography: {
          family: "system-ui",
          scale: 1,
          lineHeight: 1.5
        },
        reducedMotion: "no-preference",
        forcedColors: "none",
        locale: "not_a_locale",
        timeZone: "America/Toronto"
      }),
    "locale_invalid"
  );

  expectBridgeError(
    () =>
      createHostPresentationBridge({
        theme: "light",
        density: "comfortable",
        typography: {
          family: "system-ui",
          scale: 1,
          lineHeight: 1.5
        },
        reducedMotion: "no-preference",
        forcedColors: "none",
        locale: "en-CA",
        timeZone: "Mars/Olympus"
      }),
    "time_zone_invalid"
  );

  const focusInside = checkKeyboardFocusBoundary({
    boundaryId: "dialog-root",
    focusableElementIds: ["dialog-title", "dialog-accept", "dialog-cancel"],
    activeElementId: "dialog-accept"
  });
  assert.equal(focusInside.valid, true);
  assert.equal(focusInside.reason, "focus_inside_boundary");

  const focusOutside = checkKeyboardFocusBoundary({
    boundaryId: "dialog-root",
    focusableElementIds: ["dialog-accept", "dialog-cancel"],
    activeElementId: "page-navigation"
  });
  assert.equal(focusOutside.valid, false);
  assert.equal(focusOutside.reason, "focus_outside_boundary");

  const noFocus = checkKeyboardFocusBoundary({
    boundaryId: "surface-root",
    focusableElementIds: ["surface-action"],
    activeElementId: null
  });
  assert.equal(noFocus.valid, false);
  assert.equal(noFocus.reason, "no_active_focus");

  const emptyBoundary = checkKeyboardFocusBoundary({
    boundaryId: "surface-root",
    focusableElementIds: [],
    activeElementId: null
  });
  assert.equal(emptyBoundary.valid, false);
  assert.equal(
    emptyBoundary.reason,
    "boundary_has_no_focusable_elements"
  );

  const dialog = createAccessibleDialogContract({
    dialogId: "approval-dialog",
    labelledBy: "approval-dialog-title",
    describedBy: "approval-dialog-description",
    initialFocusId: "approval-cancel",
    focusableElementIds: [
      "approval-cancel",
      "approval-confirm"
    ],
    restoreFocusId: "open-approval-dialog",
    closeOnEscape: true
  });

  assert.equal(dialog.role, "dialog");
  assert.equal(dialog.ariaModal, true);
  assert.equal(dialog.keyboard.trapFocus, true);
  assert.equal(dialog.keyboard.cycleTabWithinDialog, true);
  assert.equal(dialog.keyboard.restoreFocusOnClose, true);
  assert.equal(dialog.security.securityIndicatorsMayBeHidden, false);
  assert.equal(dialog.security.approvalStatesMayBeHidden, false);
  assert.equal(dialog.security.dialogContractGrantsAuthorization, false);

  expectBridgeError(
    () =>
      createAccessibleDialogContract({
        dialogId: "approval-dialog",
        labelledBy: "approval-dialog-title",
        initialFocusId: "outside-dialog",
        focusableElementIds: ["approval-confirm"],
        restoreFocusId: "open-approval-dialog"
      }),
    "dialog_invalid"
  );

  const [
    bridgeSource,
    apiSource,
    manifestSource,
    docs,
    review,
    roadmap,
    webPackage
  ] = await Promise.all([
    source("lib/host-theme-accessibility-locale-bridge.ts"),
    source("app/api/module-presentation/route.ts"),
    source("lib/universal-module-contract.ts"),
    source("../../docs/BUILD_314_THEME_ACCESSIBILITY_LOCALE_BRIDGE.md"),
    source(
      "../../docs/integration/ql266-ai-data-platform-build314-review.json"
    ),
    source("../../docs/NEXT_BUILDS_306_330.md"),
    source("package.json")
  ]);

  for (const token of [
    "DESIGN_TOKEN_KEYS",
    "securityStatesStyleable: false",
    "approvalStatesStyleable: false",
    "stylingGrantsAuthorization: false",
    "hostColorsSuppressedByForcedColors",
    "checkKeyboardFocusBoundary",
    "createAccessibleDialogContract",
    "trapFocus: true",
    "restoreFocusOnClose: true"
  ]) {
    assert.ok(bridgeSource.includes(token), "Build 314 bridge missing " + token);
  }

  for (const token of [
    "semanticTokensOnly: true",
    "rawCssAccepted: false",
    "arbitrarySelectorsAccepted: false",
    "keyboardNavigationRequired: true",
    "focusBoundaryChecksSupported: true",
    "accessibleDialogContractSupported: true",
    "themeMayHideSecurityStates: false",
    "ql266ResumedByPresentationBridge: false"
  ]) {
    assert.ok(apiSource.includes(token), "Build 314 API missing " + token);
  }

  for (const token of [
    '"host-presentation-bridge-v1"',
    '"semantic-design-token-bridge-v1"',
    '"accessible-dialog-boundary-v1"',
    "hostStylingGrantsPlatformAuthority: false",
    "hostStylingMayHideSecurityStates: false",
    "hostStylingMayHideApprovalStates: false",
    "rawHostCssAccepted: false",
    "forcedColorsRemainAuthoritative: true",
    "reducedMotionRemainsAuthoritative: true"
  ]) {
    assert.ok(
      manifestSource.includes(token),
      "Build 314 manifest missing " + token
    );
  }

  for (const token of [
    "Build 314",
    "Raw CSS and arbitrary selectors are not accepted",
    "Reduced motion",
    "Forced colors",
    "Keyboard and focus boundary checks",
    "Accessible embedded-dialog behavior",
    "Build 315"
  ]) {
    assert.ok(docs.includes(token), "Build 314 docs missing " + token);
  }

  for (const token of [
    '"build": 314',
    '"connectionState": "DISCONNECTED / HOLD"',
    '"ql266Resumed": false',
    '"syntheticPresentationCertification": true',
    '"liveExternalHostThemeVerified": false'
  ]) {
    assert.ok(review.includes(token), "Build 314 review missing " + token);
  }

  assert.ok(
    roadmap.includes(
      "Build 314 — Theme, Design Token, Accessibility & Locale Bridge"
    )
  );
  assert.ok(
    roadmap.includes(
      "Build 315 — Universal Data Contract Resolver & Host Schema Discovery"
    )
  );
  assert.ok(
    webPackage.includes(
      "verify-build-314-theme-accessibility-locale-bridge.ts"
    )
  );

  console.log(
    "Build 314 verification passed: semantic host theme/design-token projection is bounded and raw-CSS free, density/typography adaptation is constrained, reduced motion and forced colors remain authoritative, BCP47/IANA locale context is validated, keyboard/focus boundaries and accessible dialogs are certified, styling cannot hide security/approval states, and QL-266 remains disconnected/held."
  );
}

void main();

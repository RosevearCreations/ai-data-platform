import {
  MODULE_SURFACES,
  type HostEnvironment
} from "./universal-module-contract";
import {
  normalizeTrustedOrigin,
  resolveEmbeddedSurface,
  type EmbeddedSurfaceId
} from "./embedded-module-runtime";

export const HOST_NAVIGATION_BRIDGE_VERSION = "1.0.0" as const;
export const HOST_NAVIGATION_REGISTRATION_SCHEMA =
  "rosevear.ai-data-platform.host-navigation-registration.v1" as const;
export const HOST_NAVIGATION_LAUNCH_SCHEMA =
  "rosevear.ai-data-platform.host-navigation-launch.v1" as const;

export type HostNavigationPlacement =
  | "primary"
  | "secondary"
  | "settings"
  | "contextual";

export type HostNavigationItemInput = {
  id: string;
  label: string;
  surfaceId: EmbeddedSurfaceId;
  placement: HostNavigationPlacement;
  commandId?: string;
  commandKeywords?: string[];
  requiredCapabilities?: string[];
};

export type HostNavigationItem = {
  id: string;
  label: string;
  surfaceId: EmbeddedSurfaceId;
  route: string;
  placement: HostNavigationPlacement;
  command: {
    id: string;
    label: string;
    keywords: string[];
  } | null;
  requiredCapabilities: string[];
  navigationGrantsAuthorization: false;
};

export type HostNavigationRegistrationInput = {
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  hostInstanceId: string;
  hostOrigin: string;
  moduleOrigin: string;
  auditCorrelationId: string;
  items: HostNavigationItemInput[];
  fallbackSurfaceId?: EmbeddedSurfaceId;
};

export type HostNavigationRegistration = {
  schema: typeof HOST_NAVIGATION_REGISTRATION_SCHEMA;
  version: typeof HOST_NAVIGATION_BRIDGE_VERSION;
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  hostInstanceId: string;
  hostOrigin: string;
  moduleOrigin: string;
  auditCorrelationId: string;
  items: HostNavigationItem[];
  fallbackSurfaceId: EmbeddedSurfaceId | null;
  security: {
    supportedSurfacesOnly: true;
    navigationGrantsAuthorization: false;
    deepLinksGrantAuthorization: false;
    commandPaletteGrantsAuthorization: false;
    rawSecretsAcceptedInLaunchContext: false;
    absoluteReturnUrlsAccepted: false;
  };
};

export type HostCommandPaletteEntry = {
  commandId: string;
  label: string;
  keywords: string[];
  navigationItemId: string;
  surfaceId: EmbeddedSurfaceId;
  route: string;
  requiredCapabilities: string[];
  commandGrantsAuthorization: false;
};

export type HostNavigationBreadcrumb = {
  id: string;
  label: string;
  surfaceId: EmbeddedSurfaceId;
  route: string;
  current: boolean;
};

export type HostNavigationBackStackEntry = {
  navigationItemId: string;
  surfaceId: EmbeddedSurfaceId;
  route: string;
};

export type HostNavigationLaunchContextValue =
  | string
  | number
  | boolean
  | null;

export type HostNavigationLaunchInput = {
  navigationItemId?: string;
  surfaceId?: string;
  route?: string;
  allowFallback?: boolean;
  returnPath?: string;
  context?: Record<string, HostNavigationLaunchContextValue>;
};

export type HostNavigationLaunch = {
  schema: typeof HOST_NAVIGATION_LAUNCH_SCHEMA;
  version: typeof HOST_NAVIGATION_BRIDGE_VERSION;
  navigationItemId: string | null;
  requestedTarget: string;
  resolvedSurfaceId: EmbeddedSurfaceId;
  resolvedRoute: string;
  moduleDeepLink: string;
  safeReturnToHost: string | null;
  context: Readonly<Record<string, HostNavigationLaunchContextValue>>;
  breadcrumb: HostNavigationBreadcrumb[];
  backStack: HostNavigationBackStackEntry[];
  fallback: {
    used: boolean;
    reason: "none" | "explicit_compatibility_fallback";
  };
  security: {
    launchGrantsAuthorization: false;
    returnOriginBoundToHost: true;
    contextualParametersAreNonAuthorizing: true;
    rawSecretsAccepted: false;
  };
};

export type HostNavigationBridgeAuditEvent = {
  schema: "rosevear.ai-data-platform.host-navigation-audit.v1";
  version: typeof HOST_NAVIGATION_BRIDGE_VERSION;
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  hostInstanceId: string;
  auditCorrelationId: string;
  requestedTarget: string;
  resolvedSurfaceId: EmbeddedSurfaceId;
  fallbackUsed: boolean;
  returnPathPresent: boolean;
  contextKeys: string[];
  occurredAt: string;
};

export type HostNavigationBridgeAuditSink = {
  record(event: HostNavigationBridgeAuditEvent): void | Promise<void>;
};

export type HostNavigationBridgeOptions = {
  auditSink?: HostNavigationBridgeAuditSink;
  now?: () => string;
};

export class HostNavigationBridgeError extends Error {
  readonly code:
    | "registration_invalid"
    | "navigation_item_invalid"
    | "duplicate_navigation_item"
    | "duplicate_command"
    | "unsupported_surface"
    | "unsupported_route"
    | "fallback_unavailable"
    | "return_path_invalid"
    | "launch_context_invalid";

  constructor(code: HostNavigationBridgeError["code"], message: string) {
    super(message);
    this.name = "HostNavigationBridgeError";
    this.code = code;
  }
}

const APPLICATION_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const OPAQUE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{0,127}$/;
const NAV_ID_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const COMMAND_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.:_-][a-z0-9]+)*$/;
const CAPABILITY_ID_PATTERN =
  /^[a-z][a-z0-9]*(?:[.:/_-][a-z0-9]+)*$/;
const CONTEXT_KEY_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const AUDIT_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{7,127}$/;
const SECRET_KEY_PATTERN =
  /(password|passwd|secret|token|cookie|authorization|credential|private[-_.]?key|api[-_.]?key|session)/i;
const BEARER_VALUE_PATTERN = /^bearer\s+/i;

function validOpaqueId(value: string) {
  return OPAQUE_ID_PATTERN.test(value);
}

function assertRegistrationIdentity(input: HostNavigationRegistrationInput) {
  if (
    !APPLICATION_ID_PATTERN.test(input.hostApplicationId) ||
    !validOpaqueId(input.hostInstanceId) ||
    !AUDIT_ID_PATTERN.test(input.auditCorrelationId)
  ) {
    throw new HostNavigationBridgeError(
      "registration_invalid",
      "Host navigation registration identity is invalid."
    );
  }
}

function normalizeLabel(value: string, field: string) {
  const label = value.trim();
  if (!label || label.length > 100 || /[\r\n\0]/.test(label)) {
    throw new HostNavigationBridgeError(
      "navigation_item_invalid",
      field + " is invalid."
    );
  }
  return label;
}

function normalizeKeywords(values: string[] | undefined) {
  const keywords = values ?? [];
  if (keywords.length > 20) {
    throw new HostNavigationBridgeError(
      "navigation_item_invalid",
      "Command palette keyword count is too large."
    );
  }

  return [
    ...new Set(
      keywords.map((value) => {
        const keyword = value.trim().toLowerCase();
        if (!keyword || keyword.length > 60 || /[\r\n\0]/.test(keyword)) {
          throw new HostNavigationBridgeError(
            "navigation_item_invalid",
            "Command palette keyword is invalid."
          );
        }
        return keyword;
      })
    )
  ];
}

function normalizeRequiredCapabilities(values: string[] | undefined) {
  const capabilities = [...new Set(values ?? [])];
  if (
    capabilities.length > 50 ||
    capabilities.some(
      (capability) =>
        !CAPABILITY_ID_PATTERN.test(capability) ||
        capability.length > 160
    )
  ) {
    throw new HostNavigationBridgeError(
      "navigation_item_invalid",
      "Navigation capability hint is invalid."
    );
  }
  return capabilities;
}

function normalizeReturnPath(value: string | undefined) {
  if (value === undefined) return null;
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\r\n\0]/.test(value) ||
    value.length > 1024
  ) {
    throw new HostNavigationBridgeError(
      "return_path_invalid",
      "Return path must be a safe host-relative path."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(value, "https://return.invalid");
  } catch {
    throw new HostNavigationBridgeError(
      "return_path_invalid",
      "Return path is invalid."
    );
  }

  if (parsed.origin !== "https://return.invalid") {
    throw new HostNavigationBridgeError(
      "return_path_invalid",
      "Return path may not change origin."
    );
  }

  return parsed.pathname + parsed.search + parsed.hash;
}

function normalizeLaunchContext(
  input: Record<string, HostNavigationLaunchContextValue> | undefined
) {
  const context = input ?? {};
  const keys = Object.keys(context);
  if (keys.length > 20) {
    throw new HostNavigationBridgeError(
      "launch_context_invalid",
      "Launch context contains too many parameters."
    );
  }

  const normalized: Record<string, HostNavigationLaunchContextValue> = {};
  let encodedLength = 0;

  for (const key of keys.sort()) {
    const value = context[key];

    if (
      !CONTEXT_KEY_PATTERN.test(key) ||
      key.length > 80 ||
      SECRET_KEY_PATTERN.test(key)
    ) {
      throw new HostNavigationBridgeError(
        "launch_context_invalid",
        "Launch context key is invalid or secret-like."
      );
    }

    if (
      !(
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      )
    ) {
      throw new HostNavigationBridgeError(
        "launch_context_invalid",
        "Launch context values must be scalar."
      );
    }

    if (
      typeof value === "number" &&
      !Number.isFinite(value)
    ) {
      throw new HostNavigationBridgeError(
        "launch_context_invalid",
        "Launch context numeric values must be finite."
      );
    }

    if (
      typeof value === "string" &&
      (value.length > 240 ||
        /[\r\n\0]/.test(value) ||
        BEARER_VALUE_PATTERN.test(value))
    ) {
      throw new HostNavigationBridgeError(
        "launch_context_invalid",
        "Launch context string is invalid or credential-like."
      );
    }

    const encoded = JSON.stringify(value);
    encodedLength += key.length + encoded.length;
    normalized[key] = value;
  }

  if (encodedLength > 2048) {
    throw new HostNavigationBridgeError(
      "launch_context_invalid",
      "Launch context is too large."
    );
  }

  return Object.freeze(normalized);
}

function routeToSurface(route: string) {
  return MODULE_SURFACES.find((surface) => surface.route === route) ?? null;
}

function safeHostReturnUrl(hostOrigin: string, returnPath: string | null) {
  if (!returnPath) return null;
  return new URL(returnPath, hostOrigin).toString();
}

function buildModuleDeepLink(input: {
  moduleOrigin: string;
  route: string;
  hostApplicationId: string;
  hostEnvironment: HostEnvironment;
  hostInstanceId: string;
  auditCorrelationId: string;
  returnPath: string | null;
  context: Readonly<Record<string, HostNavigationLaunchContextValue>>;
}) {
  const url = new URL(input.route, input.moduleOrigin);
  url.searchParams.set("hostApplicationId", input.hostApplicationId);
  url.searchParams.set("hostEnvironment", input.hostEnvironment);
  url.searchParams.set("hostInstanceId", input.hostInstanceId);
  url.searchParams.set("auditCorrelationId", input.auditCorrelationId);

  if (input.returnPath) {
    url.searchParams.set("returnPath", input.returnPath);
  }

  for (const [key, value] of Object.entries(input.context)) {
    url.searchParams.set(
      "ctx." + key,
      value === null ? "null" : String(value)
    );
  }

  return url.toString();
}

function createBreadcrumbs(
  items: HostNavigationItem[],
  currentItem: HostNavigationItem | null,
  surfaceId: EmbeddedSurfaceId
): HostNavigationBreadcrumb[] {
  const current =
    currentItem ??
    items.find((item) => item.surfaceId === surfaceId) ??
    null;

  if (!current) {
    const surface = resolveEmbeddedSurface(surfaceId);
    return [
      {
        id: "module",
        label: "AI Data Platform",
        surfaceId,
        route: surface.route,
        current: true
      }
    ];
  }

  return [
    {
      id: "module",
      label: "AI Data Platform",
      surfaceId: current.surfaceId,
      route: current.route,
      current: false
    },
    {
      id: current.id,
      label: current.label,
      surfaceId: current.surfaceId,
      route: current.route,
      current: true
    }
  ];
}

export class HostNavigationBridge {
  readonly schema = HOST_NAVIGATION_REGISTRATION_SCHEMA;
  readonly version = HOST_NAVIGATION_BRIDGE_VERSION;

  private readonly registration: HostNavigationRegistration;
  private readonly options: HostNavigationBridgeOptions;
  private readonly stack: HostNavigationBackStackEntry[] = [];

  constructor(
    input: HostNavigationRegistrationInput,
    options: HostNavigationBridgeOptions = {}
  ) {
    assertRegistrationIdentity(input);

    const hostOrigin = normalizeTrustedOrigin(input.hostOrigin);
    const moduleOrigin = normalizeTrustedOrigin(input.moduleOrigin);
    const ids = new Set<string>();
    const commands = new Set<string>();

    const items = input.items.map((item): HostNavigationItem => {
      if (
        !NAV_ID_PATTERN.test(item.id) ||
        item.id.length > 100
      ) {
        throw new HostNavigationBridgeError(
          "navigation_item_invalid",
          "Navigation item ID is invalid."
        );
      }
      if (ids.has(item.id)) {
        throw new HostNavigationBridgeError(
          "duplicate_navigation_item",
          "Navigation item IDs must be unique."
        );
      }
      ids.add(item.id);

      const surface = resolveEmbeddedSurface(item.surfaceId);
      const label = normalizeLabel(item.label, "Navigation label");
      const requiredCapabilities = normalizeRequiredCapabilities(
        item.requiredCapabilities
      );

      let command: HostNavigationItem["command"] = null;
      if (item.commandId !== undefined) {
        if (
          !COMMAND_ID_PATTERN.test(item.commandId) ||
          item.commandId.length > 120
        ) {
          throw new HostNavigationBridgeError(
            "navigation_item_invalid",
            "Command ID is invalid."
          );
        }
        if (commands.has(item.commandId)) {
          throw new HostNavigationBridgeError(
            "duplicate_command",
            "Command IDs must be unique."
          );
        }
        commands.add(item.commandId);
        command = {
          id: item.commandId,
          label,
          keywords: normalizeKeywords(item.commandKeywords)
        };
      } else if (item.commandKeywords?.length) {
        throw new HostNavigationBridgeError(
          "navigation_item_invalid",
          "Command keywords require a command ID."
        );
      }

      return {
        id: item.id,
        label,
        surfaceId: surface.id,
        route: surface.route,
        placement: item.placement,
        command,
        requiredCapabilities,
        navigationGrantsAuthorization: false
      };
    });

    let fallbackSurfaceId: EmbeddedSurfaceId | null = null;
    if (input.fallbackSurfaceId !== undefined) {
      fallbackSurfaceId = resolveEmbeddedSurface(
        input.fallbackSurfaceId
      ).id;
    }

    this.registration = Object.freeze({
      schema: HOST_NAVIGATION_REGISTRATION_SCHEMA,
      version: HOST_NAVIGATION_BRIDGE_VERSION,
      hostApplicationId: input.hostApplicationId,
      hostEnvironment: input.hostEnvironment,
      hostInstanceId: input.hostInstanceId,
      hostOrigin,
      moduleOrigin,
      auditCorrelationId: input.auditCorrelationId,
      items,
      fallbackSurfaceId,
      security: {
        supportedSurfacesOnly: true,
        navigationGrantsAuthorization: false,
        deepLinksGrantAuthorization: false,
        commandPaletteGrantsAuthorization: false,
        rawSecretsAcceptedInLaunchContext: false,
        absoluteReturnUrlsAccepted: false
      }
    });
    this.options = options;
  }

  get descriptor(): HostNavigationRegistration {
    return this.registration;
  }

  listNavigationItems() {
    return this.registration.items.map((item) => ({
      ...item,
      command: item.command
        ? { ...item.command, keywords: [...item.command.keywords] }
        : null,
      requiredCapabilities: [...item.requiredCapabilities]
    }));
  }

  listCommandPaletteEntries(): HostCommandPaletteEntry[] {
    return this.registration.items
      .filter((item) => item.command !== null)
      .map((item) => ({
        commandId: item.command!.id,
        label: item.command!.label,
        keywords: [...item.command!.keywords],
        navigationItemId: item.id,
        surfaceId: item.surfaceId,
        route: item.route,
        requiredCapabilities: [...item.requiredCapabilities],
        commandGrantsAuthorization: false
      }));
  }

  getBackStack(): HostNavigationBackStackEntry[] {
    return this.stack.map((entry) => ({ ...entry }));
  }

  popBackStack(): HostNavigationBackStackEntry | null {
    const value = this.stack.pop();
    return value ? { ...value } : null;
  }

  async launch(input: HostNavigationLaunchInput): Promise<HostNavigationLaunch> {
    const targets = [
      input.navigationItemId !== undefined,
      input.surfaceId !== undefined,
      input.route !== undefined
    ].filter(Boolean).length;

    if (targets !== 1) {
      throw new HostNavigationBridgeError(
        "navigation_item_invalid",
        "Launch must specify exactly one navigation item, surface ID or module route."
      );
    }

    const returnPath = normalizeReturnPath(input.returnPath);
    const context = normalizeLaunchContext(input.context);
    let currentItem: HostNavigationItem | null = null;
    let surfaceId: EmbeddedSurfaceId | null = null;
    let requestedTarget = "";
    let fallbackUsed = false;

    if (input.navigationItemId !== undefined) {
      requestedTarget = input.navigationItemId;
      currentItem =
        this.registration.items.find(
          (item) => item.id === input.navigationItemId
        ) ?? null;
      if (currentItem) {
        surfaceId = currentItem.surfaceId;
      }
    } else if (input.surfaceId !== undefined) {
      requestedTarget = input.surfaceId;
      try {
        surfaceId = resolveEmbeddedSurface(input.surfaceId).id;
      } catch {
        surfaceId = null;
      }
    } else if (input.route !== undefined) {
      requestedTarget = input.route;
      const surface = routeToSurface(input.route);
      surfaceId = surface?.id ?? null;
    }

    if (!surfaceId) {
      if (!input.allowFallback) {
        throw new HostNavigationBridgeError(
          input.route !== undefined
            ? "unsupported_route"
            : "unsupported_surface",
          "Requested navigation target is unsupported and fallback was not explicitly allowed."
        );
      }

      if (!this.registration.fallbackSurfaceId) {
        throw new HostNavigationBridgeError(
          "fallback_unavailable",
          "No registered compatibility fallback surface is available."
        );
      }

      surfaceId = this.registration.fallbackSurfaceId;
      fallbackUsed = true;
      currentItem =
        this.registration.items.find(
          (item) => item.surfaceId === surfaceId
        ) ?? null;
    }

    const surface = resolveEmbeddedSurface(surfaceId);
    if (!currentItem) {
      currentItem =
        this.registration.items.find(
          (item) => item.surfaceId === surface.id
        ) ?? null;
    }

    if (this.stack.length >= 20) {
      this.stack.shift();
    }

    if (currentItem) {
      const previous = this.stack.at(-1);
      if (
        !previous ||
        previous.navigationItemId !== currentItem.id ||
        previous.surfaceId !== currentItem.surfaceId
      ) {
        this.stack.push({
          navigationItemId: currentItem.id,
          surfaceId: currentItem.surfaceId,
          route: currentItem.route
        });
      }
    }

    const moduleDeepLink = buildModuleDeepLink({
      moduleOrigin: this.registration.moduleOrigin,
      route: surface.route,
      hostApplicationId: this.registration.hostApplicationId,
      hostEnvironment: this.registration.hostEnvironment,
      hostInstanceId: this.registration.hostInstanceId,
      auditCorrelationId: this.registration.auditCorrelationId,
      returnPath,
      context
    });

    const launch: HostNavigationLaunch = Object.freeze({
      schema: HOST_NAVIGATION_LAUNCH_SCHEMA,
      version: HOST_NAVIGATION_BRIDGE_VERSION,
      navigationItemId: currentItem?.id ?? null,
      requestedTarget,
      resolvedSurfaceId: surface.id,
      resolvedRoute: surface.route,
      moduleDeepLink,
      safeReturnToHost: safeHostReturnUrl(
        this.registration.hostOrigin,
        returnPath
      ),
      context,
      breadcrumb: createBreadcrumbs(
        this.registration.items,
        currentItem,
        surface.id
      ),
      backStack: this.getBackStack(),
      fallback: {
        used: fallbackUsed,
        reason: fallbackUsed
          ? "explicit_compatibility_fallback"
          : "none"
      },
      security: {
        launchGrantsAuthorization: false,
        returnOriginBoundToHost: true,
        contextualParametersAreNonAuthorizing: true,
        rawSecretsAccepted: false
      }
    });

    await this.options.auditSink?.record({
      schema: "rosevear.ai-data-platform.host-navigation-audit.v1",
      version: HOST_NAVIGATION_BRIDGE_VERSION,
      hostApplicationId: this.registration.hostApplicationId,
      hostEnvironment: this.registration.hostEnvironment,
      hostInstanceId: this.registration.hostInstanceId,
      auditCorrelationId: this.registration.auditCorrelationId,
      requestedTarget,
      resolvedSurfaceId: surface.id,
      fallbackUsed,
      returnPathPresent: returnPath !== null,
      contextKeys: Object.keys(context),
      occurredAt: this.options.now?.() ?? new Date().toISOString()
    });

    return launch;
  }
}

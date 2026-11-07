import {
  EMBEDDED_MODULE_ELEMENT_TAG,
  resolveEmbeddedSurface,
  normalizeTrustedOrigin
} from "./embedded-module-runtime";
import {
  MODULE_HEADLESS_CAPABILITIES,
  type HostEnvironment,
  type HostRuntimeContext,
  type ModuleHeadlessCapability
} from "./universal-module-contract";

export const MODULE_HOST_ADAPTER_PACK_VERSION = "1.0.0" as const;
export const MODULE_HOST_ADAPTER_PACK_SCHEMA =
  "rosevear.ai-data-platform.host-adapter-pack.v1" as const;
export const MODULE_HOST_SCAFFOLD_SCHEMA =
  "rosevear.ai-data-platform.host-scaffold.v1" as const;

export const MODULE_HOST_ADAPTER_KINDS = [
  "react",
  "nextjs",
  "vite",
  "vanilla",
  "electron"
] as const;

export type ModuleHostAdapterKind =
  (typeof MODULE_HOST_ADAPTER_KINDS)[number];

export type ModuleHostAdapterDefinition = {
  kind: ModuleHostAdapterKind;
  adapterId: string;
  displayName: string;
  runtime: "browser" | "desktop-web-shell";
  moduleOriginSource: string;
  rendererIsolationRequired: boolean;
  supportsCustomElement: true;
  supportsIframeFallback: true;
  credentialsInSourceAllowed: false;
  mountGrantsAuthorization: false;
};

export type ModuleHostScaffoldRequest = {
  adapter: ModuleHostAdapterKind;
  hostApplicationId: string;
  environment: HostEnvironment;
  defaultSurface: string;
  requestedCapabilities?: ModuleHeadlessCapability[];
};

export type ModuleHostScaffoldFile = {
  path: string;
  content: string;
};

export type ModuleHostScaffold = {
  schema: typeof MODULE_HOST_SCAFFOLD_SCHEMA;
  packVersion: typeof MODULE_HOST_ADAPTER_PACK_VERSION;
  adapter: ModuleHostAdapterDefinition;
  hostApplicationId: string;
  environment: HostEnvironment;
  defaultSurface: string;
  requestedCapabilities: ModuleHeadlessCapability[];
  files: ModuleHostScaffoldFile[];
  security: {
    generatedCredentials: false;
    credentialsEmbeddedInSource: false;
    moduleOriginComesFromRuntimeConfiguration: true;
    mountGrantsAuthorization: false;
    hostContextStillRequiresIndependentValidation: true;
  };
};

const APPLICATION_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;

const ADAPTER_DEFINITIONS: Readonly<
  Record<ModuleHostAdapterKind, ModuleHostAdapterDefinition>
> = Object.freeze({
  react: Object.freeze({
    kind: "react",
    adapterId: "rosevear.module-host.react",
    displayName: "React",
    runtime: "browser",
    moduleOriginSource: "VITE_AI_DATA_MODULE_ORIGIN",
    rendererIsolationRequired: false,
    supportsCustomElement: true,
    supportsIframeFallback: true,
    credentialsInSourceAllowed: false,
    mountGrantsAuthorization: false
  }),
  nextjs: Object.freeze({
    kind: "nextjs",
    adapterId: "rosevear.module-host.nextjs",
    displayName: "Next.js",
    runtime: "browser",
    moduleOriginSource: "NEXT_PUBLIC_AI_DATA_MODULE_ORIGIN",
    rendererIsolationRequired: false,
    supportsCustomElement: true,
    supportsIframeFallback: true,
    credentialsInSourceAllowed: false,
    mountGrantsAuthorization: false
  }),
  vite: Object.freeze({
    kind: "vite",
    adapterId: "rosevear.module-host.vite",
    displayName: "Vite",
    runtime: "browser",
    moduleOriginSource: "VITE_AI_DATA_MODULE_ORIGIN",
    rendererIsolationRequired: false,
    supportsCustomElement: true,
    supportsIframeFallback: true,
    credentialsInSourceAllowed: false,
    mountGrantsAuthorization: false
  }),
  vanilla: Object.freeze({
    kind: "vanilla",
    adapterId: "rosevear.module-host.vanilla",
    displayName: "Vanilla browser JavaScript",
    runtime: "browser",
    moduleOriginSource: "window.AI_DATA_MODULE_CONFIG.moduleOrigin",
    rendererIsolationRequired: false,
    supportsCustomElement: true,
    supportsIframeFallback: true,
    credentialsInSourceAllowed: false,
    mountGrantsAuthorization: false
  }),
  electron: Object.freeze({
    kind: "electron",
    adapterId: "rosevear.module-host.electron",
    displayName: "Electron / desktop web shell",
    runtime: "desktop-web-shell",
    moduleOriginSource: "preload contextBridge configuration",
    rendererIsolationRequired: true,
    supportsCustomElement: true,
    supportsIframeFallback: true,
    credentialsInSourceAllowed: false,
    mountGrantsAuthorization: false
  })
});

function assertApplicationId(value: string) {
  if (
    !APPLICATION_ID_PATTERN.test(value) ||
    value.length > 120
  ) {
    throw new Error(
      "Host application ID must be a stable lowercase dotted identifier."
    );
  }
}

function requestedCapabilities(
  values: ModuleHeadlessCapability[] | undefined
): ModuleHeadlessCapability[] {
  const capabilities = values ?? ["manifest.read"];
  const allowed = new Set<string>(MODULE_HEADLESS_CAPABILITIES);

  if (
    capabilities.length === 0 ||
    capabilities.length > MODULE_HEADLESS_CAPABILITIES.length ||
    new Set(capabilities).size !== capabilities.length ||
    capabilities.some((value) => !allowed.has(value))
  ) {
    throw new Error(
      "Requested capabilities must be a unique non-empty subset of the module manifest."
    );
  }

  return [...capabilities];
}

function json(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function readme(input: {
  definition: ModuleHostAdapterDefinition;
  hostApplicationId: string;
  environment: HostEnvironment;
  surface: string;
}) {
  return `# AI Data Platform host scaffold — ${input.definition.displayName}

This scaffold was generated from Build 309 of the AI Data Platform universal module contract.

Host application: \`${input.hostApplicationId}\`
Environment: \`${input.environment}\`
Default surface: \`${input.surface}\`

Security boundary:

- The scaffold contains no password, cookie, bearer credential, API secret or private key.
- The module origin is supplied at runtime from \`${input.definition.moduleOriginSource}\`.
- Mounting the UI does not grant a capability or authorize a peer connection.
- Host identity, user context, tenant/workspace mapping and capability grants remain independently validated by the module.
- Build 310 will add the authenticated user-context bridge; do not improvise one by forwarding raw cookies or tokens.

The module host must explicitly allow its HTTPS origin in the AI Data Platform \`AI_DATA_EMBED_ALLOWED_HOST_ORIGINS\` server configuration before external framing will work.
`;
}

function hostContextSource(input: {
  hostApplicationId: string;
  environment: HostEnvironment;
  capabilities: ModuleHeadlessCapability[];
}) {
  return `export function createAiDataHostContext(input: {
  hostInstanceId: string;
  subjectId: string;
  tenantId: string;
  workspaceId: string;
  auditCorrelationId: string;
}) {
  return {
    hostContractVersion: 1,
    hostApplication: {
      id: ${json(input.hostApplicationId)},
      environment: ${json(input.environment)},
      instanceId: input.hostInstanceId
    },
    subject: {
      id: input.subjectId
    },
    tenancy: {
      tenantId: input.tenantId,
      workspaceId: input.workspaceId
    },
    requestedCapabilities: ${json(input.capabilities)},
    auditCorrelationId: input.auditCorrelationId
  };
}

// This object is context input only. It is not an authorization grant.
`;
}

function browserElementHelperSource(moduleOriginExpression: string) {
  return `const AI_DATA_MODULE_TAG = ${json(EMBEDDED_MODULE_ELEMENT_TAG)};

export function mountAiDataModule(input) {
  if (!input?.target) throw new Error("A mount target is required.");
  if (!input.auditCorrelationId) {
    throw new Error("An audit correlation ID is required.");
  }

  const moduleOrigin = ${moduleOriginExpression};
  if (!moduleOrigin) {
    throw new Error("AI Data Platform module origin is not configured.");
  }

  const element = document.createElement(AI_DATA_MODULE_TAG);
  element.setAttribute("module-origin", moduleOrigin);
  element.setAttribute("surface", input.surface);
  element.setAttribute("audit-correlation-id", input.auditCorrelationId);
  input.target.replaceChildren(element);

  return () => {
    if (element.parentNode === input.target) {
      input.target.replaceChildren();
    }
  };
}
`;
}

function reactFiles(input: {
  hostApplicationId: string;
  environment: HostEnvironment;
  surface: string;
  capabilities: ModuleHeadlessCapability[];
}): ModuleHostScaffoldFile[] {
  return [
    {
      path: "src/ai-data/AiDataModule.tsx",
      content: `import { useEffect, useRef } from "react";

const AI_DATA_MODULE_TAG = ${json(EMBEDDED_MODULE_ELEMENT_TAG)};

export function AiDataModule({
  surface = ${json(input.surface)},
  auditCorrelationId
}: {
  surface?: string;
  auditCorrelationId: string;
}) {
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    const moduleOrigin = import.meta.env.VITE_AI_DATA_MODULE_ORIGIN;
    if (!target || !moduleOrigin) return;

    const element = document.createElement(AI_DATA_MODULE_TAG);
    element.setAttribute("module-origin", moduleOrigin);
    element.setAttribute("surface", surface);
    element.setAttribute("audit-correlation-id", auditCorrelationId);
    target.replaceChildren(element);

    return () => target.replaceChildren();
  }, [surface, auditCorrelationId]);

  return <div ref={targetRef} />;
}
`
    },
    {
      path: "src/ai-data/host-context.ts",
      content: hostContextSource(input)
    },
    {
      path: ".env.example",
      content: "VITE_AI_DATA_MODULE_ORIGIN=https://your-ai-data-platform.example\n"
    }
  ];
}

function nextFiles(input: {
  hostApplicationId: string;
  environment: HostEnvironment;
  surface: string;
  capabilities: ModuleHeadlessCapability[];
}): ModuleHostScaffoldFile[] {
  return [
    {
      path: "app/ai-data/AiDataModule.tsx",
      content: `"use client";

import { useEffect, useRef } from "react";

const AI_DATA_MODULE_TAG = ${json(EMBEDDED_MODULE_ELEMENT_TAG)};

export function AiDataModule({
  surface = ${json(input.surface)},
  auditCorrelationId
}: {
  surface?: string;
  auditCorrelationId: string;
}) {
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    const moduleOrigin = process.env.NEXT_PUBLIC_AI_DATA_MODULE_ORIGIN;
    if (!target || !moduleOrigin) return;

    const element = document.createElement(AI_DATA_MODULE_TAG);
    element.setAttribute("module-origin", moduleOrigin);
    element.setAttribute("surface", surface);
    element.setAttribute("audit-correlation-id", auditCorrelationId);
    target.replaceChildren(element);

    return () => target.replaceChildren();
  }, [surface, auditCorrelationId]);

  return <div ref={targetRef} />;
}
`
    },
    {
      path: "app/ai-data/page.tsx",
      content: `import { AiDataModule } from "./AiDataModule";

export default function AiDataPage() {
  return (
    <AiDataModule
      auditCorrelationId={"ui_" + crypto.randomUUID()}
      surface=${json(input.surface)}
    />
  );
}
`
    },
    {
      path: "lib/ai-data-host-context.ts",
      content: hostContextSource(input)
    },
    {
      path: ".env.example",
      content:
        "NEXT_PUBLIC_AI_DATA_MODULE_ORIGIN=https://your-ai-data-platform.example\n"
    }
  ];
}

function viteFiles(input: {
  hostApplicationId: string;
  environment: HostEnvironment;
  surface: string;
  capabilities: ModuleHeadlessCapability[];
}): ModuleHostScaffoldFile[] {
  return [
    {
      path: "src/ai-data-module.js",
      content: browserElementHelperSource(
        "import.meta.env.VITE_AI_DATA_MODULE_ORIGIN"
      )
    },
    {
      path: "src/ai-data-host-context.ts",
      content: hostContextSource(input)
    },
    {
      path: "src/main.js",
      content: `import { mountAiDataModule } from "./ai-data-module.js";

const target = document.querySelector("#ai-data-module");
if (!target) throw new Error("Missing #ai-data-module target.");

mountAiDataModule({
  target,
  surface: ${json(input.surface)},
  auditCorrelationId: "ui_" + crypto.randomUUID()
});
`
    },
    {
      path: ".env.example",
      content: "VITE_AI_DATA_MODULE_ORIGIN=https://your-ai-data-platform.example\n"
    }
  ];
}

function vanillaFiles(input: {
  hostApplicationId: string;
  environment: HostEnvironment;
  surface: string;
  capabilities: ModuleHeadlessCapability[];
}): ModuleHostScaffoldFile[] {
  return [
    {
      path: "config.example.js",
      content: `window.AI_DATA_MODULE_CONFIG = Object.freeze({
  moduleOrigin: "https://your-ai-data-platform.example"
});
`
    },
    {
      path: "ai-data-module.js",
      content: browserElementHelperSource(
        "window.AI_DATA_MODULE_CONFIG?.moduleOrigin"
      )
    },
    {
      path: "main.js",
      content: `import { mountAiDataModule } from "./ai-data-module.js";

const target = document.querySelector("#ai-data-module");
if (!target) throw new Error("Missing #ai-data-module target.");

mountAiDataModule({
  target,
  surface: ${json(input.surface)},
  auditCorrelationId: "ui_" + crypto.randomUUID()
});
`
    },
    {
      path: "host-context.js",
      content: hostContextSource(input)
    }
  ];
}

function electronFiles(input: {
  hostApplicationId: string;
  environment: HostEnvironment;
  surface: string;
  capabilities: ModuleHeadlessCapability[];
}): ModuleHostScaffoldFile[] {
  return [
    {
      path: "src/main/ai-data-window.ts",
      content: `import { BrowserWindow } from "electron";

export function createAiDataWindow(preloadPath: string) {
  return new BrowserWindow({
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
}
`
    },
    {
      path: "src/preload/ai-data-preload.ts",
      content: `import { contextBridge } from "electron";

const moduleOrigin = process.env.AI_DATA_MODULE_ORIGIN;
if (!moduleOrigin) {
  throw new Error("AI_DATA_MODULE_ORIGIN is required.");
}

contextBridge.exposeInMainWorld(
  "AI_DATA_MODULE_CONFIG",
  Object.freeze({ moduleOrigin })
);
`
    },
    {
      path: "src/renderer/ai-data-module.js",
      content: browserElementHelperSource(
        "window.AI_DATA_MODULE_CONFIG?.moduleOrigin"
      )
    },
    {
      path: "src/renderer/main.js",
      content: `import { mountAiDataModule } from "./ai-data-module.js";

const target = document.querySelector("#ai-data-module");
if (!target) throw new Error("Missing #ai-data-module target.");

mountAiDataModule({
  target,
  surface: ${json(input.surface)},
  auditCorrelationId: "desktop_" + crypto.randomUUID()
});
`
    },
    {
      path: "src/renderer/ai-data-host-context.ts",
      content: hostContextSource(input)
    },
    {
      path: ".env.example",
      content: "AI_DATA_MODULE_ORIGIN=https://your-ai-data-platform.example\n"
    }
  ];
}

export function listModuleHostAdapters(): ModuleHostAdapterDefinition[] {
  return MODULE_HOST_ADAPTER_KINDS.map((kind) => ({
    ...ADAPTER_DEFINITIONS[kind]
  }));
}

export function getModuleHostAdapter(
  kind: ModuleHostAdapterKind
): ModuleHostAdapterDefinition {
  const definition = ADAPTER_DEFINITIONS[kind];
  if (!definition) {
    throw new Error("Unsupported AI Data Platform host adapter.");
  }
  return { ...definition };
}

export function createModuleHostContext(input: {
  hostApplicationId: string;
  environment: HostEnvironment;
  hostInstanceId: string;
  subjectId: string;
  tenantId: string;
  workspaceId: string;
  auditCorrelationId: string;
  requestedCapabilities?: ModuleHeadlessCapability[];
}): HostRuntimeContext {
  assertApplicationId(input.hostApplicationId);

  return {
    hostContractVersion: 1,
    hostApplication: {
      id: input.hostApplicationId,
      environment: input.environment,
      instanceId: input.hostInstanceId
    },
    subject: {
      id: input.subjectId
    },
    tenancy: {
      tenantId: input.tenantId,
      workspaceId: input.workspaceId
    },
    requestedCapabilities: requestedCapabilities(input.requestedCapabilities),
    auditCorrelationId: input.auditCorrelationId
  };
}

export function generateModuleHostScaffold(
  request: ModuleHostScaffoldRequest
): ModuleHostScaffold {
  assertApplicationId(request.hostApplicationId);
  const definition = getModuleHostAdapter(request.adapter);
  const surface = resolveEmbeddedSurface(request.defaultSurface);
  const capabilities = requestedCapabilities(request.requestedCapabilities);

  const templateInput = {
    hostApplicationId: request.hostApplicationId,
    environment: request.environment,
    surface: surface.id,
    capabilities
  };

  let files: ModuleHostScaffoldFile[];
  switch (request.adapter) {
    case "react":
      files = reactFiles(templateInput);
      break;
    case "nextjs":
      files = nextFiles(templateInput);
      break;
    case "vite":
      files = viteFiles(templateInput);
      break;
    case "vanilla":
      files = vanillaFiles(templateInput);
      break;
    case "electron":
      files = electronFiles(templateInput);
      break;
    default:
      throw new Error("Unsupported AI Data Platform host adapter.");
  }

  files = [
    {
      path: "README.ai-data-module.md",
      content: readme({
        definition,
        hostApplicationId: request.hostApplicationId,
        environment: request.environment,
        surface: surface.id
      })
    },
    ...files
  ];

  return {
    schema: MODULE_HOST_SCAFFOLD_SCHEMA,
    packVersion: MODULE_HOST_ADAPTER_PACK_VERSION,
    adapter: definition,
    hostApplicationId: request.hostApplicationId,
    environment: request.environment,
    defaultSurface: surface.id,
    requestedCapabilities: capabilities,
    files,
    security: {
      generatedCredentials: false,
      credentialsEmbeddedInSource: false,
      moduleOriginComesFromRuntimeConfiguration: true,
      mountGrantsAuthorization: false,
      hostContextStillRequiresIndependentValidation: true
    }
  };
}

export function validateModuleOriginForHostAdapter(value: string) {
  return normalizeTrustedOrigin(value);
}

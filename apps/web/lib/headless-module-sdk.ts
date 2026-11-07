import {
  AI_DATA_MODULE_ID,
  AI_DATA_MODULE_VERSION,
  MODULE_HEADLESS_CAPABILITIES,
  type HostRuntimeContext,
  type ModuleHeadlessCapability,
  type ModuleRuntimeIdentity,
  createModuleRuntimeIdentity,
  validateUniversalHostContext
} from "./universal-module-contract";

export const HEADLESS_MODULE_SDK_VERSION = "1.0.0" as const;
export const HEADLESS_MODULE_SDK_SCHEMA =
  "rosevear.ai-data-platform.headless-module-sdk.v1" as const;

type MaybePromise<T> = T | Promise<T>;

export type HeadlessModuleRetryHint =
  | {
      strategy: "never";
      reason: string;
    }
  | {
      strategy: "safe";
      reason: string;
    }
  | {
      strategy: "after";
      reason: string;
      afterMs: number;
    };

export type HeadlessModuleSdkErrorCode =
  | "sdk_already_initialized"
  | "sdk_not_initialized"
  | "host_context_invalid"
  | "adapter_initialize_failed"
  | "adapter_teardown_failed"
  | "unsupported_capability"
  | "capability_not_requested"
  | "capability_denied"
  | "operation_invalid"
  | "invocation_failed";

export class HeadlessModuleSdkError extends Error {
  readonly code: HeadlessModuleSdkErrorCode;
  readonly retryHint: HeadlessModuleRetryHint;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(input: {
    code: HeadlessModuleSdkErrorCode;
    message: string;
    retryHint: HeadlessModuleRetryHint;
    details?: Record<string, unknown>;
  }) {
    super(input.message);
    this.name = "HeadlessModuleSdkError";
    this.code = input.code;
    this.retryHint = Object.freeze({ ...input.retryHint });
    this.details = Object.freeze({ ...(input.details ?? {}) });
  }
}

export type HeadlessModuleContextProvider = {
  getContext(): MaybePromise<unknown>;
};

export type HeadlessModuleLifecycleEvent =
  | {
      type: "initialized";
      runtimeIdentity: ModuleRuntimeIdentity;
      occurredAt: string;
    }
  | {
      type: "teardown";
      runtimeIdentity: ModuleRuntimeIdentity;
      occurredAt: string;
    };

export type HeadlessModuleAuditEvent = {
  schema: "rosevear.ai-data-platform.headless-module-audit.v1";
  sdkVersion: typeof HEADLESS_MODULE_SDK_VERSION;
  requestId: string;
  auditCorrelationId: string;
  moduleInstanceId: string;
  hostApplicationId: string;
  hostEnvironment: ModuleRuntimeIdentity["hostEnvironment"];
  tenantId: string;
  workspaceId: string;
  capability: ModuleHeadlessCapability;
  operation: string;
  status: "requested" | "authorized" | "denied" | "succeeded" | "failed";
  occurredAt: string;
  errorCode?: HeadlessModuleSdkErrorCode;
};

export type HeadlessModuleHostAdapter = {
  adapterId: string;
  adapterVersion: string;
  contextProvider: HeadlessModuleContextProvider;
  onLifecycle?(event: HeadlessModuleLifecycleEvent): MaybePromise<void>;
  onAudit?(event: HeadlessModuleAuditEvent): MaybePromise<void>;
};

export type HeadlessModuleAuthorizationRequest = {
  schema: "rosevear.ai-data-platform.headless-module-authorization.v1";
  requestId: string;
  auditCorrelationId: string;
  runtimeIdentity: ModuleRuntimeIdentity;
  capability: ModuleHeadlessCapability;
  operation: string;
};

export type HeadlessModuleAuthorizationDecision = {
  allowed: boolean;
  reason: string;
  retryHint?: HeadlessModuleRetryHint;
};

export type HeadlessModuleCapabilityAuthorizer = {
  authorize(
    request: HeadlessModuleAuthorizationRequest
  ): MaybePromise<HeadlessModuleAuthorizationDecision>;
};

export type HeadlessModuleInvocationEnvelope<TPayload = unknown> = {
  schema: "rosevear.ai-data-platform.headless-module-invocation.v1";
  sdkVersion: typeof HEADLESS_MODULE_SDK_VERSION;
  requestId: string;
  auditCorrelationId: string;
  runtimeIdentity: ModuleRuntimeIdentity;
  capability: ModuleHeadlessCapability;
  operation: string;
  payload: TPayload;
  requestedAt: string;
};

export type HeadlessModuleServiceInvoker = {
  invoke(
    envelope: HeadlessModuleInvocationEnvelope
  ): MaybePromise<unknown>;
};

export type HeadlessModuleInvocationResult<TResult = unknown> = {
  schema: "rosevear.ai-data-platform.headless-module-result.v1";
  requestId: string;
  auditCorrelationId: string;
  capability: ModuleHeadlessCapability;
  operation: string;
  runtimeIdentity: ModuleRuntimeIdentity;
  completedAt: string;
  result: TResult;
};

export type HeadlessModuleSdkOptions = {
  adapter: HeadlessModuleHostAdapter;
  authorizer: HeadlessModuleCapabilityAuthorizer;
  invoker: HeadlessModuleServiceInvoker;
  now?: () => string;
  requestIdFactory?: () => string;
  moduleInstanceIdFactory?: () => string;
};

export type HeadlessModuleSdkState =
  | {
      status: "idle";
      runtimeIdentity: null;
    }
  | {
      status: "ready";
      runtimeIdentity: ModuleRuntimeIdentity;
    };

const ADAPTER_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const OPERATION_PATTERN = /^[a-z][a-z0-9]*(?:[.:/_-][a-z0-9]+)*$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{7,127}$/;
const MODULE_INSTANCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/+-]{0,127}$/;

function defaultRequestId() {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error("Secure randomUUID support is required for headless module requests.");
  }
  return "req_" + globalThis.crypto.randomUUID();
}

function defaultModuleInstanceId() {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error("Secure randomUUID support is required for headless module identity.");
  }
  return "module_" + globalThis.crypto.randomUUID();
}

function assertAdapterIdentity(adapter: HeadlessModuleHostAdapter) {
  if (
    !ADAPTER_ID_PATTERN.test(adapter.adapterId) ||
    adapter.adapterId.length > 120
  ) {
    throw new HeadlessModuleSdkError({
      code: "host_context_invalid",
      message: "Headless module adapter ID is invalid.",
      retryHint: {
        strategy: "never",
        reason: "Adapter identity must be corrected before initialization."
      }
    });
  }

  if (!VERSION_PATTERN.test(adapter.adapterVersion)) {
    throw new HeadlessModuleSdkError({
      code: "host_context_invalid",
      message: "Headless module adapter version must be semantic version text.",
      retryHint: {
        strategy: "never",
        reason: "Adapter version must be corrected before initialization."
      }
    });
  }
}

function assertOperation(operation: string) {
  if (!OPERATION_PATTERN.test(operation) || operation.length > 120) {
    throw new HeadlessModuleSdkError({
      code: "operation_invalid",
      message: "Headless module operation name is invalid.",
      retryHint: {
        strategy: "never",
        reason: "Use a stable lowercase operation identifier."
      },
      details: { operation }
    });
  }
}

function assertRequestId(requestId: string) {
  if (!REQUEST_ID_PATTERN.test(requestId)) {
    throw new HeadlessModuleSdkError({
      code: "host_context_invalid",
      message: "Generated headless module request ID is invalid.",
      retryHint: {
        strategy: "never",
        reason: "The request ID factory must be corrected."
      }
    });
  }
}

function assertModuleInstanceId(moduleInstanceId: string) {
  if (!MODULE_INSTANCE_ID_PATTERN.test(moduleInstanceId)) {
    throw new HeadlessModuleSdkError({
      code: "host_context_invalid",
      message: "Generated module instance ID is invalid.",
      retryHint: {
        strategy: "never",
        reason: "The module instance ID factory must be corrected."
      }
    });
  }
}

function isSupportedCapability(
  value: string
): value is ModuleHeadlessCapability {
  return MODULE_HEADLESS_CAPABILITIES.includes(
    value as ModuleHeadlessCapability
  );
}

export class HeadlessModuleSdk {
  readonly schema = HEADLESS_MODULE_SDK_SCHEMA;
  readonly moduleId = AI_DATA_MODULE_ID;
  readonly moduleVersion = AI_DATA_MODULE_VERSION;
  readonly sdkVersion = HEADLESS_MODULE_SDK_VERSION;

  private readonly options: HeadlessModuleSdkOptions;
  private stateValue: HeadlessModuleSdkState = {
    status: "idle",
    runtimeIdentity: null
  };
  private hostContext: HostRuntimeContext | null = null;

  constructor(options: HeadlessModuleSdkOptions) {
    this.options = options;
    assertAdapterIdentity(options.adapter);
  }

  get state(): HeadlessModuleSdkState {
    return this.stateValue;
  }

  async initialize(): Promise<ModuleRuntimeIdentity> {
    if (this.stateValue.status === "ready") {
      throw new HeadlessModuleSdkError({
        code: "sdk_already_initialized",
        message: "Headless module SDK is already initialized.",
        retryHint: {
          strategy: "never",
          reason: "Reuse the active SDK instance or tear it down before reinitializing."
        }
      });
    }

    const rawContext = await this.options.adapter.contextProvider.getContext();
    const validation = validateUniversalHostContext(rawContext);
    if (!validation.valid) {
      throw new HeadlessModuleSdkError({
        code: "host_context_invalid",
        message: "Headless module host context validation failed.",
        retryHint: {
          strategy: "never",
          reason: "Correct the host contract before initialization."
        },
        details: {
          validationErrors: [...validation.errors]
        }
      });
    }

    const moduleInstanceId =
      this.options.moduleInstanceIdFactory?.() ?? defaultModuleInstanceId();
    assertModuleInstanceId(moduleInstanceId);

    const occurredAt = this.now();
    const runtimeIdentity = createModuleRuntimeIdentity(validation.context, {
      moduleInstanceId,
      createdAt: occurredAt
    });

    try {
      await this.options.adapter.onLifecycle?.({
        type: "initialized",
        runtimeIdentity,
        occurredAt
      });
    } catch {
      throw new HeadlessModuleSdkError({
        code: "adapter_initialize_failed",
        message: "Headless module host adapter initialization hook failed.",
        retryHint: {
          strategy: "safe",
          reason: "No module invocation was started; initialization may be retried."
        }
      });
    }

    this.hostContext = validation.context;
    this.stateValue = {
      status: "ready",
      runtimeIdentity
    };

    return runtimeIdentity;
  }

  async invoke<TResult = unknown, TPayload = unknown>(input: {
    capability: ModuleHeadlessCapability | string;
    operation: string;
    payload: TPayload;
  }): Promise<HeadlessModuleInvocationResult<TResult>> {
    if (this.stateValue.status !== "ready" || !this.hostContext) {
      throw new HeadlessModuleSdkError({
        code: "sdk_not_initialized",
        message: "Headless module SDK must be initialized before invocation.",
        retryHint: {
          strategy: "safe",
          reason: "Initialize with a valid host context, then retry."
        }
      });
    }

    if (!isSupportedCapability(input.capability)) {
      throw new HeadlessModuleSdkError({
        code: "unsupported_capability",
        message: "Requested headless module capability is unsupported.",
        retryHint: {
          strategy: "never",
          reason: "Use a capability advertised by the universal module manifest."
        },
        details: { capability: input.capability }
      });
    }

    assertOperation(input.operation);

    if (!this.hostContext.requestedCapabilities.includes(input.capability)) {
      throw new HeadlessModuleSdkError({
        code: "capability_not_requested",
        message: "Capability was not requested in the validated host context.",
        retryHint: {
          strategy: "never",
          reason:
            "The host context must explicitly request the capability before separate authorization is evaluated."
        },
        details: { capability: input.capability }
      });
    }

    const runtimeIdentity = this.stateValue.runtimeIdentity;
    const requestId =
      this.options.requestIdFactory?.() ?? defaultRequestId();
    assertRequestId(requestId);

    const requestedAt = this.now();
    const authorizationRequest: HeadlessModuleAuthorizationRequest = {
      schema: "rosevear.ai-data-platform.headless-module-authorization.v1",
      requestId,
      auditCorrelationId: runtimeIdentity.auditCorrelationId,
      runtimeIdentity,
      capability: input.capability,
      operation: input.operation
    };

    await this.audit({
      requestId,
      runtimeIdentity,
      capability: input.capability,
      operation: input.operation,
      status: "requested",
      occurredAt: requestedAt
    });

    const authorization = await this.options.authorizer.authorize(
      authorizationRequest
    );

    if (!authorization.allowed) {
      await this.audit({
        requestId,
        runtimeIdentity,
        capability: input.capability,
        operation: input.operation,
        status: "denied",
        occurredAt: this.now(),
        errorCode: "capability_denied"
      });

      throw new HeadlessModuleSdkError({
        code: "capability_denied",
        message: "Headless module capability authorization was denied.",
        retryHint:
          authorization.retryHint ?? {
            strategy: "never",
            reason:
              authorization.reason ||
              "A separate module authorization grant is required."
          },
        details: {
          capability: input.capability,
          operation: input.operation,
          reason: authorization.reason
        }
      });
    }

    await this.audit({
      requestId,
      runtimeIdentity,
      capability: input.capability,
      operation: input.operation,
      status: "authorized",
      occurredAt: this.now()
    });

    const envelope: HeadlessModuleInvocationEnvelope<TPayload> = {
      schema: "rosevear.ai-data-platform.headless-module-invocation.v1",
      sdkVersion: HEADLESS_MODULE_SDK_VERSION,
      requestId,
      auditCorrelationId: runtimeIdentity.auditCorrelationId,
      runtimeIdentity,
      capability: input.capability,
      operation: input.operation,
      payload: input.payload,
      requestedAt
    };

    try {
      const result = (await this.options.invoker.invoke(
        envelope as HeadlessModuleInvocationEnvelope
      )) as TResult;

      const completedAt = this.now();
      await this.audit({
        requestId,
        runtimeIdentity,
        capability: input.capability,
        operation: input.operation,
        status: "succeeded",
        occurredAt: completedAt
      });

      return {
        schema: "rosevear.ai-data-platform.headless-module-result.v1",
        requestId,
        auditCorrelationId: runtimeIdentity.auditCorrelationId,
        capability: input.capability,
        operation: input.operation,
        runtimeIdentity,
        completedAt,
        result
      };
    } catch (error) {
      if (error instanceof HeadlessModuleSdkError) {
        await this.audit({
          requestId,
          runtimeIdentity,
          capability: input.capability,
          operation: input.operation,
          status: "failed",
          occurredAt: this.now(),
          errorCode: error.code
        });
        throw error;
      }

      await this.audit({
        requestId,
        runtimeIdentity,
        capability: input.capability,
        operation: input.operation,
        status: "failed",
        occurredAt: this.now(),
        errorCode: "invocation_failed"
      });

      throw new HeadlessModuleSdkError({
        code: "invocation_failed",
        message: "Headless module service invocation failed.",
        retryHint: {
          strategy: "never",
          reason:
            "The outcome may be unknown. Do not repeat consequential work unless the service supplies explicit idempotent retry evidence."
        },
        details: {
          capability: input.capability,
          operation: input.operation
        }
      });
    }
  }

  async teardown(): Promise<void> {
    if (this.stateValue.status !== "ready") {
      this.hostContext = null;
      this.stateValue = {
        status: "idle",
        runtimeIdentity: null
      };
      return;
    }

    const runtimeIdentity = this.stateValue.runtimeIdentity;
    const occurredAt = this.now();

    try {
      await this.options.adapter.onLifecycle?.({
        type: "teardown",
        runtimeIdentity,
        occurredAt
      });
    } catch {
      throw new HeadlessModuleSdkError({
        code: "adapter_teardown_failed",
        message: "Headless module host adapter teardown hook failed.",
        retryHint: {
          strategy: "safe",
          reason:
            "The SDK remains active until the host adapter completes teardown."
        }
      });
    }

    this.hostContext = null;
    this.stateValue = {
      status: "idle",
      runtimeIdentity: null
    };
  }

  private now() {
    const value = this.options.now?.() ?? new Date().toISOString();
    if (Number.isNaN(Date.parse(value))) {
      throw new HeadlessModuleSdkError({
        code: "host_context_invalid",
        message: "Headless module clock returned an invalid timestamp.",
        retryHint: {
          strategy: "never",
          reason: "Correct the SDK clock provider."
        }
      });
    }
    return value;
  }

  private async audit(input: {
    requestId: string;
    runtimeIdentity: ModuleRuntimeIdentity;
    capability: ModuleHeadlessCapability;
    operation: string;
    status: HeadlessModuleAuditEvent["status"];
    occurredAt: string;
    errorCode?: HeadlessModuleSdkErrorCode;
  }) {
    if (!this.options.adapter.onAudit) return;

    await this.options.adapter.onAudit({
      schema: "rosevear.ai-data-platform.headless-module-audit.v1",
      sdkVersion: HEADLESS_MODULE_SDK_VERSION,
      requestId: input.requestId,
      auditCorrelationId: input.runtimeIdentity.auditCorrelationId,
      moduleInstanceId: input.runtimeIdentity.moduleInstanceId,
      hostApplicationId: input.runtimeIdentity.hostApplicationId,
      hostEnvironment: input.runtimeIdentity.hostEnvironment,
      tenantId: input.runtimeIdentity.tenantId,
      workspaceId: input.runtimeIdentity.workspaceId,
      capability: input.capability,
      operation: input.operation,
      status: input.status,
      occurredAt: input.occurredAt,
      ...(input.errorCode ? { errorCode: input.errorCode } : {})
    });
  }
}

export type DeterministicTestAdapter = HeadlessModuleHostAdapter & {
  readonly lifecycleEvents: HeadlessModuleLifecycleEvent[];
  readonly auditEvents: HeadlessModuleAuditEvent[];
};

export function createDeterministicTestAdapter(input: {
  context: HostRuntimeContext;
  adapterId?: string;
  adapterVersion?: string;
}): DeterministicTestAdapter {
  const lifecycleEvents: HeadlessModuleLifecycleEvent[] = [];
  const auditEvents: HeadlessModuleAuditEvent[] = [];

  return {
    adapterId: input.adapterId ?? "rosevear.test-adapter",
    adapterVersion: input.adapterVersion ?? "1.0.0",
    contextProvider: {
      getContext: () => input.context
    },
    lifecycleEvents,
    auditEvents,
    onLifecycle(event) {
      lifecycleEvents.push(event);
    },
    onAudit(event) {
      auditEvents.push(event);
    }
  };
}

export function createDeterministicTestAuthorizer(
  grantedCapabilities: readonly ModuleHeadlessCapability[]
): HeadlessModuleCapabilityAuthorizer {
  const granted = new Set<ModuleHeadlessCapability>(grantedCapabilities);

  return {
    authorize(request) {
      const allowed = granted.has(request.capability);
      return {
        allowed,
        reason: allowed
          ? "Deterministic test grant."
          : "Deterministic test denial."
      };
    }
  };
}

export function createDeterministicTestInvoker(
  handlers: Partial<
    Record<
      ModuleHeadlessCapability,
      (
        envelope: HeadlessModuleInvocationEnvelope
      ) => MaybePromise<unknown>
    >
  >
): HeadlessModuleServiceInvoker {
  return {
    async invoke(envelope) {
      const handler = handlers[envelope.capability];
      if (!handler) {
        throw new HeadlessModuleSdkError({
          code: "invocation_failed",
          message: "Deterministic test invoker has no handler for capability.",
          retryHint: {
            strategy: "never",
            reason: "Register a deterministic test handler."
          },
          details: {
            capability: envelope.capability
          }
        });
      }
      return handler(envelope);
    }
  };
}

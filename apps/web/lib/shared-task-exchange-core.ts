import { createHash } from "node:crypto";

export const TASK_EXCHANGE_APPLICATIONS = Object.freeze([
  "devilndove",
  "rosiedazzlers",
  "yard-workers",
  "icamp",
  "rosevear-comms-hub",
  "rosevear-ai-hub"
] as const);

export const TASK_KINDS = Object.freeze([
  "exception",
  "follow-up",
  "review",
  "maintenance",
  "customer-action",
  "internal-action"
] as const);

export const TASK_PRIORITIES = Object.freeze([
  "low",
  "normal",
  "high",
  "urgent"
] as const);

export type TaskExchangeApplication = (typeof TASK_EXCHANGE_APPLICATIONS)[number];
export type TaskKind = (typeof TASK_KINDS)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type NormalizedSharedTask = {
  sourceApplicationId: TaskExchangeApplication;
  destinationApplicationId: TaskExchangeApplication;
  canonicalTenantKey: string;
  sourceRecordType: string;
  sourceRecordId: string;
  taskKind: TaskKind;
  priority: TaskPriority;
  title: string;
  summary: string;
  dueAt: string | null;
  assigneeHint: string | null;
  linkedCustomerRecordId: string | null;
  linkedJobRecordId: string | null;
  taskSha256: string;
};

export type TaskExchangeEnvelope = {
  schema: "rosevear.task.exchange.package.v1";
  sourceApplicationId: TaskExchangeApplication;
  destinationApplicationId: TaskExchangeApplication;
  canonicalTenantKey: string;
  sourceRecordType: string;
  sourceRecordId: string;
  taskKind: TaskKind;
  priority: TaskPriority;
  title: string;
  summary: string;
  dueAt: string | null;
  assigneeHint: string | null;
  linkedCustomerRecordId: string | null;
  linkedJobRecordId: string | null;
  state: "held";
  holdReason: "task-exchange-not-authorized";
  peerApplicationWriteRequested: false;
};

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record).sort().map((key) =>
      JSON.stringify(key) + ":" + canonical(record[key])
    ).join(",") + "}";
  }
  return JSON.stringify(value);
}

function boundedText(value: unknown, max: number, code: string, required = false) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error(code);
    return null;
  }
  const normalized = typeof value === "string"
    ? value.normalize("NFKC").trim().replace(/\s+/g, " ")
    : "";
  if (!normalized || normalized.length > max || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new Error(code);
  }
  return normalized;
}

function normalizeDueAt(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("task_due_at_invalid");
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error("task_due_at_invalid");
  return new Date(ms).toISOString();
}

export function isTaskExchangeApplication(value: string): value is TaskExchangeApplication {
  return (TASK_EXCHANGE_APPLICATIONS as readonly string[]).includes(value);
}

export function isTaskKind(value: string): value is TaskKind {
  return (TASK_KINDS as readonly string[]).includes(value);
}

export function isTaskPriority(value: string): value is TaskPriority {
  return (TASK_PRIORITIES as readonly string[]).includes(value);
}

export function normalizeTaskTenantKey(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-z0-9][a-z0-9._:-]{1,119}$/.test(normalized)) {
    throw new Error("task_tenant_key_invalid");
  }
  return normalized;
}

export function normalizeSharedTask(input: {
  sourceApplicationId: string;
  destinationApplicationId: string;
  canonicalTenantKey: string;
  sourceRecordType: string;
  sourceRecordId: string;
  taskKind: string;
  priority: string;
  title: string;
  summary: string;
  dueAt?: string | null;
  assigneeHint?: string | null;
  linkedCustomerRecordId?: string | null;
  linkedJobRecordId?: string | null;
}): NormalizedSharedTask {
  if (!isTaskExchangeApplication(input.sourceApplicationId)) {
    throw new Error("task_source_application_invalid");
  }
  if (!isTaskExchangeApplication(input.destinationApplicationId)) {
    throw new Error("task_destination_application_invalid");
  }
  if (input.sourceApplicationId === input.destinationApplicationId) {
    throw new Error("task_same_application_denied");
  }
  if (!isTaskKind(input.taskKind)) throw new Error("task_kind_invalid");
  if (!isTaskPriority(input.priority)) throw new Error("task_priority_invalid");

  const normalized = {
    sourceApplicationId: input.sourceApplicationId,
    destinationApplicationId: input.destinationApplicationId,
    canonicalTenantKey: normalizeTaskTenantKey(input.canonicalTenantKey),
    sourceRecordType: boundedText(input.sourceRecordType, 80, "task_source_record_type_invalid", true) as string,
    sourceRecordId: boundedText(input.sourceRecordId, 160, "task_source_record_id_invalid", true) as string,
    taskKind: input.taskKind,
    priority: input.priority,
    title: boundedText(input.title, 240, "task_title_invalid", true) as string,
    summary: boundedText(input.summary, 1200, "task_summary_invalid", true) as string,
    dueAt: normalizeDueAt(input.dueAt),
    assigneeHint: boundedText(input.assigneeHint, 160, "task_assignee_hint_invalid"),
    linkedCustomerRecordId: boundedText(input.linkedCustomerRecordId, 160, "task_customer_record_id_invalid"),
    linkedJobRecordId: boundedText(input.linkedJobRecordId, 160, "task_job_record_id_invalid")
  };

  return {
    ...normalized,
    taskSha256: sha256(canonical({
      schema: "rosevear.shared.task.v1",
      ...normalized
    }))
  };
}

export function buildTaskExchangeEnvelope(task: NormalizedSharedTask) {
  const envelope: TaskExchangeEnvelope = {
    schema: "rosevear.task.exchange.package.v1",
    sourceApplicationId: task.sourceApplicationId,
    destinationApplicationId: task.destinationApplicationId,
    canonicalTenantKey: task.canonicalTenantKey,
    sourceRecordType: task.sourceRecordType,
    sourceRecordId: task.sourceRecordId,
    taskKind: task.taskKind,
    priority: task.priority,
    title: task.title,
    summary: task.summary,
    dueAt: task.dueAt,
    assigneeHint: task.assigneeHint,
    linkedCustomerRecordId: task.linkedCustomerRecordId,
    linkedJobRecordId: task.linkedJobRecordId,
    state: "held",
    holdReason: "task-exchange-not-authorized",
    peerApplicationWriteRequested: false
  };
  return {
    envelope,
    payloadSha256: sha256(canonical(envelope))
  };
}

export function safeTaskReviewReason(value: string) {
  const normalized = value.trim();
  return normalized.length >= 8 &&
    normalized.length <= 500 &&
    !/[\u0000-\u001f\u007f]/.test(normalized);
}

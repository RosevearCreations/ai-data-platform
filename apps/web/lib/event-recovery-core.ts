export type EventBusFailureCategory =
  | "transient"
  | "permanent"
  | "policy"
  | "unknown";

export const EVENT_BUS_REPLAY_LIMIT = 5;

export function eventBusFailureReplayable(
  category: EventBusFailureCategory
) {
  return category === "transient" || category === "unknown";
}

export function safeEventBusFailureCode(value: string) {
  return /^[a-z0-9][a-z0-9._-]{1,79}$/.test(value);
}

export function safeRecoveryReason(value: string) {
  return (
    value.length >= 8 &&
    value.length <= 500 &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

export function nextReplayNumber(existing: number) {
  if (!Number.isInteger(existing) || existing < 0) {
    throw new Error("event_bus_replay_count_invalid");
  }
  if (existing >= EVENT_BUS_REPLAY_LIMIT) {
    throw new Error("event_bus_replay_limit_reached");
  }
  return existing + 1;
}

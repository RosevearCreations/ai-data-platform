import type { WebhookSourceApplication } from "./webhook-gateway-core";

export interface EventBusPublicationIdentity {
  sourceApplicationId: WebhookSourceApplication;
  environment: "nonproduction" | "production";
  tenantId: string | null;
  eventType: string;
}

export interface EventBusSubscriptionIdentity {
  sourceApplicationId: WebhookSourceApplication | null;
  destinationApplicationId: WebhookSourceApplication;
  environment: "nonproduction" | "production";
  tenantId: string | null;
  eventTypes: string[];
  state: "draft" | "active" | "paused";
}

export function eventBusSubscriptionMatches(
  subscription: EventBusSubscriptionIdentity,
  publication: EventBusPublicationIdentity
) {
  if (subscription.state !== "active") return false;
  if (subscription.environment !== publication.environment) {
    return false;
  }
  if (
    subscription.sourceApplicationId !== null &&
    subscription.sourceApplicationId !==
      publication.sourceApplicationId
  ) {
    return false;
  }
  if (
    subscription.destinationApplicationId ===
    publication.sourceApplicationId
  ) {
    return false;
  }
  if (
    subscription.tenantId !== null &&
    subscription.tenantId !== publication.tenantId
  ) {
    return false;
  }
  return subscription.eventTypes.includes(
    publication.eventType
  );
}

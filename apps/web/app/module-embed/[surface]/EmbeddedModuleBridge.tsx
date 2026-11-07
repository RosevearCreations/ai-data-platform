"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  EmbeddedModuleRuntimeError,
  type EmbeddedModuleToHostMessage,
  validateEmbeddedHostMessage
} from "@/lib/embedded-module-runtime";

export function EmbeddedModuleBridge({
  hostOrigin,
  runtimeInstanceId,
  auditCorrelationId,
  surfaceId
}: {
  hostOrigin: string;
  runtimeInstanceId: string;
  auditCorrelationId: string;
  surfaceId:
    | "data-library"
    | "app-connections"
    | "integration-health"
    | "integration-certification"
    | "production-learning";
}) {
  const router = useRouter();

  useEffect(() => {
    if (window.parent === window) return;

    const post = (message: EmbeddedModuleToHostMessage) => {
      window.parent.postMessage(message, hostOrigin);
    };

    const baseMessage = {
      schema: "rosevear.ai-data-platform.embed-module-message.v1" as const,
      runtimeInstanceId,
      auditCorrelationId,
      surfaceId
    };

    post({
      ...baseMessage,
      type: "runtime.ready"
    });

    post({
      ...baseMessage,
      type: "surface.changed"
    });

    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== window.parent) return;

      try {
        const message = validateEmbeddedHostMessage({
          expectedHostOrigin: hostOrigin,
          eventOrigin: event.origin,
          runtimeInstanceId,
          auditCorrelationId,
          value: event.data
        });

        if (message.type === "runtime.ping") {
          post({
            ...baseMessage,
            type: "runtime.pong"
          });
          return;
        }

        if (message.type === "runtime.reload") {
          window.location.reload();
          return;
        }

        const url = new URL(
          "/module-embed/" + encodeURIComponent(message.surfaceId),
          window.location.origin
        );
        url.searchParams.set("runtimeId", runtimeInstanceId);
        url.searchParams.set("hostOrigin", hostOrigin);
        url.searchParams.set("auditCorrelationId", auditCorrelationId);
        router.replace(url.pathname + url.search);
      } catch (error) {
        post({
          ...baseMessage,
          type: "runtime.error",
          errorCode:
            error instanceof EmbeddedModuleRuntimeError &&
            error.code === "invalid_origin"
              ? "invalid_origin"
              : error instanceof EmbeddedModuleRuntimeError &&
                  error.code === "invalid_surface"
                ? "invalid_surface"
                : "invalid_message"
        });
      }
    };

    window.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("message", onMessage);
      post({
        ...baseMessage,
        type: "runtime.unmounting"
      });
    };
  }, [
    auditCorrelationId,
    hostOrigin,
    router,
    runtimeInstanceId,
    surfaceId
  ]);

  return null;
}

import {
  EMBEDDED_MODULE_ELEMENT_TAG,
  EmbeddedModuleRuntimeController,
  EmbeddedModuleRuntimeError,
  type EmbeddedFramePort,
  type EmbeddedHostToModuleMessage,
  type EmbeddedMountDescriptor,
  validateEmbeddedModuleMessage
} from "./embedded-module-runtime";

export function registerAiDataPlatformModuleElement() {
  if (typeof window === "undefined" || typeof customElements === "undefined") {
    return false;
  }

  if (customElements.get(EMBEDDED_MODULE_ELEMENT_TAG)) {
    return true;
  }

  class RosevearAiDataModuleElement extends HTMLElement {
    static get observedAttributes() {
      return ["surface", "module-origin", "audit-correlation-id"];
    }

    private frame: HTMLIFrameElement | null = null;
    private controller: EmbeddedModuleRuntimeController | null = null;
    private runtimeInstanceId = "";
    private messageListener:
      | ((event: MessageEvent<unknown>) => void)
      | null = null;

    connectedCallback() {
      void this.connectRuntime();
    }

    disconnectedCallback() {
      void this.disconnectRuntime();
    }

    attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null
    ) {
      if (!this.isConnected || oldValue === newValue || !this.controller) {
        return;
      }

      if (name === "surface" && newValue) {
        void this.navigate(newValue);
        return;
      }

      void this.reconnectRuntime();
    }

    async navigate(surfaceId: string) {
      if (!this.controller) {
        throw new EmbeddedModuleRuntimeError(
          "runtime_not_mounted",
          "Embedded module element is not mounted."
        );
      }
      const descriptor = await this.controller.navigate(surfaceId);
      this.setAttribute("surface", descriptor.surface.id);
      return descriptor;
    }

    async reload() {
      if (!this.controller) {
        throw new EmbeddedModuleRuntimeError(
          "runtime_not_mounted",
          "Embedded module element is not mounted."
        );
      }
      return this.controller.reload();
    }

    postMessage(message: EmbeddedHostToModuleMessage) {
      if (!this.frame?.contentWindow || !this.controller?.descriptor) {
        throw new EmbeddedModuleRuntimeError(
          "runtime_not_mounted",
          "Embedded module element is not mounted."
        );
      }

      if (
        message.runtimeInstanceId !==
          this.controller.descriptor.runtimeInstanceId ||
        message.auditCorrelationId !==
          this.controller.descriptor.auditCorrelationId
      ) {
        throw new EmbeddedModuleRuntimeError(
          "invalid_message",
          "Host message identity does not match the mounted runtime."
        );
      }

      this.frame.contentWindow.postMessage(
        message,
        this.controller.descriptor.moduleOrigin
      );
    }

    private async connectRuntime() {
      if (this.controller) return;

      const moduleOrigin = this.getAttribute("module-origin") ?? "";
      const surfaceId = this.getAttribute("surface") ?? "data-library";
      const auditCorrelationId =
        this.getAttribute("audit-correlation-id") ?? "";

      if (!moduleOrigin || !auditCorrelationId) {
        this.dispatchRuntimeError(
          "invalid_runtime_identity",
          "module-origin and audit-correlation-id are required."
        );
        return;
      }

      if (!globalThis.crypto?.randomUUID) {
        this.dispatchRuntimeError(
          "invalid_runtime_identity",
          "Secure randomUUID support is required."
        );
        return;
      }

      this.runtimeInstanceId =
        "embed_" + globalThis.crypto.randomUUID();

      const port = this.createBrowserFramePort();
      this.controller = new EmbeddedModuleRuntimeController({
        port,
        moduleOrigin,
        hostOrigin: window.location.origin,
        runtimeInstanceId: this.runtimeInstanceId,
        auditCorrelationId
      });

      try {
        const descriptor = await this.controller.mount(surfaceId);
        this.installMessageBoundary(descriptor);
        this.dispatchEvent(
          new CustomEvent("rosevear-module-mounted", {
            detail: {
              runtimeInstanceId: descriptor.runtimeInstanceId,
              surfaceId: descriptor.surface.id
            }
          })
        );
      } catch (error) {
        this.controller = null;
        this.dispatchRuntimeError(
          error instanceof EmbeddedModuleRuntimeError
            ? error.code
            : "runtime_mount_failed",
          error instanceof Error ? error.message : "Embedded module mount failed."
        );
      }
    }

    private async disconnectRuntime() {
      this.removeMessageBoundary();
      const controller = this.controller;
      this.controller = null;
      try {
        await controller?.unmount();
      } catch (error) {
        this.dispatchRuntimeError(
          error instanceof EmbeddedModuleRuntimeError
            ? error.code
            : "runtime_unmount_failed",
          error instanceof Error
            ? error.message
            : "Embedded module unmount failed."
        );
      }
      this.frame = null;
    }

    private async reconnectRuntime() {
      await this.disconnectRuntime();
      await this.connectRuntime();
    }

    private createBrowserFramePort(): EmbeddedFramePort {
      return {
        mount: (descriptor) => {
          const frame = document.createElement("iframe");
          this.applyDescriptor(frame, descriptor);
          frame.setAttribute("title", "AI Data Platform embedded module");
          frame.setAttribute("part", "frame");
          frame.style.border = "0";
          frame.style.width = "100%";
          frame.style.minHeight = "40rem";
          frame.style.display = "block";
          this.replaceChildren(frame);
          this.frame = frame;
        },
        navigate: (descriptor) => {
          if (!this.frame) throw new Error("Embedded frame is missing.");
          this.applyDescriptor(this.frame, descriptor);
        },
        reload: (descriptor) => {
          if (!this.frame) throw new Error("Embedded frame is missing.");
          this.frame.src = descriptor.iframe.src;
        },
        unmount: () => {
          this.replaceChildren();
          this.frame = null;
        }
      };
    }

    private applyDescriptor(
      frame: HTMLIFrameElement,
      descriptor: EmbeddedMountDescriptor
    ) {
      frame.src = descriptor.iframe.src;
      frame.sandbox.value = descriptor.iframe.sandbox;
      frame.referrerPolicy = descriptor.iframe.referrerPolicy;
      frame.loading = descriptor.iframe.loading;
      frame.allow = descriptor.iframe.allow;
    }

    private installMessageBoundary(descriptor: EmbeddedMountDescriptor) {
      this.removeMessageBoundary();

      this.messageListener = (event) => {
        if (!this.frame?.contentWindow || event.source !== this.frame.contentWindow) {
          return;
        }

        try {
          const message = validateEmbeddedModuleMessage({
            expectedModuleOrigin: descriptor.moduleOrigin,
            eventOrigin: event.origin,
            runtimeInstanceId: descriptor.runtimeInstanceId,
            auditCorrelationId: descriptor.auditCorrelationId,
            value: event.data
          });

          this.dispatchEvent(
            new CustomEvent("rosevear-module-message", {
              detail: message
            })
          );
        } catch (error) {
          this.dispatchRuntimeError(
            error instanceof EmbeddedModuleRuntimeError
              ? error.code
              : "invalid_message",
            error instanceof Error
              ? error.message
              : "Embedded module message was rejected."
          );
        }
      };

      window.addEventListener("message", this.messageListener);
    }

    private removeMessageBoundary() {
      if (this.messageListener) {
        window.removeEventListener("message", this.messageListener);
        this.messageListener = null;
      }
    }

    private dispatchRuntimeError(code: string, message: string) {
      this.dispatchEvent(
        new CustomEvent("rosevear-module-error", {
          detail: { code, message }
        })
      );
    }
  }

  customElements.define(
    EMBEDDED_MODULE_ELEMENT_TAG,
    RosevearAiDataModuleElement
  );
  return true;
}

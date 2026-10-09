import { defineConnector } from "../src/index";

export const connector = defineConnector(
  {
    manifestVersion: 1,
    sdkVersion: 1,
    key: "starter.no-secret",
    version: "1.0.0",
    displayName: "Starter no-secret connector",
    description: "Copy this file when starting a connector that needs no credentials.",
    capabilities: ["import"],
    configSchema: [],
    secrets: [],
    limits: { maxExecutionMs: 2000, maxInputBytes: 20000, maxOutputBytes: 20000 }
  },
  async ({ input }) => ({
    output: input,
    summary: { status: "ok" }
  })
);

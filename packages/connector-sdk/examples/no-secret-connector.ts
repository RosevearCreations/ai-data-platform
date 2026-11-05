import { defineConnector } from "../src/index";

export const connector = defineConnector(
  {
    manifestVersion: 2,
    sdkVersion: 2,
    key: "starter.no-secret",
    version: "2.0.0",
    displayName: "Starter no-secret connector",
    description: "Copy this file when starting a local connector that needs no credentials or network access.",
    capabilities: ["import"],
    configSchema: [],
    secrets: [],
    limits: { maxExecutionMs: 2000, maxInputBytes: 20000, maxOutputBytes: 20000 },
    transport: { kind: "local" }
  },
  async ({ input }) => ({
    output: input,
    summary: { status: "ok", sdk: 2 }
  })
);

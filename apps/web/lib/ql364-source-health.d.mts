export const QL364_PATH: string;
export function handleQl364SourceHealth(options: {
  request: Request;
  sourceId: string;
  repository: string;
  approveOriginalGet?: (input: {
    sourceId: string;
    operationId: string;
    requestSha256: string;
    intent: Record<string, unknown>;
  }) => Promise<Record<string, unknown> | null> | Record<string, unknown> | null;
  claimOperation?: (input: {
    sourceId: string;
    operationId: string;
    requestSha256: string;
    expiresAt: string;
  }) => Promise<boolean> | boolean;
  signSourceReceipt?: (
    bytes: Uint8Array,
    context: { sourceId: string; operationId: string; requestSha256: string }
  ) => Promise<Record<string, unknown>> | Record<string, unknown>;
  now?: number;
}): Promise<Response>;

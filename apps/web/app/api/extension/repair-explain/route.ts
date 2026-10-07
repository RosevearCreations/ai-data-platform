import { createHash } from "node:crypto";

import {
  defaultRepairModel,
  deterministicRepairExplanation,
  estimateGatewayCost,
  parseRepairExplanationRequest,
  repairExplanationSchema,
  sanitizeRepairExplanation
} from "@/lib/recipe-repair-ai";
import {
  listWorkspacesForUser,
  resolveExtensionSession
} from "@/lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GatewayResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  provider_metadata?: {
    gateway?: { cost?: number | string };
  };
  providerMetadata?: {
    gateway?: { cost?: number | string };
  };
  error?: { message?: string };
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? "";
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function extractContent(response: GatewayResponse) {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (part?.type === "text" ? part.text ?? "" : ""))
      .join("")
      .trim();
  }
  return "";
}

function actualCost(response: GatewayResponse) {
  const raw =
    response.provider_metadata?.gateway?.cost ??
    response.providerMetadata?.gateway?.cost;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function POST(request: Request) {
  const token = bearerToken(request);
  const principal = token
    ? await resolveExtensionSession(tokenHash(token))
    : null;
  if (!principal) {
    return Response.json(
      { error: "expired_or_invalid_session" },
      { status: 401 }
    );
  }

  let parsed: ReturnType<typeof parseRepairExplanationRequest>;
  try {
    parsed = parseRepairExplanationRequest(await request.json());
  } catch (reason) {
    return Response.json(
      {
        error:
          reason instanceof Error
            ? reason.message
            : "Invalid repair explanation request."
      },
      { status: 400 }
    );
  }

  const workspaces = await listWorkspacesForUser(principal.userId);
  if (!workspaces.some((workspace) => workspace.id === parsed.workspaceId)) {
    return Response.json(
      { error: "workspace_access_denied" },
      { status: 403 }
    );
  }

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    return Response.json(deterministicRepairExplanation(parsed));
  }

  const model = defaultRepairModel();
  const prompt = [
    "You explain and rank deterministic CSS selector repair candidates.",
    "You MUST rank only the supplied candidate IDs.",
    "Do not invent, rewrite, or approve CSS selectors.",
    "Do not recommend bypassing login, paywall, CAPTCHA, robots, or access controls.",
    "The operator must explicitly approve any repair after reviewing sample evidence.",
    "Prefer candidates with stronger bounded sample coverage, structural proximity, and retained selector evidence.",
    "Explain uncertainty when multiple candidates are close.",
    "Return only the required JSON schema.",
    "",
    JSON.stringify({
      pageUrl: parsed.pageUrl,
      recipeName: parsed.recipeName,
      issue: parsed.issue,
      candidates: parsed.candidates
    })
  ].join("\n");

  let response: Response;
  try {
    response = await fetch(
      "https://ai-gateway.vercel.sh/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1500,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "recipe_repair_candidate_ranking",
              strict: true,
              schema: repairExplanationSchema
            }
          }
        }),
        signal: AbortSignal.timeout(20_000)
      }
    );
  } catch (reason) {
    const fallback = deterministicRepairExplanation(parsed);
    return Response.json({
      ...fallback,
      warnings: [
        ...fallback.warnings,
        reason instanceof Error
          ? "AI Gateway request failed: " + reason.message
          : "AI Gateway request failed."
      ]
    });
  }

  let gateway: GatewayResponse = {};
  try {
    gateway = (await response.json()) as GatewayResponse;
  } catch {
    gateway = {};
  }

  if (!response.ok) {
    const fallback = deterministicRepairExplanation(parsed);
    return Response.json({
      ...fallback,
      warnings: [
        ...fallback.warnings,
        gateway.error?.message ??
          "AI Gateway returned HTTP " + response.status + "."
      ]
    });
  }

  try {
    const content = extractContent(gateway);
    if (!content) {
      throw new Error("AI Gateway returned no structured content.");
    }
    const structured = sanitizeRepairExplanation(
      JSON.parse(content),
      parsed
    );
    const inputTokens = gateway.usage?.prompt_tokens ?? 0;
    const outputTokens = gateway.usage?.completion_tokens ?? 0;
    const totalTokens =
      gateway.usage?.total_tokens ?? inputTokens + outputTokens;

    return Response.json({
      ...structured,
      telemetry: {
        mode: "gateway",
        model,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCostUsd: estimateGatewayCost(
          model,
          inputTokens,
          outputTokens
        ),
        actualCostUsd: actualCost(gateway)
      },
      warnings: []
    });
  } catch (reason) {
    const fallback = deterministicRepairExplanation(parsed);
    return Response.json({
      ...fallback,
      warnings: [
        ...fallback.warnings,
        reason instanceof Error
          ? "AI ranking could not be used: " + reason.message
          : "AI ranking could not be used."
      ]
    });
  }
}

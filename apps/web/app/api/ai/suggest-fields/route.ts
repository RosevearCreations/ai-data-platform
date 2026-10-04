import { headers } from "next/headers";

import {
  DEFAULT_AI_SUGGESTION_MODEL,
  deterministicSuggestions,
  estimateGatewayCost,
  parseSuggestionRequest,
  sanitizeGatewaySuggestions,
  suggestionJsonSchema
} from "@/lib/ai-suggestions";
import { auth } from "@/lib/auth";

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
    gateway?: {
      cost?: number | string;
    };
  };
  providerMetadata?: {
    gateway?: {
      cost?: number | string;
    };
  };
  error?: {
    message?: string;
  };
}

function extractContent(response: GatewayResponse) {
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (part?.type === "text" ? part.text ?? "" : ""))
      .join("")
      .trim();
  }

  return "";
}

function parseActualCost(response: GatewayResponse) {
  const raw =
    response.provider_metadata?.gateway?.cost ??
    response.providerMetadata?.gateway?.cost;

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }

  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsedRequest;

  try {
    const rawBody = await request.json();
    parsedRequest = parseSuggestionRequest(rawBody);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Invalid suggestion request."
      },
      { status: 400 }
    );
  }

  const apiKey = process.env.AI_GATEWAY_API_KEY;

  if (!apiKey) {
    return Response.json(deterministicSuggestions(parsedRequest));
  }

  const model =
    process.env.AI_SUGGESTION_MODEL?.trim() ||
    DEFAULT_AI_SUGGESTION_MODEL;

  const context = {
    intent: parsedRequest.intent,
    pageUrl: parsedRequest.pageUrl ?? "",
    recordSelector: parsedRequest.recordSelector ?? "",
    sampleRecords: parsedRequest.sampleRecords,
    existingFields: parsedRequest.existingFields ?? []
  };

  const prompt = [
    "You design extraction schemas for a deterministic web-scraping recipe engine.",
    "Suggest useful fields only. Do not invent CSS selectors.",
    "Selectors are chosen later by deterministic page tools or by the user.",
    "Prefer fields directly supported by the extraction intent and sample evidence.",
    "Use selectorStrategy=derive-from-picker when the field can be selected visually.",
    "Use selectorStrategy=manual only when a field is conceptual and needs manual mapping.",
    "Keep field keys stable snake_case.",
    "Do not include sensitive personal data unless the user explicitly requested it.",
    "Return only the required JSON schema.",
    "",
    JSON.stringify(context)
  ].join("\n");

  let gatewayResponse: Response;

  try {
    gatewayResponse = await fetch(
      "https://ai-gateway.vercel.sh/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 2400,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "ai_data_field_suggestions",
              strict: true,
              schema: suggestionJsonSchema
            }
          }
        }),
        signal: AbortSignal.timeout(25_000)
      }
    );
  } catch (error) {
    const fallback = deterministicSuggestions(parsedRequest);

    return Response.json({
      ...fallback,
      warnings: [
        ...fallback.warnings,
        error instanceof Error
          ? `AI Gateway request failed: ${error.message}`
          : "AI Gateway request failed."
      ]
    });
  }

  let gatewayJson: GatewayResponse = {};

  try {
    gatewayJson = (await gatewayResponse.json()) as GatewayResponse;
  } catch {
    gatewayJson = {};
  }

  if (!gatewayResponse.ok) {
    const fallback = deterministicSuggestions(parsedRequest);
    const message =
      gatewayJson.error?.message ||
      `AI Gateway returned HTTP ${gatewayResponse.status}.`;

    return Response.json({
      ...fallback,
      warnings: [...fallback.warnings, message]
    });
  }

  try {
    const content = extractContent(gatewayJson);

    if (!content) {
      throw new Error("AI Gateway returned no structured content.");
    }

    const structured = sanitizeGatewaySuggestions(JSON.parse(content));
    const inputTokens = gatewayJson.usage?.prompt_tokens ?? 0;
    const outputTokens = gatewayJson.usage?.completion_tokens ?? 0;
    const totalTokens =
      gatewayJson.usage?.total_tokens ?? inputTokens + outputTokens;

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
        actualCostUsd: parseActualCost(gatewayJson)
      },
      warnings: []
    });
  } catch (error) {
    const fallback = deterministicSuggestions(parsedRequest);

    return Response.json({
      ...fallback,
      warnings: [
        ...fallback.warnings,
        error instanceof Error
          ? `AI structured output could not be used: ${error.message}`
          : "AI structured output could not be used."
      ]
    });
  }
}

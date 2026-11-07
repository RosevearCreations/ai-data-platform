import { headers } from "next/headers";

import {
  DEFAULT_AI_SUGGESTION_MODEL,
  estimateGatewayCost
} from "@/lib/ai-suggestions";
import { auth } from "@/lib/auth";
import {
  deterministicIntegrationSuggestionRanking,
  integrationSuggestionJsonSchema,
  sanitizeIntegrationSuggestionRanking
} from "@/lib/integration-suggestions-core";
import {
  buildIntegrationSuggestionsForUser
} from "@/lib/integration-suggestions-database";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type GatewayResponse={
  choices?:Array<{
    message?:{
      content?:string|Array<{type?:string;text?:string}>;
    };
  }>;
  usage?:{
    prompt_tokens?:number;
    completion_tokens?:number;
    total_tokens?:number;
  };
  provider_metadata?:{gateway?:{cost?:number|string}};
  providerMetadata?:{gateway?:{cost?:number|string}};
  error?:{message?:string};
};

function extractContent(response:GatewayResponse){
  const content=response.choices?.[0]?.message?.content;
  if(typeof content==="string") return content;
  if(Array.isArray(content)){
    return content
      .map(part=>part?.type==="text"?part.text??"":"")
      .join("")
      .trim();
  }
  return "";
}

function actualCost(response:GatewayResponse){
  const raw=
    response.provider_metadata?.gateway?.cost ??
    response.providerMetadata?.gateway?.cost;
  if(typeof raw==="number"&&Number.isFinite(raw)) return raw;
  if(typeof raw==="string"){
    const value=Number(raw);
    return Number.isFinite(value)?value:null;
  }
  return null;
}

function safeWorkspaceId(value:unknown){
  if(value===null||value===undefined||value==="") return null;
  if(typeof value!=="string") throw new Error("integration_suggestion_workspace_invalid");
  const result=value.trim();
  if(!/^[A-Za-z0-9_-]{1,160}$/.test(result)){
    throw new Error("integration_suggestion_workspace_invalid");
  }
  return result;
}

function candidatePromptRecord(candidate:Awaited<
  ReturnType<typeof buildIntegrationSuggestionsForUser>
>["candidates"][number]){
  if(candidate.kind==="field-mapping"){
    return {
      candidateId:candidate.candidateId,
      kind:candidate.kind,
      applicationId:candidate.applicationId,
      contractId:candidate.contractId,
      targetKey:candidate.targetKey,
      targetType:candidate.targetType,
      sourcePath:candidate.sourcePath,
      sourceType:candidate.sourceType,
      transform:candidate.transform,
      requiredTarget:candidate.requiredTarget,
      deterministicConfidence:candidate.confidence,
      evidenceBasis:candidate.basis
    };
  }
  return {
    candidateId:candidate.candidateId,
    kind:candidate.kind,
    sourceApplicationId:candidate.sourceApplicationId,
    destinationApplicationId:candidate.destinationApplicationId,
    environment:candidate.environment,
    tenantScoped:Boolean(candidate.tenantId),
    eventType:candidate.eventType,
    observedCount:candidate.observedCount,
    lastObservedAt:candidate.lastObservedAt,
    actionKind:candidate.actionKind,
    deterministicConfidence:candidate.confidence,
    evidenceBasis:candidate.basis
  };
}

export async function POST(request:Request){
  const session=await auth.api.getSession({headers:await headers()});
  if(!session){
    return Response.json({error:"authentication_required"},{status:401});
  }

  let workspaceId:null|string=null;
  try{
    const body=await request.json().catch(()=>({}));
    workspaceId=safeWorkspaceId(
      body&&typeof body==="object"
        ?(body as Record<string,unknown>).workspaceId
        :null
    );
  }catch(error){
    return Response.json({
      error:error instanceof Error?error.message:"integration_suggestion_request_invalid"
    },{status:400});
  }

  const model=await buildIntegrationSuggestionsForUser(
    session.user.id,
    {workspaceId}
  );
  if(workspaceId&&!model.workspaces.some(item=>item.id===workspaceId)){
    return Response.json(
      {error:"integration_suggestion_workspace_not_found"},
      {status:404}
    );
  }

  const candidates=[...model.candidates]
    .sort((a,b)=>b.confidence-a.confidence||a.candidateId.localeCompare(b.candidateId))
    .slice(0,48);

  if(!candidates.length){
    return Response.json({
      ...deterministicIntegrationSuggestionRanking([]),
      summary:"No bounded mapping or workflow suggestion candidates are available from the current authorized evidence.",
      warnings:[]
    });
  }

  const apiKey=process.env.AI_GATEWAY_API_KEY;
  if(!apiKey){
    return Response.json({
      ...deterministicIntegrationSuggestionRanking(candidates),
      warnings:["AI Gateway is not configured; deterministic evidence ranking is shown."]
    });
  }

  const modelName=
    process.env.AI_SUGGESTION_MODEL?.trim() ||
    DEFAULT_AI_SUGGESTION_MODEL;

  const prompt=[
    "You rank already-generated integration suggestions for an operator.",
    "You MUST choose only from the supplied candidateId values.",
    "Do not invent a mapping, source field, workflow action, destination application, event type, credential, or connection state.",
    "Rank higher when schema/type evidence is strong, required canonical targets are missing, or repeated event evidence supports a useful governed follow-up.",
    "Treat all suggestions as advisory. Never state that a connection is live, a rule is active, a mapping is approved, or an external action occurred.",
    "Do not request or infer customer data, event bodies, secret values, credential values, or hidden application state.",
    "Return only the required JSON schema.",
    "",
    JSON.stringify({
      evidenceWindowDays:model.scope.evidenceWindowDays,
      candidateCount:candidates.length,
      candidates:candidates.map(candidatePromptRecord)
    })
  ].join("\n");

  let gatewayResponse:Response;
  try{
    gatewayResponse=await fetch(
      "https://ai-gateway.vercel.sh/v1/chat/completions",
      {
        method:"POST",
        headers:{
          Authorization:`Bearer ${apiKey}`,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          model:modelName,
          messages:[{role:"user",content:prompt}],
          max_tokens:2600,
          response_format:{
            type:"json_schema",
            json_schema:{
              name:"integration_suggestion_ranking",
              strict:true,
              schema:integrationSuggestionJsonSchema(
                candidates.map(item=>item.candidateId)
              )
            }
          }
        }),
        signal:AbortSignal.timeout(25_000)
      }
    );
  }catch(error){
    const fallback=deterministicIntegrationSuggestionRanking(candidates);
    return Response.json({
      ...fallback,
      warnings:[
        error instanceof Error
          ?`AI Gateway request failed: ${error.message}`
          :"AI Gateway request failed."
      ]
    });
  }

  let response:GatewayResponse={};
  try{
    response=await gatewayResponse.json() as GatewayResponse;
  }catch{
    response={};
  }

  if(!gatewayResponse.ok){
    const fallback=deterministicIntegrationSuggestionRanking(candidates);
    return Response.json({
      ...fallback,
      warnings:[
        response.error?.message ??
        `AI Gateway returned HTTP ${gatewayResponse.status}.`
      ]
    });
  }

  try{
    const raw=extractContent(response);
    if(!raw) throw new Error("integration_suggestion_ai_response_empty");
    const sanitized=sanitizeIntegrationSuggestionRanking(
      JSON.parse(raw),
      candidates
    );
    const inputTokens=response.usage?.prompt_tokens??0;
    const outputTokens=response.usage?.completion_tokens??0;
    const totalTokens=
      response.usage?.total_tokens??inputTokens+outputTokens;

    return Response.json({
      mode:"gateway" as const,
      model:modelName,
      summary:sanitized.summary,
      rankings:sanitized.rankings,
      telemetry:{
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCostUsd:estimateGatewayCost(
          modelName,
          inputTokens,
          outputTokens
        ),
        actualCostUsd:actualCost(response)
      },
      warnings:[]
    });
  }catch(error){
    const fallback=deterministicIntegrationSuggestionRanking(candidates);
    return Response.json({
      ...fallback,
      warnings:[
        error instanceof Error
          ?`AI structured ranking rejected: ${error.message}`
          :"AI structured ranking rejected."
      ]
    });
  }
}

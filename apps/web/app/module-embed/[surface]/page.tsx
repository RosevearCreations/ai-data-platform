import { headers } from "next/headers";
import { notFound } from "next/navigation";

import AppConnectionsPage from "@/app/app-connections/page";
import DataLibraryPage from "@/app/data-library/page";
import IntegrationCertificationPage from "@/app/integration-certification/page";
import IntegrationHealthPage from "@/app/integration-health/page";
import ProductionLearningPage from "@/app/production-learning/page";
import {
  EmbeddedModuleRuntimeError,
  normalizeTrustedOrigin,
  parseConfiguredEmbedHostOrigins,
  resolveEmbeddedSurface
} from "@/lib/embedded-module-runtime";

import { EmbeddedModuleBridge } from "./EmbeddedModuleBridge";

export const dynamic = "force-dynamic";

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function requestOriginFromHeaders(value: Headers) {
  const host = value.get("x-forwarded-host") ?? value.get("host");
  const protocol = value.get("x-forwarded-proto") ?? "https";
  if (!host) return null;
  try {
    return normalizeTrustedOrigin(protocol + "://" + host);
  } catch {
    return null;
  }
}

function referrerOrigin(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export default async function EmbeddedSurfacePage({
  params,
  searchParams
}: {
  params: Promise<{ surface: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ surface: surfaceValue }, query, requestHeaders] = await Promise.all([
    params,
    searchParams,
    headers()
  ]);

  let surface;
  try {
    surface = resolveEmbeddedSurface(surfaceValue);
  } catch {
    notFound();
  }

  const runtimeInstanceId = stringParam(query.runtimeId);
  const hostOriginValue = stringParam(query.hostOrigin);
  const auditCorrelationId = stringParam(query.auditCorrelationId);
  const requestOrigin = requestOriginFromHeaders(requestHeaders);
  const referer = referrerOrigin(requestHeaders.get("referer"));

  if (!requestOrigin) notFound();

  let hostOrigin: string;
  try {
    hostOrigin = normalizeTrustedOrigin(hostOriginValue);
  } catch {
    notFound();
  }

  const allowedHosts = new Set([
    requestOrigin,
    ...parseConfiguredEmbedHostOrigins(
      process.env.AI_DATA_EMBED_ALLOWED_HOST_ORIGINS
    )
  ]);

  if (!allowedHosts.has(hostOrigin)) notFound();

  if (referer && referer !== hostOrigin && referer !== requestOrigin) {
    notFound();
  }

  try {
    if (
      !/^[A-Za-z0-9][A-Za-z0-9._:@/+-]{7,127}$/.test(runtimeInstanceId) ||
      !/^[A-Za-z0-9][A-Za-z0-9._:@/+-]{7,127}$/.test(auditCorrelationId)
    ) {
      throw new EmbeddedModuleRuntimeError(
        "invalid_runtime_identity",
        "Embedded runtime identity is invalid."
      );
    }
  } catch {
    notFound();
  }

  const surfaceQuery = { ...query };
  delete surfaceQuery.runtimeId;
  delete surfaceQuery.hostOrigin;
  delete surfaceQuery.auditCorrelationId;

  let content;
  switch (surface.id) {
    case "data-library":
      content = <DataLibraryPage searchParams={Promise.resolve(surfaceQuery)} />;
      break;
    case "app-connections":
      content = <AppConnectionsPage />;
      break;
    case "integration-health":
      content = <IntegrationHealthPage />;
      break;
    case "integration-certification":
      content = <IntegrationCertificationPage />;
      break;
    case "production-learning":
      content = <ProductionLearningPage />;
      break;
    default:
      notFound();
  }

  return (
    <>
      <EmbeddedModuleBridge
        hostOrigin={hostOrigin}
        runtimeInstanceId={runtimeInstanceId}
        auditCorrelationId={auditCorrelationId}
        surfaceId={surface.id}
      />
      {content}
    </>
  );
}

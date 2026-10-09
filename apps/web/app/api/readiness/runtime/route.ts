import { authPool } from "@/lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDatabaseUrl() {
  const raw = process.env.DATABASE_URL ?? "";
  const trimmed = raw.trim();
  const startsWithPostgres =
    trimmed.startsWith("postgresql://") || trimmed.startsWith("postgres://");

  let pooled = false;
  let database = "";
  let sslMode = "";
  let hostRegion = "";
  let parseOk = false;

  if (startsWithPostgres) {
    try {
      const parsed = new URL(trimmed);
      parseOk = true;
      pooled = parsed.hostname.includes("-pooler");
      database = parsed.pathname.replace(/^\//, "");
      sslMode = parsed.searchParams.get("sslmode") ?? "";
      const parts = parsed.hostname.split(".");
      hostRegion = parts.slice(1, 4).join(".");
    } catch {
      parseOk = false;
    }
  }

  return {
    configured: Boolean(raw),
    trimmed: raw === trimmed,
    startsWithPostgres,
    parseOk,
    pooled,
    database,
    sslMode,
    hostRegion
  };
}

function sanitizeError(error: unknown) {
  const candidate =
    error && typeof error === "object"
      ? (error as { code?: unknown; name?: unknown })
      : null;

  return {
    name:
      typeof candidate?.name === "string"
        ? candidate.name.slice(0, 80)
        : "UnknownError",
    code:
      typeof candidate?.code === "string"
        ? candidate.code.slice(0, 32)
        : null
  };
}

export async function GET() {
  const databaseUrl = parseDatabaseUrl();

  const configuration = {
    databaseUrl,
    betterAuthSecretConfigured:
      typeof process.env.BETTER_AUTH_SECRET === "string" &&
      process.env.BETTER_AUTH_SECRET.length >= 32,
    betterAuthUrl: process.env.BETTER_AUTH_URL ?? null,
    trustedOriginsConfigured: Boolean(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
    signUpAllowed: process.env.AUTH_ALLOW_SIGN_UP === "true",
    publicSignUpEnabled:
      process.env.NEXT_PUBLIC_AUTH_SIGN_UP_ENABLED === "true",
    browserlessTokenConfigured: Boolean(process.env.BROWSERLESS_API_TOKEN),
    remoteExecutionEnabled:
      process.env.REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED === "true",
    remoteKillSwitchActive:
      process.env.REMOTE_EXECUTION_KILL_SWITCH !== "false"
  };

  try {
    const result = await authPool.query<{
      current_database: string;
      current_user: string;
      auth_user: string | null;
    }>(
      `
        select
          current_database(),
          current_user,
          to_regclass('auth."user"')::text as auth_user
      `
    );

    return Response.json(
      {
        ok: true,
        configuration,
        database: {
          connected: true,
          currentDatabase: result.rows[0]?.current_database ?? null,
          currentRole: result.rows[0]?.current_user ?? null,
          authSchemaVisible: result.rows[0]?.auth_user === "auth.user"
        }
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        configuration,
        database: {
          connected: false,
          error: sanitizeError(error)
        }
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" }
      }
    );
  }
}

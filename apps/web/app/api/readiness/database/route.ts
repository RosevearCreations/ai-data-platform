import { checkProductionDatabaseReadiness } from "@/lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const readiness = await checkProductionDatabaseReadiness();
    return Response.json(readiness, {
      status: readiness.ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error("database_readiness_failed", error);
    return Response.json(
      {
        ready: false,
        authSchemaReady: false,
        applicationSchemaReady: false,
        migrationCount: 0,
        latestMigration: null
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" }
      }
    );
  }
}

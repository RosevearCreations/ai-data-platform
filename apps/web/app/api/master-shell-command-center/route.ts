import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  buildMasterShellCommandCenter
} from "@/lib/master-shell-command-center";
import { observeApiOperation } from "@/lib/performance-observatory-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) {
    return Response.json(
      { error: "authentication_required" },
      { status: 401 }
    );
  }

  return observeApiOperation(
    userId,
    "api.master-shell-command-center.get",
    async () => {
      try {
        return Response.json(
          await buildMasterShellCommandCenter(userId),
          { headers: { "Cache-Control": "no-store" } }
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "master_shell_command_center_failed";
        const status = message.includes("suite_admin_required")
          ? 403
          : 500;
        return Response.json({ error: message }, { status });
      }
    }
  );
}

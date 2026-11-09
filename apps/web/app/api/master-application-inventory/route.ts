import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  listMasterApplicationInventoryForUser
} from "@/lib/master-application-inventory-database";
import { observeApiOperation } from "@/lib/performance-observatory-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function currentUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function statusForError(message: string) {
  if (message.includes("suite_admin_required")) return 403;
  return 500;
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
    "api.master-application-inventory.get",
    async () => {
      try {
        return Response.json(
          await listMasterApplicationInventoryForUser(userId),
          { headers: { "Cache-Control": "no-store" } }
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "master_inventory_list_failed";
        return Response.json(
          { error: message },
          { status: statusForError(message) }
        );
      }
    }
  );
}

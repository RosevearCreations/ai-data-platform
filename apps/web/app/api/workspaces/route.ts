import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { listWorkspacesForUser } from "@/lib/database";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const workspaces = await listWorkspacesForUser(session.user.id);

  return NextResponse.json({ workspaces });
}

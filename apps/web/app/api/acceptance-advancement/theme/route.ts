import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { recordBuild413ThemeSelection } from "@/lib/build413-acceptance-database";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const raw = await request.json().catch(() => null);
  const body = raw && typeof raw === "object" && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};

  try {
    const selection = await recordBuild413ThemeSelection(session.user.id, {
      moduleId: typeof body.moduleId === "string" ? body.moduleId : "",
      profileId: typeof body.profileId === "string" ? body.profileId : "",
      backgroundSlot:
        typeof body.backgroundSlot === "string" ? body.backgroundSlot : ""
    });
    return NextResponse.json({ selection }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "build413_theme_failed";
    return NextResponse.json(
      { error: message },
      { status: message === "build413_owner_required" ? 403 : 400 }
    );
  }
}

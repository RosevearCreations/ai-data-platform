import { createHash, randomBytes } from "node:crypto";

import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { createExtensionSession } from "@/lib/database";

const SESSION_HOURS = 8;
const REDIRECT_HOST = /^([a-p]{32})\.chromiumapp\.org$/;

function validatedRedirectUri(raw: string | null) {
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const match = url.hostname.match(REDIRECT_HOST);

    if (url.protocol !== "https:" || !match) {
      return null;
    }

    return {
      url,
      extensionId: match[1]
    };
  } catch {
    return null;
  }
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const redirect = validatedRedirectUri(
    requestUrl.searchParams.get("redirect_uri")
  );
  const state = requestUrl.searchParams.get("state") ?? "";

  if (!redirect || !state || state.length > 128) {
    return NextResponse.json(
      { error: "invalid_extension_bridge_request" },
      { status: 400 }
    );
  }

  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signIn);
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);

  await createExtensionSession({
    userId: session.user.id,
    tokenHash: tokenHash(token),
    extensionId: redirect.extensionId,
    expiresAt
  });

  const fragment = new URLSearchParams({
    token,
    expires_at: expiresAt.toISOString(),
    state
  });

  redirect.url.hash = fragment.toString();

  const response = NextResponse.redirect(redirect.url);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);

    try {
      await authClient.signOut();
      window.location.assign("/");
    } finally {
      setPending(false);
    }
  }

  return (
    <button className="secondaryButton" disabled={pending} onClick={signOut} type="button">
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

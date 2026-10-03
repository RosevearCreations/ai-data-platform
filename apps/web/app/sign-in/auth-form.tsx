"use client";

import { FormEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";

interface AuthFormProps {
  allowSignUp: boolean;
}

export function AuthForm({ allowSignUp }: AuthFormProps) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();

    try {
      const result =
        mode === "sign-up"
          ? await authClient.signUp.email({
              name,
              email,
              password
            })
          : await authClient.signIn.email({
              email,
              password
            });

      if (result.error) {
        setMessage(result.error.message ?? "Authentication failed.");
        return;
      }

      window.location.assign("/");
    } catch {
      setMessage("Authentication is temporarily unavailable.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="authCard">
      <div className="authTabs" aria-label="Authentication mode">
        <button
          className={mode === "sign-in" ? "authTab active" : "authTab"}
          type="button"
          onClick={() => setMode("sign-in")}
        >
          Sign in
        </button>
        {allowSignUp ? (
          <button
            className={mode === "sign-up" ? "authTab active" : "authTab"}
            type="button"
            onClick={() => setMode("sign-up")}
          >
            Create first account
          </button>
        ) : null}
      </div>

      <form className="authForm" onSubmit={handleSubmit}>
        {mode === "sign-up" ? (
          <label>
            Name
            <input
              autoComplete="name"
              name="name"
              required
              type="text"
            />
          </label>
        ) : null}

        <label>
          Email
          <input
            autoComplete="email"
            name="email"
            required
            type="email"
          />
        </label>

        <label>
          Password
          <input
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            minLength={8}
            name="password"
            required
            type="password"
          />
        </label>

        {message ? (
          <p className="authMessage" role="alert">
            {message}
          </p>
        ) : null}

        <button className="primary authSubmit" disabled={pending} type="submit">
          {pending
            ? "Working…"
            : mode === "sign-up"
              ? "Create account"
              : "Sign in"}
        </button>
      </form>
    </div>
  );
}

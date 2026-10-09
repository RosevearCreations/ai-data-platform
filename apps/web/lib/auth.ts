import { betterAuth } from "better-auth";

import { authPool, bootstrapFirstOwner } from "./database";

function requireServerEnv(name: "BETTER_AUTH_SECRET" | "BETTER_AUTH_URL") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

const trustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const auth = betterAuth({
  database: authPool,
  secret: requireServerEnv("BETTER_AUTH_SECRET"),
  baseURL: requireServerEnv("BETTER_AUTH_URL"),
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.AUTH_ALLOW_SIGN_UP !== "true"
  },
  advanced: {
    database: {
      // Production schema is controlled by db:migrate + CI db:verify.
      // Disable Better Auth's eager live metadata validation so a Next/Vercel
      // build never depends on database metadata access merely to compile pages.
      validateSchema: false
    }
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await bootstrapFirstOwner(user.id);
        }
      }
    }
  },
  telemetry: {
    enabled: false
  }
});

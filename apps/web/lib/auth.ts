import { betterAuth } from "better-auth";
import { PostgresDialect } from "kysely";

import { authPool, bootstrapFirstOwner } from "./database";
import {build443TrustedOrigins} from "./build443-owner-auth-diagnostics";
import {recordBuild445RecoveryStage} from "./build445-recovery-ledger";

function requireServerEnv(name: "BETTER_AUTH_SECRET" | "BETTER_AUTH_URL") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

const trustedOrigins = build443TrustedOrigins(
  requireServerEnv("BETTER_AUTH_URL"),process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? ""
);

export const auth = betterAuth({
  database: {
    dialect: new PostgresDialect({ pool: authPool }),
    type: "postgres",
    schemaName: "auth"
  },
  secret: requireServerEnv("BETTER_AUTH_SECRET"),
  baseURL: requireServerEnv("BETTER_AUTH_URL"),
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.AUTH_ALLOW_SIGN_UP !== "true",
    minPasswordLength: 12,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const token = process.env.RESEND_API_KEY;
      const sender = process.env.AUTH_RECOVERY_FROM_EMAIL;
      if (!token || !sender) throw new Error("auth_recovery_mail_provider_not_configured");
      const allowed = new URL(requireServerEnv("BETTER_AUTH_URL"));
      const link = new URL(url);
      if (link.origin !== allowed.origin) throw new Error("auth_recovery_redirect_origin_mismatch");
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {Authorization: `Bearer ${token}`, "Content-Type": "application/json"},
        body: JSON.stringify({from:sender,to:[user.email],subject:"AI Data Platform password recovery",
          text:`A password reset was requested for AI Data Platform. Open this secure, time-limited link: ${url}\n\nIf this was not requested, ignore this email.`})
      });
      if (!response.ok) {
        try { await recordBuild445RecoveryStage(user.id,"PROVIDER_REJECTED"); } catch { /* retain original provider error */ }
        throw new Error("auth_recovery_delivery_failed");
      }
      const result=await response.json() as {id?:unknown};
      // Resend acceptance != successful delivery to the mailbox.
      if(typeof result.id==="string" && /^[a-zA-Z0-9-]{8,100}$/.test(result.id)){
        try{await recordBuild445RecoveryStage(user.id,"PROVIDER_ACCEPTED",result.id);}catch{/* do not turn an already-sent email into a false send failure */}
      }
    },
    onPasswordReset: async ({user}) => {
      // Better Auth commits the password transaction before invoking this callback.
      // Preserve successful recovery even if audit storage is temporarily unavailable.
      try{await recordBuild445RecoveryStage(user.id,"RESET_COMPLETED");}
      catch{console.error("build445_password_reset_audit_storage_unavailable");}
    },
    resetPasswordTokenExpiresIn: 900
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

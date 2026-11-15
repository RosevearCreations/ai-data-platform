const STRICT_SSL_MODE = "verify-full";

const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

export function enforceStrictPostgresTls(value: string) {
  const url = new URL(value);
  if (!POSTGRES_PROTOCOLS.has(url.protocol)) {
    throw new Error("database_url_protocol_invalid");
  }

  const sslMode = url.searchParams.get("sslmode");
  if (!sslMode || ["prefer", "require", "verify-ca"].includes(sslMode)) {
    url.searchParams.set("sslmode", STRICT_SSL_MODE);
  } else if (sslMode !== STRICT_SSL_MODE) {
    throw new Error("database_sslmode_not_verify_full");
  }

  url.searchParams.delete("uselibpqcompat");
  return url.toString();
}

export const DATABASE_TLS_POLICY = Object.freeze({
  sslmode: STRICT_SSL_MODE,
  certificateValidation: "verify-full" as const,
  weakCompatibilityModeAllowed: false as const
});

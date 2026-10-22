export function shouldRunProductionMigrations(
  vercelEnv: string | undefined = process.env.VERCEL_ENV
) {
  return vercelEnv === "production";
}

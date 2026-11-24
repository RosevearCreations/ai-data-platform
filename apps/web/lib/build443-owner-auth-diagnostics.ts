export const BUILD_443 = 443 as const;
export const BUILD_443_PRODUCTION_ORIGINS = [
  "https://ai-data-platform-johns-projects-8f256ece.vercel.app",
  "https://ai-data-platform-beryl.vercel.app"
] as const;

function exactOrigin(raw: string): string {
  const input = raw.trim();
  if (!input) throw new Error("build443_empty_origin");
  const parsed = new URL(input);
  if (!["https:","http:"].includes(parsed.protocol)||parsed.username||parsed.password||parsed.pathname!=="/"||parsed.search||parsed.hash) throw new Error("build443_origin_not_exact");
  return parsed.origin;
}

/** Only the two previously verified production aliases and explicitly operator-configured origins. No wildcards or derived request Host values. */
export function build443TrustedOrigins(canonical: string, configured: string): string[] {
  const origins = [...BUILD_443_PRODUCTION_ORIGINS,canonical,...configured.split(",").map(s=>s.trim()).filter(Boolean)];
  return [...new Set(origins.map(exactOrigin))];
}

export type Build443Diagnostics = {
  schema:"rosevear.ai-data-platform.build443-auth-diagnostics.v1";
  authMode:"EMAIL_AND_PASSWORD";
  loginOriginAllowed:boolean|null;
  recoveryMailConfigured:boolean;
  independentWitnessEnrollmentConfigured:boolean;
  accountIdentityDisclosure:"NONE";
};

export function build443Diagnostics(origin:string|null,allowed:readonly string[],mailKey:boolean,mailFrom:boolean,witnessKeys:boolean,witnessBindings:boolean):Build443Diagnostics{
  let loginOriginAllowed:boolean|null=null;
  if(origin){
    try{loginOriginAllowed=allowed.includes(exactOrigin(origin));}catch{loginOriginAllowed=false;}
  }
  return {
    schema:"rosevear.ai-data-platform.build443-auth-diagnostics.v1",
    authMode:"EMAIL_AND_PASSWORD",loginOriginAllowed,
    recoveryMailConfigured:mailKey&&mailFrom,
    independentWitnessEnrollmentConfigured:witnessKeys&&witnessBindings,
    accountIdentityDisclosure:"NONE"
  };
}

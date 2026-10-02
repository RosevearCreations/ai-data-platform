export const WORKSPACE_SLUGS = [
  "rosiedazzlers",
  "devilndove",
  "personal"
] as const;

export type WorkspaceSlug = (typeof WORKSPACE_SLUGS)[number];

export const PLATFORM_NAME = "AI Data Platform";
export const PLATFORM_BUILD = "001";

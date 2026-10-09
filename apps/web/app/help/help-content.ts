export const HELP_TOPICS = {
  "platform-overview": {
    title: "AI Data Platform overview",
    summary: "This landing area shows who is signed in, the shared platform purpose and the main operational entry points.",
    steps: [
      "Sign in before working with private workspace data.",
      "Choose the task you need: barcode intake, intelligence review, remote execution, workspace profiles, connectors or production learning.",
      "Confirm the workspace shown by the destination page before changing data."
    ],
    notes: [
      "Workspace data remains separated by PostgreSQL row-level security.",
      "The Chrome extension and website use the same authorized workspace memberships."
    ]
  },
  "workspaces": {
    title: "Authorized workspaces",
    summary: "Each card is a workspace the signed-in account is allowed to access. The profile label defines reusable domain behavior while the role controls management rights.",
    steps: [
      "Check the workspace name and profile before entering or approving data.",
      "Owners and admins can manage profile/workspace settings from Workspace Profiles.",
      "Members can read or use only the functions permitted by their workspace and feature."
    ],
    notes: ["Archived workspaces are removed from normal active listings but retained data stays protected."]
  },
  "ai-fields": {
    title: "AI suggested fields",
    summary: "This tool proposes field semantics from a bounded sample. It does not automatically choose unverified selectors or write data downstream.",
    steps: [
      "Describe the extraction intent.",
      "Provide only the bounded page context needed for the suggestion.",
      "Review every suggested field, confidence value and warning.",
      "Use deterministic selector tools to verify the final extraction."
    ],
    notes: ["Do not place passwords, tokens or unnecessary sensitive personal data in the context JSON."]
  },
  "guardrails": {
    title: "Platform guardrails",
    summary: "These are system-wide design rules: workspace isolation, source evidence, explicit review and deterministic repeatable processing.",
    steps: [
      "Keep source evidence attached to external observations.",
      "Review material changes before business-system writes.",
      "Use the narrowest workspace and capability needed for the job."
    ],
    notes: ["Higher-risk automation is intentionally fail-closed until its specific gates are satisfied."]
  },
  "sign-in": {
    title: "Secure workspace access",
    summary: "Authentication establishes the user identity that PostgreSQL RLS uses to determine which workspaces can be read or changed.",
    steps: [
      "Use the account that should own or access the workspaces.",
      "After sign-in, verify that only expected workspaces appear.",
      "Sign out when using a shared computer."
    ],
    notes: ["A callback URL is accepted only when it resolves back to this AI Data Platform origin."]
  },
  "barcode-overview": {
    title: "Mobile barcode intake",
    summary: "Barcode intake stages UPC/EAN/GTIN identifiers for explicit review in supported Personal Media or Maker Commerce workspaces.",
    steps: [
      "Choose the correct destination workspace.",
      "Scan with the camera or type the identifier.",
      "Review exact, unmatched or duplicate status.",
      "Approve or reject the staged handoff explicitly."
    ],
    notes: ["Camera access starts only when requested. Location is never requested by this workflow."]
  },
  "barcode-capture": {
    title: "Barcode capture controls",
    summary: "Use these controls to choose a target, enter or scan a barcode and manage the device-local offline queue.",
    steps: [
      "Select the target workspace first.",
      "Use manual entry when BarcodeDetector is unavailable.",
      "If offline, allow the capture to queue locally.",
      "When online, send the queue and verify each resulting review item."
    ],
    notes: ["Only 8, 12, 13 or 14 digit identifiers are accepted."]
  },
  "barcode-review": {
    title: "Barcode review queue",
    summary: "The review queue shows server-side match suggestions but requires a human decision before handoff.",
    steps: [
      "Read the match summary and capture source.",
      "Reject duplicate captures.",
      "Approve only when the identifier and proposed destination are correct."
    ],
    notes: ["Approval does not bypass later downstream validation."]
  },
  "intelligence-overview": {
    title: "Persistent intelligence",
    summary: "This area shows durable workspace intelligence synchronized from the extension and append-only evidence from controlled integrations.",
    steps: [
      "Select the relevant workspace section.",
      "Review module versions and synchronization timestamps.",
      "Investigate pending or unexpected summaries before relying on them."
    ],
    notes: ["These views are primarily evidence/review surfaces, not silent mutation paths."]
  },
  "intelligence-workspace": {
    title: "Workspace intelligence modules",
    summary: "Each module card is isolated to the current workspace and reports the most recent synchronized server version and summary.",
    steps: [
      "Check the module name and synchronization time.",
      "Compare summary counts with the workflow that produced them.",
      "Reconnect/synchronize the extension if expected evidence is missing."
    ],
    notes: ["A module from one workspace is never substituted into another workspace."]
  },
  "intelligence-audit": {
    title: "Append-only integration audit",
    summary: "Audit events preserve integration decisions and handoff evidence. Runtime code can append but cannot update or delete these records.",
    steps: [
      "Use timestamps and action names to reconstruct what happened.",
      "Investigate failed or unexpected handoffs from their source evidence.",
      "Treat audit history as evidence rather than editable notes."
    ],
    notes: ["Database acceptance tests verify runtime audit immutability."]
  },
  "remote-overview": {
    title: "Controlled remote browser pilot",
    summary: "The Browserless pilot is intentionally narrow: approved public pages, direct egress, one page, one concurrent browser and strict unit/runtime limits.",
    steps: [
      "Keep the global kill switch active until Browserless authentication and token setup are complete.",
      "Approve the exact public source in Source Policy.",
      "Allowlist only that approved source for the intended workspace.",
      "Run one bounded pilot and review cost/reliability evidence.",
      "Kill remote execution immediately if behavior is unexpected."
    ],
    notes: [
      "Proxy, stealth, CAPTCHA solving and authenticated-profile bypass are excluded.",
      "Until the production token and execution gates are deliberately configured, leave this workflow fail-closed."
    ],
    manual: [
      "Sign in to Browserless and obtain the API token. If you already have the token, continue without pasting it into ChatGPT, GitHub or screenshots."
      "Copy the Browserless API token into the production host's encrypted secret store as BROWSERLESS_API_TOKEN. Do not put the token in ChatGPT or GitHub.",
      "Set REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED=true in the production environment.",
      "Keep REMOTE_EXECUTION_KILL_SWITCH=true until the workspace/source controls are ready.",
      "After allowlisting the approved source, set REMOTE_EXECUTION_KILL_SWITCH=false only for the controlled pilot.",
      "After the pilot, restore the kill switch unless continued live testing is deliberately approved."
    ]
  },
  "remote-readiness": {
    title: "Remote execution production readiness",
    summary: "This section shows whether the provider token, execution flag and global kill switch permit any live Browserless request.",
    steps: [
      "Token must report configured.",
      "Execution flag must report on.",
      "Global kill switch must report off only during an approved pilot.",
      "Do not proceed unless the page says live pilot ready."
    ],
    notes: ["A missing variable or active kill switch is a deliberate fail-closed state."]
  },
  "remote-controls": {
    title: "Workspace remote controls",
    summary: "Workspace controls add another authorization layer below the global gate and pin the run to an exact approved Source Policy record.",
    steps: [
      "Arm only the intended workspace.",
      "Allowlist an approved public-source candidate.",
      "Run the one-page pilot only after global readiness is satisfied.",
      "Use Kill remote execution to stop that workspace immediately."
    ],
    notes: ["Owners/admins manage controls; other members do not receive management actions."]
  },
  "remote-evidence": {
    title: "Remote provider evidence",
    summary: "Cost, success/failure counts and provider events make the pilot measurable before broader remote execution is considered.",
    steps: [
      "Review provider units and success rate after every pilot.",
      "Inspect recent events for blocked, cancelled or failed work.",
      "Keep the pilot disabled if evidence is incomplete or unexpected."
    ],
    notes: ["Build 030 will use this evidence for the production-learning review."]
  },
  "profiles-overview": {
    title: "Workspace profiles",
    summary: "Profiles separate reusable domain behavior from workspace identity. They define normalization, review, provenance/history policy, templates and feature capabilities.",
    steps: [
      "Use a built-in profile when its domain matches.",
      "Create a custom profile only when the domain needs different fields/review dimensions.",
      "Keep unnecessary capabilities disabled."
    ],
    notes: ["Existing workspace IDs and slugs remain stable."]
  },
  "profiles-existing": {
    title: "Profile catalog",
    summary: "Built-in profiles document established domain behavior; custom profiles can be edited or archived by authorized managers.",
    steps: [
      "Read normalization and review dimensions before using a profile.",
      "Do not try to edit built-in definitions.",
      "Archive custom profiles that should no longer be selectable for new workspaces."
    ],
    notes: ["Archiving a profile does not rewrite historical workspace data."]
  },
  "profiles-custom": {
    title: "Create a custom profile",
    summary: "A custom profile starts conservatively and can define stable normalization fields and review dimensions without modifying extractor core code.",
    steps: [
      "Give the profile a clear domain name and description.",
      "Choose Business or Personal; this class becomes immutable.",
      "Enter stable normalization field keys and review dimensions.",
      "Enable higher-risk capabilities only after their use is understood."
    ],
    notes: ["History and Source Policy are safe defaults; remote execution and downstream writes default off."]
  },
  "workspace-create": {
    title: "Create workspace from profile",
    summary: "New workspaces inherit reusable behavior from the selected active profile while receiving their own isolated workspace ID and owner membership.",
    steps: [
      "Enter a recognizable workspace name.",
      "Describe its purpose.",
      "Choose the correct active profile.",
      "After creation, confirm the profile and owner role on the active workspace card."
    ],
    notes: ["Workspace creation is atomic and re-checks owner/admin eligibility in the database."]
  },
  "workspace-manage": {
    title: "Manage active workspaces",
    summary: "Owners/admins can update workspace display metadata or archive a workspace without deleting its retained evidence.",
    steps: [
      "Confirm the workspace before editing.",
      "Keep purpose text current so operators know what belongs there.",
      "Archive only when the workspace should leave normal active use."
    ],
    notes: ["Members without management rights see read-only status."]
  },
  "connectors-overview": {
    title: "Plugin & Connector SDK",
    summary: "Build 029 adds a versioned extension boundary for imports, enrichment and approved exports without changing extractor core logic.",
    steps: [
      "Review the registered connector manifest.",
      "Configure it separately for each workspace.",
      "Grant only the capabilities needed.",
      "Enable it only after configuration validation.",
      "Run a bounded test and inspect the append-only audit."
    ],
    notes: [
      "Connector code is statically registered server-side; arbitrary uploaded JavaScript is not executed.",
      "The included example connector requires no external account or secret."
    ]
  },
  "connector-registry": {
    title: "Connector manifest registry",
    summary: "A manifest declares SDK/connector version, capabilities, config schema, exact secret references and execution limits.",
    steps: [
      "Confirm the connector key/version.",
      "Check whether import, enrichment or export is supported.",
      "Review any required secret environment-variable names before configuration."
    ],
    notes: ["Incompatible SDK/manifest versions fail closed before registration or execution."]
  },
  "connector-workspace": {
    title: "Workspace connector grants",
    summary: "Connector configuration is workspace-scoped. The granted capability set can be narrower than the connector's manifest capabilities.",
    steps: [
      "Configure the connector for the intended workspace.",
      "Grant the minimum capabilities required.",
      "Keep the connector disabled until configuration is reviewed.",
      "Enable it, run a bounded test, then disable it when not needed."
    ],
    notes: [
      "Secret values are never stored in connector configuration; only manifest-approved references are stored.",
      "Owners/admins manage connector state."
    ],
    manual: [
      "The Build 029 example connector requires no manual service or variable setup.",
      "For a future connector with credentials, open its manifest on this page and note the exact environment-variable name shown.",
      "Create that variable in the production hosting provider's encrypted secret/environment settings.",
      "Paste the third-party credential there, never into ChatGPT, source code, client storage or connector JSON.",
      "Return to this page, configure the connector's secret reference, keep it disabled, run validation, then enable and test it.",
      "If the third-party connector requires an account or application registration, follow the provider link documented with that connector before creating the environment variable."
    ]
  },
  "connector-audit": {
    title: "Connector execution audit",
    summary: "Every attempted enabled connector execution records bounded status evidence without copying raw secret values into the audit ledger.",
    steps: [
      "Review succeeded, failed and blocked results.",
      "Use error codes to identify grant/configuration issues.",
      "Disable the connector when unexpected failures appear."
    ],
    notes: ["Runtime code can append connector audit events but cannot update or delete them."]
  },
  "learning-overview": {
    title: "Production learning & cost review",
    summary: "Build 030 reads live RLS-scoped operational evidence across the platform and turns measured outcomes plus explicit evidence gaps into the next roadmap.",
    steps: [
      "Review the current evidence cards before relying on any trend.",
      "Treat provider units and measured payload bytes as cost proxies, not hard-coded currency billing.",
      "Read GAP findings as missing telemetry, not as a zero result.",
      "Use the renewed roadmap only in the displayed priority order unless business priorities deliberately override it."
    ],
    notes: [
      "The page never displays Browserless API-token values.",
      "Sync-conflict frequency and recipe-repair success/failure are explicitly marked as gaps until durable outcome telemetry exists."
    ]
  },
  "learning-evidence": {
    title: "Operational evidence baseline",
    summary: "These values are calculated at request time from the authenticated account's authorized PostgreSQL workspaces.",
    steps: [
      "Use barcode, integration, remote and connector counts as durable activity evidence.",
      "Use source-policy summary counts to find expired or review-required governance.",
      "Use payload bytes as a storage-growth signal rather than an invoice.",
      "Compare workspace cards to ensure the evidence belongs to the expected profile and role."
    ],
    notes: ["RLS means a user never receives another account's workspace evidence through this review."]
  },
  "learning-browserless": {
    title: "Browserless production evidence gate",
    summary: "Build 030 reports whether the token, master execution flag and global kill switch are configured, without reading the token value into the UI.",
    steps: [
      "Store BROWSERLESS_API_TOKEN only in the production host's encrypted server environment.",
      "Set REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED=true only when preparing the controlled pilot.",
      "Keep REMOTE_EXECUTION_KILL_SWITCH=true while source policy and workspace allowlisting are prepared.",
      "Set REMOTE_EXECUTION_KILL_SWITCH=false only for the approved one-page pilot window.",
      "After the pilot, review provider units/success evidence and restore the kill switch unless continued live testing is approved."
    ],
    notes: [
      "A token existing in your Browserless account is not the same as being configured in the deployed application.",
      "This page reports configured/not configured only; it never exposes the secret."
    ],
    manual: [
      "Open the production hosting provider for the AI Data Platform project.",
      "Create or update the encrypted server secret BROWSERLESS_API_TOKEN with the Browserless API key.",
      "Create/update REMOTE_EXECUTION_PROVIDER_EXECUTION_ENABLED with value true for the intended production environment.",
      "Create/update REMOTE_EXECUTION_KILL_SWITCH with value true initially.",
      "Redeploy or restart the production application if the hosting provider requires it for environment-variable changes.",
      "Open /remote-execution and confirm Token configured = yes, execution enabled = yes and the global kill switch is still active.",
      "Prepare the approved Source Policy/workspace allowlist, then temporarily set REMOTE_EXECUTION_KILL_SWITCH=false for the controlled pilot."
    ]
  },
  "learning-gaps": {
    title: "Measured findings and evidence gaps",
    summary: "A GAP means the platform cannot yet make a production trend claim from durable data; it is intentionally different from a measured zero.",
    steps: [
      "Address ACTION findings before expanding automation.",
      "Use WATCH findings as adoption/readiness checks.",
      "Keep HEALTHY findings under observation instead of assuming they remain healthy.",
      "Prioritize GAP closure when future decisions depend on that missing measurement."
    ],
    notes: ["Build 030 does not invent conflict, repair-success or cost numbers that are not durably recorded."]
  },
  "learning-workspaces": {
    title: "Workspace operational footprint",
    summary: "Each workspace card summarizes synchronized assets, barcode activity, remote evidence, connector state and membership accountability.",
    steps: [
      "Confirm the workspace/profile identity.",
      "Check sync version-change volume against actual operational use.",
      "Review pending barcode decisions and remote/provider activity.",
      "Confirm there is an accountable owner before increasing automation."
    ],
    notes: ["Counts are scoped by normal workspace RLS."]
  },
  "learning-roadmap": {
    title: "Evidence-driven roadmap renewal",
    summary: "Builds 031–036 are ordered from Build 030 findings instead of extending the queue from assumptions.",
    steps: [
      "Build 031 closes telemetry gaps needed for future reliability claims.",
      "Build 032 establishes a real Browserless cost/reliability baseline.",
      "Build 033 proves consumer-side integration acceptance.",
      "Build 034 adds retention/storage enforcement.",
      "Build 035 reviews adoption and permission outcomes.",
      "Build 036 repeats production learning and renews the roadmap again."
    ],
    notes: ["Business priorities can deliberately change this order, but the default queue follows current evidence."]
  },
  "help-index": {
    title: "Help center",
    summary: "The help center collects the same contextual guidance available from every circled information control across the site.",
    steps: [
      "Open the topic matching the page or section you are using.",
      "Follow the numbered operating steps.",
      "Use Manual intervention only when that section explicitly says external setup is required."
    ],
    notes: ["If a section has no Manual intervention block, no external account/variable setup is required for that function."]
  }
} as const;

export type HelpTopicKey = keyof typeof HELP_TOPICS;

export const HELP_GROUPS: Array<{
  title: string;
  topics: HelpTopicKey[];
}> = [
  {
    title: "Platform & access",
    topics: ["platform-overview", "workspaces", "sign-in", "guardrails", "ai-fields"]
  },
  {
    title: "Barcode & intelligence",
    topics: ["barcode-overview", "barcode-capture", "barcode-review", "intelligence-overview", "intelligence-workspace", "intelligence-audit"]
  },
  {
    title: "Remote execution",
    topics: ["remote-overview", "remote-readiness", "remote-controls", "remote-evidence"]
  },
  {
    title: "Workspace profiles",
    topics: ["profiles-overview", "profiles-existing", "profiles-custom", "workspace-create", "workspace-manage"]
  },
  {
    title: "Connectors",
    topics: ["connectors-overview", "connector-registry", "connector-workspace", "connector-audit"]
  },
  {
    title: "Production learning",
    topics: ["learning-overview", "learning-evidence", "learning-browserless", "learning-gaps", "learning-workspaces", "learning-roadmap"]
  }
];

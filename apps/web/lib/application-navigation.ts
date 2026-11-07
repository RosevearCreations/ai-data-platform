import type { HelpTopicKey } from "@/app/help/help-content";

// Build 117 — Application Shell, Navigation Architecture & Workflow Consolidation
export type ApplicationNavigationItem = {
  href: string;
  label: string;
  description: string;
  helpTopic: HelpTopicKey;
};

export type ApplicationNavigationGroup = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  helpTopic: HelpTopicKey;
  items: ApplicationNavigationItem[];
};

export const APPLICATION_NAVIGATION: ApplicationNavigationGroup[] = [
  {
    id: "overview",
    label: "Overview",
    shortLabel: "Home",
    description: "Operational home, workflow directory and platform-wide guidance.",
    helpTopic: "shell-overview",
    items: [
      {
        href: "/",
        label: "Command Center",
        description: "Workspace activity, attention and recent evidence.",
        helpTopic: "command-center"
      },
      {
        href: "/workflows",
        label: "Workflow Directory",
        description: "Task-oriented directory for every current operator workflow.",
        helpTopic: "workflow-directory"
      },
      {
        href: "/runbooks",
        label: "Guided Runbooks",
        description: "Follow governed multi-step workflows without bypassing existing gates.",
        helpTopic: "workflow-directory"
      },
      {
        href: "/reporting",
        label: "Reporting Studio",
        description: "Configure KPI dashboards and export evidence-based reports.",
        helpTopic: "command-center"
      },
      {
        href: "/capacity-planning",
        label: "Capacity Planning",
        description: "Forecast storage, records, provider usage, collection, integrations and retention.",
        helpTopic: "learning-overview"
      },
      {
        href: "/hardening",
        label: "Hardening Audit",
        description: "Review accessibility, mobile, performance and failure-recovery readiness.",
        helpTopic: "shell-overview"
      },
      {
        href: "/owner-acceptance",
        label: "Owner Acceptance",
        description: "Review Build 280 Production Learning V, owner acceptance and evidence-backed next-batch renewal.",
        helpTopic: "learning-overview"
      },
      {
        href: "/evidence-baseline",
        label: "Evidence Baseline",
        description: "Triage current evidence into active, validated and historical findings for Builds 274–279.",
        helpTopic: "learning-overview"
      },
      {
        href: "/search",
        label: "Unified Search",
        description: "Search authorized records, evidence, workspaces and guidance.",
        helpTopic: "unified-search"
      },
      {
        href: "/operator-workspaces",
        label: "Operator Workspaces",
        description: "Reopen saved filter profiles and browser-local working views.",
        helpTopic: "operator-workspaces"
      },
      {
        href: "/attention",
        label: "Attention Center",
        description: "Review failures, exceptions, pending decisions and follow-up work.",
        helpTopic: "operator-attention-center"
      },
      {
        href: "/system-reliability",
        label: "System Reliability",
        description: "Review measured health, durable trend comparison, recurring failure patterns and recovery readiness.",
        helpTopic: "command-center"
      },
      {
        href: "/integration-health",
        label: "Integration Health",
        description: "Review connection state, measured latency, credential risk, webhook outcomes, event queues and degraded integration services.",
        helpTopic: "connectors-overview"
      }
    ]
  },
  {
    id: "data",
    label: "Data & Review",
    shortLabel: "Data",
    description: "Capture, review, approve and explore governed data.",
    helpTopic: "shell-data",
    items: [
      {
        href: "/data-library",
        label: "Unified Data Library",
        description: "Search and inspect governed records and provenance.",
        helpTopic: "data-library-overview"
      },
      {
        href: "/data-review",
        label: "Data Review",
        description: "Review extracted and normalized data before approval.",
        helpTopic: "data-library-records"
      },
      {
        href: "/data-review/bulk",
        label: "Bulk Review",
        description: "Preview and commit governed multi-batch decisions or route exceptions.",
        helpTopic: "data-library-records"
      },
      {
        href: "/data-quality",
        label: "Data Quality",
        description: "Score validation findings, duplicates, staleness and source changes before approval.",
        helpTopic: "data-quality-workbench"
      },
      {
        href: "/provenance-lineage",
        label: "Provenance & Lineage",
        description: "Trace source, review, approval, publication and delivery evidence.",
        helpTopic: "data-library-overview"
      },
      {
        href: "/audit-evidence",
        label: "Audit & Evidence",
        description: "Search append-only evidence across review, delivery and operational modules.",
        helpTopic: "data-library-overview"
      },
      {
        href: "/approved-data",
        label: "Approved Data",
        description: "Review data that is eligible for governed publishing.",
        helpTopic: "publication-delivery-overview"
      }
    ]
  },
  {
    id: "collection",
    label: "Collection & Intelligence",
    shortLabel: "Collect",
    description: "Define sources, recipes, runs and intelligence workflows.",
    helpTopic: "shell-collection",
    items: [
      {
        href: "/collection-projects",
        label: "Collection Projects",
        description: "Manage collection projects, source readiness and policy.",
        helpTopic: "collection-projects-overview"
      },
      {
        href: "/capture",
        label: "Barcode Intake",
        description: "Capture identifiers and route them through governed review.",
        helpTopic: "barcode-overview"
      },
      {
        href: "/recipe-builder",
        label: "Recipe Builder",
        description: "Build and preview structured extraction recipes.",
        helpTopic: "recipe-builder-overview"
      },
      {
        href: "/collection-runs",
        label: "Collection Runs",
        description: "Inspect collection execution and durable run evidence.",
        helpTopic: "collection-projects-readiness"
      },
      {
        href: "/intelligence",
        label: "Intelligence Library",
        description: "Review derived intelligence and evidence-backed insights.",
        helpTopic: "intelligence-overview"
      }
    ]
  },
  {
    id: "corrective",
    label: "Corrective Operations",
    shortLabel: "Corrective",
    description: "Operate current corrective cases without navigating historical build generations.",
    helpTopic: "shell-corrective",
    items: [
      {
        href: "/approved-data/reconciliation/corrective-generation-operations",
        label: "Operations Console",
        description: "Current case standing, timeline, findings and audit export.",
        helpTopic: "corrective-operations-console"
      },
      {
        href: "/approved-data/reconciliation/corrective-generation-state-machine",
        label: "State Machine",
        description: "Canonical lifecycle and cross-generation invariant audit.",
        helpTopic: "corrective-state-machine"
      },
      {
        href: "/approved-data/reconciliation/unified-corrective-generation-planning",
        label: "Planning",
        description: "Re-triage recurrent cases and create governed corrective plans.",
        helpTopic: "reconciliation-triage-overview"
      },
      {
        href: "/approved-data/reconciliation/unified-corrective-generation-delivery",
        label: "Delivery",
        description: "Activate and execute approved corrective deliveries.",
        helpTopic: "corrective-delivery-overview"
      },
      {
        href: "/approved-data/reconciliation/unified-corrective-generation-closure",
        label: "Verification & Closure",
        description: "Verify downstream state and record governed re-closure.",
        helpTopic: "corrective-closure-overview"
      },
      {
        href: "/approved-data/reconciliation/post-unified-corrective-generation-reclosure",
        label: "Regression Monitoring",
        description: "Monitor closed generations for stable state or recurrence.",
        helpTopic: "post-delivery-reconciliation-overview"
      },
      {
        href: "/approved-data/reconciliation/history",
        label: "History & Legacy Workflows",
        description: "Access historical generation-specific operator screens.",
        helpTopic: "corrective-history"
      }
    ]
  },
  {
    id: "integrations",
    label: "Integrations & Execution",
    shortLabel: "Integrate",
    description: "Manage connectors, remote execution and downstream delivery.",
    helpTopic: "shell-integrations",
    items: [
      {
        href: "/app-connections",
        label: "App Connection Registry",
        description: "Catalog peer applications with stable identity, environment and tenant/workspace mappings plus safe read-only capability discovery.",
        helpTopic: "connectors-overview"
      },
      {
        href: "/data-contracts",
        label: "Cross-App Data Contracts",
        description: "Review reusable versioned customer, product, service, booking, job, staff, equipment, invoice, media, inventory and notification schemas.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/field-mappings",
        label: "Visual Field Mapping Studio",
        description: "Map Rosevear application field paths into reviewed canonical data-contract profiles.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/schema-drift",
        label: "Schema Drift & Mapping Repair",
        description: "Detect source/canonical schema drift and prepare reviewed mapping repairs before delivery.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/connector-setup",
        label: "Connector Setup Wizard",
        description: "Prepare peer-app connection drafts with guided environment, tenant/workspace and safe-test readiness checks.",
        helpTopic: "connectors-overview"
      },
      {
        href: "/credential-vault",
        label: "Credential Vault",
        description: "Track reference-only credential metadata, rotation dates, expiry and owner-controlled replacement evidence.",
        helpTopic: "connectors-overview"
      },
      {
        href: "/connectors",
        label: "Connectors",
        description: "Review connector capabilities, grants and workspace use.",
        helpTopic: "connectors-overview"
      },
      {
        href: "/connection-validation",
        label: "Automatic Connection Validation",
        description: "Automatically validate configuration, credential-reference readiness, destinations, grants and bounded non-export test eligibility.",
        helpTopic: "connectors-overview"
      },
      {
        href: "/connector-diagnostics",
        label: "Connector Diagnostics",
        description: "Validate connector configuration, permissions, endpoints and recovery guidance.",
        helpTopic: "connectors-overview"
      },
      {
        href: "/integration-recovery",
        label: "Integration Recovery",
        description: "Run bounded GET/HEAD connector health recovery and review owner-controlled recovery decisions.",
        helpTopic: "connectors-overview"
      },
      {
        href: "/webhook-gateway",
        label: "Webhook Gateway & Event Intake",
        description: "Configure signed, replay-safe inbound event endpoints and inspect durable receipts.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/event-bus",
        label: "Cross-App Event Bus",
        description: "Publish reviewed webhook receipts into governed subscriptions and inspect durable held routes.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/workflow-automation",
        label: "Workflow Automation",
        description: "Author reviewed event-to-action rules and inspect held governed cross-app action intents.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/integration-suggestions",
        label: "Integration Suggestions",
        description: "Review bounded AI-assisted mapping and workflow suggestions without automatic activation.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/event-recovery",
        label: "Event Recovery Console",
        description: "Review dead-letter failures, bounded replay requests and durable held recovery routes.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/delivery-guarantees",
        label: "Delivery Guarantees",
        description: "Review deterministic idempotency keys, exactly-once internal intents and duplicate suppression evidence.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/customer-identities",
        label: "Customer Identity Resolution",
        description: "Review privacy-minimized cross-application customer/contact match candidates and shared identity groups.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/catalogue-exchange",
        label: "Catalogue Exchange",
        description: "Normalize product, service and campground catalogue records and review held exchange packages.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/media-asset-exchange",
        label: "Media & Asset Exchange",
        description: "Register deduplicated photos, documents, receipts and generated-media references and review held exchange packages.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/notification-consent",
        label: "Notification & Consent",
        description: "Record channel consent evidence and review held notification requests for future governed Comms Hub handoff.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/shared-task-exchange",
        label: "Shared Tasks & Work Queue",
        description: "Create governed cross-app tasks, link follow-ups and review held work-queue exchange packages.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/shared-scheduling",
        label: "Shared Scheduling & Calendar",
        description: "Prepare governed appointments and held cross-app calendar exchange packages with local overlap evidence.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/remote-execution",
        label: "Provider Pilot Baseline",
        description: "Review bounded provider readiness, terminal-run cost, latency, outcomes and blockers.",
        helpTopic: "remote-overview"
      },
      {
        href: "/integration-delivery",
        label: "Consumer Acceptance",
        description: "Reconcile conformance, live dry-run, controlled-live acknowledgement, replay and durable receipt evidence.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/integration-simulator",
        label: "Integration Simulator",
        description: "Preview package compatibility and dry-run validation before delivery.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/approved-data/delivery",
        label: "Publication Delivery",
        description: "Map approved publications to supported consumers.",
        helpTopic: "publication-delivery-overview"
      },
      {
        href: "/approved-data/live-delivery",
        label: "Controlled Live Delivery",
        description: "Execute controlled downstream delivery with idempotency.",
        helpTopic: "controlled-live-delivery-overview"
      }
    ]
  },
  {
    id: "workspace",
    label: "Workspace & Administration",
    shortLabel: "Admin",
    description: "Workspace profiles, permissions, adoption and lifecycle controls.",
    helpTopic: "shell-workspace",
    items: [
      {
        href: "/workspace-profiles",
        label: "Workspace Profiles",
        description: "Manage workspace operating profiles and capabilities.",
        helpTopic: "profiles-overview"
      },
      {
        href: "/adoption",
        label: "Adoption & Permissions",
        description: "Review least-privilege adoption, stale grants, capability drift and owner disposition without automatic access changes.",
        helpTopic: "adoption-overview"
      },
      {
        href: "/security-access-review",
        label: "Security & Access Review",
        description: "Review workspace access, capabilities, connector grants and least-privilege recommendations.",
        helpTopic: "adoption-overview"
      },
      {
        href: "/first-evidence",
        label: "First-Evidence Completion",
        description: "Guide real adoption through bounded Collect, Review, Approve, Publish and Deliver evidence.",
        helpTopic: "first-evidence-overview"
      },
      {
        href: "/retention",
        label: "Retention Cleanup Readiness",
        description: "Reconcile storage budgets, cleanup failures, archive/delete eligibility, protected evidence and approval state.",
        helpTopic: "retention-overview"
      },
      {
        href: "/production-learning",
        label: "Production Learning",
        description: "Review measured production outcomes, Production Learning V evidence gaps and next-batch renewal candidates.",
        helpTopic: "learning-overview"
      },
      {
        href: "/appearance",
        label: "Appearance & Design System",
        description: "Inspect the active theme, marble surfaces and reusable interface tokens.",
        helpTopic: "appearance-design-system"
      }
    ]
  },
  {
    id: "help",
    label: "Help & Guidance",
    shortLabel: "Help",
    description: "Contextual operating guidance for every major surface.",
    helpTopic: "help-index",
    items: [
      {
        href: "/help",
        label: "Help Center",
        description: "Browse all contextual operating topics and manual steps.",
        helpTopic: "help-index"
      }
    ]
  }
];

export const MODULE_CARDS = APPLICATION_NAVIGATION.filter(
  (group) => group.id !== "overview" && group.id !== "help"
);

export function moduleHubHref(groupId: string) {
  return "/modules/" + groupId;
}

export function moduleNavigationGroupById(groupId: string) {
  return MODULE_CARDS.find((group) => group.id === groupId) ?? null;
}

export function activeNavigationItem(pathname: string) {
  const candidates = APPLICATION_NAVIGATION.flatMap((group) =>
    group.items.map((item) => ({ group, item }))
  ).sort((left, right) => right.item.href.length - left.item.href.length);

  return (
    candidates.find(({ item }) =>
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(item.href + "/")
    )?.item ?? null
  );
}

export function activeNavigationGroup(pathname: string) {
  const moduleHub = MODULE_CARDS.find(
    (group) =>
      pathname === moduleHubHref(group.id) ||
      pathname.startsWith(moduleHubHref(group.id) + "/")
  );
  if (moduleHub) return moduleHub;

  const candidates = APPLICATION_NAVIGATION.flatMap((group) =>
    group.items.map((item) => ({ group, item }))
  ).sort((left, right) => right.item.href.length - left.item.href.length);

  return (
    candidates.find(({ item }) =>
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(item.href + "/")
    )?.group ?? APPLICATION_NAVIGATION[0]
  );
}

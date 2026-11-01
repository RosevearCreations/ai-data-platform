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
        description: "Review measured application, database and operational health.",
        helpTopic: "command-center"
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
        href: "/connectors",
        label: "Connectors",
        description: "Review connector capabilities, grants and workspace use.",
        helpTopic: "connectors-overview"
      },
      {
        href: "/remote-execution",
        label: "Remote Execution",
        description: "Operate controlled remote-provider workflows.",
        helpTopic: "remote-overview"
      },
      {
        href: "/integration-delivery",
        label: "Integration Delivery",
        description: "Review delivery readiness and integration evidence.",
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
        description: "Review operational adoption without changing permissions automatically.",
        helpTopic: "adoption-overview"
      },
      {
        href: "/first-evidence",
        label: "First-Evidence Runbook",
        description: "Guide genuine operational evidence creation safely.",
        helpTopic: "first-evidence-overview"
      },
      {
        href: "/retention",
        label: "Retention & Cleanup",
        description: "Inspect evidence footprint and retention controls.",
        helpTopic: "retention-overview"
      },
      {
        href: "/production-learning",
        label: "Production Learning",
        description: "Review measured production outcomes and evidence gaps.",
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

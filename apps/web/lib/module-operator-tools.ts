import type { ApplicationNavigationGroup } from "./application-navigation";

export type ModuleTaskPanel = {
  id: string;
  label: string;
  description: string;
  itemHrefs: string[];
};

export type ModuleOperatorShortcut = {
  href: string;
  label: string;
  description: string;
};

export type ModuleOperatorTools = {
  taskPanels: ModuleTaskPanel[];
  shortcuts: ModuleOperatorShortcut[];
};

const MODULE_OPERATOR_TOOLS: Record<string, ModuleOperatorTools> = {
  data: {
    taskPanels: [
      {
        id: "find-inspect",
        label: "Find & inspect",
        description: "Locate governed records and inspect their provenance before changing anything.",
        itemHrefs: ["/data-library"]
      },
      {
        id: "review-approve",
        label: "Review & approve",
        description: "Review normalized data, inspect deterministic quality findings, then inspect the governed approved-data surface.",
        itemHrefs: ["/data-review", "/data-review/bulk", "/data-quality", "/provenance-lineage", "/audit-evidence", "/approved-data"]
      }
    ],
    shortcuts: [
      {
        href: "/data-library",
        label: "Find records",
        description: "Open the Unified Data Library."
      },
      {
        href: "/data-review",
        label: "Review queue",
        description: "Open the governed review surface."
      },
      {
        href: "/data-review/bulk",
        label: "Bulk review",
        description: "Preview multi-batch decisions and route held exceptions."
      },
      {
        href: "/data-quality",
        label: "Quality workbench",
        description: "Inspect deterministic validation and duplicate findings."
      },
      {
        href: "/provenance-lineage",
        label: "Trace provenance",
        description: "Follow source-to-delivery evidence and missing lineage links."
      },
      {
        href: "/audit-evidence",
        label: "Explore audit evidence",
        description: "Search append-only evidence across modules and authorized workspaces."
      }
    ]
  },
  collection: {
    taskPanels: [
      {
        id: "plan-capture",
        label: "Plan & capture",
        description: "Define collection intent and bring identifiers into the governed intake path.",
        itemHrefs: ["/collection-projects", "/capture"]
      },
      {
        id: "build-run",
        label: "Build & run",
        description: "Prepare extraction behavior, then inspect durable collection execution evidence.",
        itemHrefs: ["/recipe-builder", "/collection-runs"]
      },
      {
        id: "interpret",
        label: "Interpret results",
        description: "Review evidence-backed intelligence after collection and review work is complete.",
        itemHrefs: ["/intelligence"]
      }
    ],
    shortcuts: [
      {
        href: "/collection-projects",
        label: "Collection projects",
        description: "Open source readiness and project planning."
      },
      {
        href: "/collection-runs",
        label: "Run evidence",
        description: "Inspect recent collection execution."
      },
      {
        href: "/intelligence",
        label: "Intelligence",
        description: "Review derived intelligence."
      }
    ]
  },
  corrective: {
    taskPanels: [
      {
        id: "assess",
        label: "Assess current standing",
        description: "Start from current case standing and lifecycle evidence.",
        itemHrefs: [
          "/approved-data/reconciliation/corrective-generation-operations",
          "/approved-data/reconciliation/corrective-generation-state-machine"
        ]
      },
      {
        id: "plan-deliver",
        label: "Plan & deliver",
        description: "Use governed planning first, then enter approved corrective delivery.",
        itemHrefs: [
          "/approved-data/reconciliation/unified-corrective-generation-planning",
          "/approved-data/reconciliation/unified-corrective-generation-delivery"
        ]
      },
      {
        id: "verify-monitor",
        label: "Verify & monitor",
        description: "Verify downstream state, close only when allowed, and monitor for recurrence.",
        itemHrefs: [
          "/approved-data/reconciliation/unified-corrective-generation-closure",
          "/approved-data/reconciliation/post-unified-corrective-generation-reclosure"
        ]
      },
      {
        id: "history",
        label: "Historical evidence",
        description: "Open legacy generation-specific screens only when historical evidence is required.",
        itemHrefs: ["/approved-data/reconciliation/history"]
      }
    ],
    shortcuts: [
      {
        href: "/approved-data/reconciliation/corrective-generation-operations",
        label: "Current cases",
        description: "Open the current operations console."
      },
      {
        href: "/approved-data/reconciliation/unified-corrective-generation-planning",
        label: "Planning",
        description: "Open governed corrective planning."
      },
      {
        href: "/approved-data/reconciliation/unified-corrective-generation-closure",
        label: "Verify & close",
        description: "Open verification and closure."
      }
    ]
  },
  integrations: {
    taskPanels: [
      {
        id: "connect-execute",
        label: "Connect & execute",
        description: "Review connector authority and controlled remote execution.",
        itemHrefs: ["/connectors", "/connector-diagnostics", "/remote-execution"]
      },
      {
        id: "deliver",
        label: "Prepare & deliver",
        description: "Review integration readiness, publication mapping and controlled live delivery.",
        itemHrefs: [
          "/integration-delivery",
          "/approved-data/delivery",
          "/approved-data/live-delivery"
        ]
      }
    ],
    shortcuts: [
      {
        href: "/connectors",
        label: "Connectors",
        description: "Review connector capabilities and grants."
      },
      {
        href: "/connector-diagnostics",
        label: "Connector diagnostics",
        description: "Validate connector readiness and follow guided recovery."
      },
      {
        href: "/remote-execution",
        label: "Remote execution",
        description: "Open controlled remote-provider workflows."
      },
      {
        href: "/integration-delivery",
        label: "Delivery readiness",
        description: "Review integration-delivery evidence."
      }
    ]
  },
  workspace: {
    taskPanels: [
      {
        id: "configure",
        label: "Configure workspace",
        description: "Review workspace profiles, permissions and adoption standing.",
        itemHrefs: ["/workspace-profiles", "/adoption"]
      },
      {
        id: "operate-maintain",
        label: "Operate & maintain",
        description: "Create genuine first evidence, review retention and inspect measured production learning.",
        itemHrefs: ["/first-evidence", "/retention", "/production-learning"]
      },
      {
        id: "appearance",
        label: "Appearance",
        description: "Inspect the active Marble Standard theme and reusable interface contract.",
        itemHrefs: ["/appearance"]
      }
    ],
    shortcuts: [
      {
        href: "/workspace-profiles",
        label: "Workspace profiles",
        description: "Review capabilities and operating profiles."
      },
      {
        href: "/first-evidence",
        label: "First evidence",
        description: "Open the genuine-evidence runbook."
      },
      {
        href: "/retention",
        label: "Retention",
        description: "Inspect evidence footprint and cleanup controls."
      }
    ]
  }
};

export function moduleOperatorToolsById(groupId: string) {
  return MODULE_OPERATOR_TOOLS[groupId] ?? null;
}

export function validateModuleOperatorTools(
  group: ApplicationNavigationGroup,
  tools: ModuleOperatorTools
) {
  const itemHrefs = new Set(group.items.map((item) => item.href));
  const panelHrefs = tools.taskPanels.flatMap((panel) => panel.itemHrefs);
  const shortcutHrefs = tools.shortcuts.map((shortcut) => shortcut.href);

  return {
    panelHrefsValid: panelHrefs.every((href) => itemHrefs.has(href)),
    shortcutsValid: shortcutHrefs.every((href) => itemHrefs.has(href)),
    allItemsCovered: group.items.every((item) => panelHrefs.includes(item.href))
  };
}

// Build 117 — consolidated access to historical corrective-generation workflows.
export type HistoricalCorrectiveWorkflowGroup = {
  title: string;
  description: string;
  links: Array<{ href: string; label: string }>;
};

export const HISTORICAL_CORRECTIVE_WORKFLOW_GROUPS: HistoricalCorrectiveWorkflowGroup[] = [
  {
    title: "Original corrective cycle",
    description: "Initial reconciliation exception, corrective delivery, closure and reopen governance.",
    links: [
      { href: "/approved-data/reconciliation/triage", label: "Exception triage" },
      { href: "/approved-data/reconciliation/corrective-delivery", label: "Corrective delivery execution" },
      { href: "/approved-data/reconciliation/corrective-closure", label: "Corrective reconciliation & closure" },
      { href: "/approved-data/reconciliation/post-closure-regression", label: "Post-closure regression & reopen governance" }
    ]
  },
  {
    title: "Successor and recurrent generations",
    description: "Earlier generation-specific successor, recurrent and next-generation workflows retained for evidence review.",
    links: [
      { href: "/approved-data/reconciliation/reopened-planning", label: "Reopened exception planning" },
      { href: "/approved-data/reconciliation/successor-delivery", label: "Successor corrective delivery" },
      { href: "/approved-data/reconciliation/successor-closure", label: "Successor reconciliation & re-closure" },
      { href: "/approved-data/reconciliation/post-reclosure-regression", label: "Post re-closure recurrence monitoring" },
      { href: "/approved-data/reconciliation/recurrent-planning", label: "Recurrent exception planning" },
      { href: "/approved-data/reconciliation/next-generation-delivery", label: "Next-generation delivery" },
      { href: "/approved-data/reconciliation/next-generation-closure", label: "Next-generation closure" },
      { href: "/approved-data/reconciliation/post-next-generation-reclosure", label: "Post-next-generation monitoring" },
      { href: "/approved-data/reconciliation/second-recurrence-planning", label: "Second recurrence planning" }
    ]
  },
  {
    title: "Successor through continuation generations",
    description: "Generation-specific execution paths that predate the unified corrective-generation engine.",
    links: [
      { href: "/approved-data/reconciliation/successor-generation-delivery", label: "Successor-generation delivery" },
      { href: "/approved-data/reconciliation/successor-generation-closure", label: "Successor-generation closure" },
      { href: "/approved-data/reconciliation/post-successor-generation-reclosure", label: "Post-successor-generation monitoring" },
      { href: "/approved-data/reconciliation/successor-generation-recurrence-planning", label: "Successor-generation recurrence planning" },
      { href: "/approved-data/reconciliation/subsequent-generation-delivery", label: "Subsequent-generation delivery" },
      { href: "/approved-data/reconciliation/subsequent-generation-closure", label: "Subsequent-generation closure" },
      { href: "/approved-data/reconciliation/post-subsequent-generation-reclosure", label: "Post-subsequent-generation monitoring" },
      { href: "/approved-data/reconciliation/subsequent-generation-recurrence-planning", label: "Subsequent-generation recurrence planning" },
      { href: "/approved-data/reconciliation/successive-generation-delivery", label: "Successive-generation delivery" },
      { href: "/approved-data/reconciliation/successive-generation-closure", label: "Successive-generation closure" },
      { href: "/approved-data/reconciliation/post-successive-generation-reclosure", label: "Post-successive-generation monitoring" },
      { href: "/approved-data/reconciliation/successive-generation-recurrence-planning", label: "Successive-generation recurrence planning" },
      { href: "/approved-data/reconciliation/continuation-generation-delivery", label: "Continuation-generation delivery" },
      { href: "/approved-data/reconciliation/continuation-generation-closure", label: "Continuation-generation closure" },
      { href: "/approved-data/reconciliation/post-continuation-generation-reclosure", label: "Post-continuation-generation monitoring" },
      { href: "/approved-data/reconciliation/continuation-generation-recurrence-planning", label: "Continuation-generation recurrence planning" }
    ]
  },
  {
    title: "Cycle-based continuation workflows",
    description: "Historical cycle-specific workflows retained for traceability and diagnostic access.",
    links: [
      { href: "/approved-data/reconciliation/next-cycle-delivery", label: "Next-cycle delivery" },
      { href: "/approved-data/reconciliation/next-cycle-closure", label: "Next-cycle closure" },
      { href: "/approved-data/reconciliation/post-next-cycle-reclosure", label: "Post-next-cycle monitoring" },
      { href: "/approved-data/reconciliation/next-cycle-recurrence-planning", label: "Next-cycle recurrence planning" },
      { href: "/approved-data/reconciliation/following-cycle-delivery", label: "Following-cycle delivery" },
      { href: "/approved-data/reconciliation/following-cycle-closure", label: "Following-cycle closure" },
      { href: "/approved-data/reconciliation/post-following-cycle-reclosure", label: "Post-following-cycle monitoring" },
      { href: "/approved-data/reconciliation/following-cycle-recurrence-planning", label: "Following-cycle recurrence planning" },
      { href: "/approved-data/reconciliation/subsequent-cycle-delivery", label: "Subsequent-cycle delivery" },
      { href: "/approved-data/reconciliation/subsequent-cycle-closure", label: "Subsequent-cycle closure" },
      { href: "/approved-data/reconciliation/post-subsequent-cycle-reclosure", label: "Post-subsequent-cycle monitoring" },
      { href: "/approved-data/reconciliation/subsequent-cycle-recurrence-planning", label: "Subsequent-cycle recurrence planning" },
      { href: "/approved-data/reconciliation/successive-cycle-delivery", label: "Successive-cycle delivery" },
      { href: "/approved-data/reconciliation/successive-cycle-closure", label: "Successive-cycle closure" },
      { href: "/approved-data/reconciliation/post-successive-cycle-reclosure", label: "Post-successive-cycle monitoring" },
      { href: "/approved-data/reconciliation/successive-cycle-recurrence-planning", label: "Successive-cycle recurrence planning" },
      { href: "/approved-data/reconciliation/continuation-cycle-delivery", label: "Continuation-cycle delivery" },
      { href: "/approved-data/reconciliation/continuation-cycle-closure", label: "Continuation-cycle closure" },
      { href: "/approved-data/reconciliation/post-continuation-cycle-reclosure", label: "Post-continuation-cycle monitoring" },
      { href: "/approved-data/reconciliation/continuation-cycle-recurrence-planning", label: "Continuation-cycle recurrence planning" }
    ]
  },
  {
    title: "Pre-unified corrective-generation workflows",
    description: "The final generation-specific workflows before the unified Build 109+ lineage and Build 115 state machine.",
    links: [
      { href: "/approved-data/reconciliation/next-corrective-generation-delivery", label: "Next corrective-generation delivery" },
      { href: "/approved-data/reconciliation/next-corrective-generation-closure", label: "Next corrective-generation closure" },
      { href: "/approved-data/reconciliation/post-next-corrective-generation-reclosure", label: "Post-next corrective-generation monitoring" },
      { href: "/approved-data/reconciliation/next-corrective-generation-recurrence-planning", label: "Next corrective-generation recurrence planning" },
      { href: "/approved-data/reconciliation/following-corrective-generation-delivery", label: "Following corrective-generation delivery" },
      { href: "/approved-data/reconciliation/following-corrective-generation-closure", label: "Following corrective-generation closure" },
      { href: "/approved-data/reconciliation/post-following-corrective-generation-reclosure", label: "Post-following corrective-generation monitoring" }
    ]
  },
  {
    title: "Lineage and compatibility evidence",
    description: "Current historical evidence tools that explain how older generations map into the unified model.",
    links: [
      { href: "/approved-data/reconciliation/corrective-generation-lineage", label: "Corrective-generation lineage registry" },
      { href: "/approved-data/reconciliation/legacy-corrective-generation-compatibility", label: "Legacy compatibility bridge" }
    ]
  }
];

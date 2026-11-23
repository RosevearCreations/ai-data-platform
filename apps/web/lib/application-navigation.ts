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
        href: "/master-suite",
        label: "Unified Master Suite",
        description: "Open Build 388 three-module Master instrument console and governed cross-shell navigation.",
        helpTopic: "command-center"
      },
      {
        href: "/acceptance-advancement",
        label: "Seven-App Acceptance & Advancement",
        description: "Review Build 413 role/device, accessibility, performance and UX acceptance plus locked-denominator +10-point evidence advancement.",
        helpTopic: "command-center"
      },
      {
        href: "/acceleration-closure",
        label: "Acceleration Cycle Closure",
        description: "Review Build 414 completion closure, T1-T5 security re-certification, communications pilot evidence, physical-host receipts and roadmap renewal.",
        helpTopic: "command-center"
      },
      {
        href: "/evidence-freshness",
        label: "Live Evidence Freshness",
        description: "Review Build 415 freshness SLAs, evidence aging, expiry alerts and governed cross-application renewal requests.",
        helpTopic: "command-center"
      },
      {
        href: "/original-host-continuity",
        label: "Original-Host Continuity",
        description: "Review Build 416 Windows service identity, reboot witness, independent peer ACK, certificate re-enrollment and rollback evidence without host mutation.",
        helpTopic: "command-center"
      },
      {
        href: "/master-sysop",
        label: "Master Sysop Shell",
        description: "Open Build 341 outer-shell navigation, separate Sysop identity and fail-closed tenant context handoff.",
        helpTopic: "shell-overview"
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
        href: "/performance-baseline",
        label: "Performance Baseline",
        description: "Review Build 331 measured production baselines, SLO budgets and regressions.",
        helpTopic: "shell-overview"
      },
      {
        href: "/experience-telemetry",
        label: "Experience Telemetry",
        description: "Review Build 332 real-user loading, interaction and route-transition timing.",
        helpTopic: "shell-overview"
      },
      {
        href: "/route-performance",
        label: "Route Performance",
        description: "Review Build 333 Core Web Vitals, route-transition, hydration-ready and rendering diagnostics.",
        helpTopic: "shell-overview"
      },
      {
        href: "/performance-observatory",
        label: "Performance Observatory",
        description: "Review Build 334 API, database query, pool-pressure and dependency timing evidence.",
        helpTopic: "shell-overview"
      },
      {
        href: "/cross-application-interaction-trace",
        label: "Interaction Trace",
        description: "Trace cross-application correlation, dependency and failure-propagation evidence without inferring authority.",
        helpTopic: "connectors-overview"
      },
      {
        href: "/integration-health",
        label: "Integration Health",
        description: "Review connection state, measured latency, credential risk, webhook outcomes, event queues and degraded integration services.",
        helpTopic: "connectors-overview"
      },
      {
        href: "/autonomous-operations",
        label: "Autonomous Operations",
        description: "Control bounded monitoring and safe health recovery under owner policy while reviewing Build 330 Production Learning VII evidence.",
        helpTopic: "learning-overview"
      },
      {
        href: "/production-learning-vii",
        label: "Production Learning VII",
        description: "Close Builds 306–330 from measured module adoption, certification, lifecycle, autonomy, health and policy evidence without auto-numbering the next batch.",
        helpTopic: "learning-overview"
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
        description: "Catalog peer applications with stable identity, environment and tenant/workspace mappings plus safe capability discovery, secure transport selection and bounded offline synchronization.",
        helpTopic: "connectors-overview"
      },
      {
        href: "/module-installer",
        label: "Module Installer",
        description: "Prepare exact host enrollment, run a fail-closed install dry run and generate an owner-approved integration package without activating trust.",
        helpTopic: "connectors-overview"
      },
      {
        href: "/module-lifecycle",
        label: "Module Lifecycle",
        description: "Track owner-observed installed versions, stage compatibility-checked upgrades, preserve last-known-good versions and prepare rollback without automatic host mutation.",
        helpTopic: "connectors-overview"
      },
      {
        href: "/module-certification",
        label: "Module Certification",
        description: "Compare host/module compatibility, record cross-host telemetry and certify synthetic versus live evidence without inferring trust.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/data-contracts",
        label: "Cross-App Data Contracts",
        description: "Review reusable versioned customer, product, service, booking, job, staff, equipment, invoice, media, inventory and notification schemas.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/master-shell-contracts",
        label: "Master Shell Contract V1",
        description: "Review Build 335 exact source identities, correlation/causation semantics and the standard event envelope.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/master-shell-registry",
        label: "Master Shell Source Registry",
        description: "Review Build 336 exact six-source state, evidence freshness, expiry and fail-closed registry transitions.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/master-shell-ingestion",
        label: "Master Shell Source Ingestion",
        description: "Review Build 337 signed source-update normalization, provenance, replay suppression, freshness and registry projection eligibility.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/master-completion",
        label: "Master Completion",
        description: "Review Build 338 stable requirements, approved denominators and independent evidence-axis completion scoring.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/master-application-inventory",
        label: "Master Application Inventory",
        description: "Review Build 339 six-application modules, capability/version provenance, ownership evidence and readiness read models.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/master-shell-command-center",
        label: "Master Shell Command Center",
        description: "Review Build 340 unified Applications, I.T./Security, Management and Statistics evidence without inferred acceptance.",
        helpTopic: "command-center"
      },
      {
        href: "/module-health-intelligence",
        label: "Module Health Intelligence",
        description: "Review evidence-backed module health, stale signals, HOLDs, stuck candidates and blockers without mutating source state.",
        helpTopic: "connectors-overview"
      },
      {
        href: "/role-device-acceptance",
        label: "Role / Device Acceptance",
        description: "Review evidence-backed Customer, Worker and Admin acceptance across Mobile, Tablet and Desktop without inferring acceptance from tests or implementation.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/relationship-certification",
        label: "Relationship Certification",
        description: "Certify one-to-one, one-to-many, many-to-one and many-to-many integrations across contract, identity, replay, expiry, audience and tenant isolation evidence.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/master-security-certification",
        label: "Master Security Certification",
        description: "Certify source signing and trust, role authorization, consent, sensitive-data handling, audit evidence and fail-closed controls without inferring authority.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/source-onboarding-pilot",
        label: "Source Onboarding & Pilot",
        description: "Review six-source onboarding prerequisites and non-overlapping supervised pilot evidence while retaining HOLD for incomplete independent evidence.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/master-production-readiness",
        label: "Master Production Readiness",
        description: "Consolidate source onboarding, recovery, accessibility, safeguards, rollback and explicit owner acceptance without replacing source-specific gates.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/production-learning-viii",
        label: "Production Learning VIII",
        description: "Close the 331–350 Master Shell batch from current Build 349 acceptance evidence and produce only unnumbered renewal candidates pending separate owner authorization.",
        helpTopic: "learning-overview"
      },
      {
        href: "/basic-controls",
        label: "Basic Controls",
        description: "Review Build 351 foundational control coverage, evidence gaps and current operational truth without treating historical preflight labels as automatic blockers.",
        helpTopic: "command-center"
      },
      {
        href: "/basic-operator-actions",
        label: "Basic Operator Actions",
        description: "Run Build 352 bounded refresh/recheck controls and prepare source-authoritative retry/recovery handoffs without silent peer writes.",
        helpTopic: "command-center"
      },
      {
        href: "/basic-alerts",
        label: "Basic Alerts",
        description: "Review Build 353 basic thresholds, ownership, escalation, resolution state and Master Shell connection handoffs.",
        helpTopic: "command-center"
      },
      {
        href: "/cross-application-control-center",
        label: "Cross-Application Control Center",
        description: "Review Build 354 dependency-aware cross-application blockers, authority boundaries and bounded escalation/recovery handoffs.",
        helpTopic: "command-center"
      },
      {
        href: "/performance-optimization-control-plane",
        label: "Performance Optimization Control Plane",
        description: "Review Build 355 measured cache, query, rendering and dependency optimization candidates with approval, validation and rollback boundaries.",
        helpTopic: "command-center"
      },
      {
        href: "/capacity-workload-forecasting",
        label: "Capacity & Demand Forecasting",
        description: "Review Build 356 measured workload demand scenarios, pressure, unknown headroom and supervised capacity guidance.",
        helpTopic: "command-center"
      },
      {
        href: "/performance-capacity-guardrails",
        label: "Performance, Capacity & Vercel Guardrails",
        description: "Review Build 419 seven-application performance budgets, capacity evidence and owner-defined Vercel deployment-usage guardrails.",
        helpTopic: "command-center"
      },
      {
        href: "/accessibility-device-network-recertification",
        label: "Accessibility, Device & Network Re-Certification",
        description: "Review Build 420 fresh desktop/tablet/mobile, accessibility, loading, offline/degraded-network and recovery evidence across all seven applications.",
        helpTopic: "command-center"
      },
      {
        href: "/tenant-consent-capability-renewal",
        label: "Tenant, Consent & Capability Renewal",
        description: "Review Build 421 least-privilege, tenant/workspace isolation, consent expiry/revocation and delegated-capability renewal evidence across all seven applications.",
        helpTopic: "command-center"
      },
      {
        href: "/data-lifecycle-dlp-renewal",
        label: "Data Lifecycle & DLP Renewal",
        description: "Review Build 422 classification, encryption, redaction/minimization, retention, deletion evidence and directional DLP renewal across all seven applications.",
        helpTopic: "command-center"
      },
      {
        href: "/operator-production-ceremony",
        label: "Operator Acceptance & Production Ceremony",
        description: "Review Build 423 role acceptance, separated production authority, workflow ceremony receipts and seven-source signed Sysop telemetry.",
        helpTopic: "command-center"
      },
      {
        href: "/operational-maturity-closure",
        label: "Operational Maturity Closure",
        description: "Review Build 424 maturity closure, security renewal, relationship assurance, remaining HOLD evidence and the next owner-gated roadmap ceremony.",
        helpTopic: "command-center"
      },
      {
        href: "/live-operational-evidence",
        label: "Live Operational Evidence",
        description: "Review Build 425 seven-source enrollment, signed telemetry acceptance, aggregate statistics and Sysop/reboot evidence without inferring live connection from Production GREEN.",
        helpTopic: "command-center"
      },
      {
        href: "/live-runtime-operations",
        label: "Live Runtime Operations",
        description: "Read current production runtime/database/performance facts and run bounded seven-source transport/telemetry probes with first statistical rollups.",
        helpTopic: "command-center"
      },
      {
        href: "/master-health",
        label: "Master Health",
        description: "Review Build 427 credential enrollment, fresh signed telemetry activation and continuous seven-source health rollups.",
        helpTopic: "command-center"
      },
      {
        href: "/source-signer-activation",
        label: "Source Signer Activation",
        description: "Review Build 428 source-side signer custody, exact credential pairing, genuine signed first-heartbeat acceptance and remaining provider/original-host holds.",
        helpTopic: "command-center"
      },
      {
        href: "/seven-source-health",
        label: "Seven-Source Continuous Health",
        description: "Review Build 429 receipt-bound sweep correlation, seven-source catalog/dependencies, metric definitions, verified coverage and explicit provider/original-host HOLDs.",
        helpTopic: "command-center"
      },
      {
        href: "/sweep-challenge-reliability",
        label: "Signed Sweep Challenge & Reliability",
        description: "Review Build 430 source-signed protocol v1.2 challenges, overlapping-sweep isolation, YW/iCamp reliability history and measured hosted cadence.",
        helpTopic: "command-center"
      },
      {
        href: "/genuine-signer-expansion",
        label: "Genuine Signer Expansion",
        description: "Review Build 431 cross-provider protocol v1.2 signer evidence, AIDP self-signer activation and explicit Cloudflare/original-host authority holds.",
        helpTopic: "command-center"
      },
      {
        href: "/seven-source-telemetry-closure",
        label: "Seven-Source Telemetry Closure",
        description: "Review Build 432 strict 7/7 protocol v1.2 signed production evidence, Cloudflare provider signers and the original-Windows AI Hub relay receipt.",
        helpTopic: "command-center"
      },
      {
        href: "/continuous-production-assurance",
        label: "Continuous Production Assurance",
        description: "Review Build 433 freshness expiry, seven-of-seven history, consecutive GREEN observations and observed HOLD-to-GREEN recoveries.",
        helpTopic: "command-center"
      },
      {
        href: "/cross-app-revision-convergence",
        label: "Cross-App Revision Convergence",
        description: "Review Build 434 source-aware peer revision evolution, signed revision changes and AIDP branch-divergence separation.",
        helpTopic: "command-center"
      },
      {
        href: "/peer-release-ledger",
        label: "Signed Peer Release Ledger",
        description: "Review Build 435 durable verified peer revision history, evidence-backed build labels, predecessor linkage and continuity holds.",
        helpTopic: "command-center"
      },
      {
        href: "/branch-reconciliation",
        label: "Branch Reconciliation Intelligence",
        description: "Review Build 436 AIDP dev/main ancestry classification, safe merge-custody planning and non-destructive reconciliation rules.",
        helpTopic: "command-center"
      },
      {
        href: "/contract-compatibility",
        label: "Contract Compatibility Matrix",
        description: "Review Build 437 peer release contract compatibility, signed-observation gaps and forecasted change impact.",
        helpTopic: "command-center"
      },
      {
        href: "/incident-runbook-recovery",
        label: "Incident Runbooks & Recovery",
        description: "Review Build 357 incident classification, evidence-aware runbooks, Comms escalation preparation and supervised source recovery handoffs.",
        helpTopic: "command-center"
      },
      {
        href: "/recovery-rollback-certification",
        label: "Recovery & Rollback Certification",
        description: "Review Build 418 supervised recovery exercise coverage, rollback readiness and independently witnessed cross-application recovery evidence.",
        helpTopic: "command-center"
      },
      {
        href: "/anomaly-predictive-risk",
        label: "Anomaly & Predictive Risk",
        description: "Review Build 358 robust behaviour baselines, anomaly detection and advisory predictive-risk intelligence without autonomous source or recovery authority.",
        helpTopic: "command-center"
      },
      {
        href: "/adaptive-master-control",
        label: "Adaptive Master Control",
        description: "Review Build 359 coordinated Master planes, uptime evidence, dynamic thresholds and server-first automation placement.",
        helpTopic: "command-center"
      },
      {
        href: "/master-control-readiness-certification",
        label: "Master Control Certification",
        description: "Review Build 360 three-Master activation, supervised self-healing boundaries and the gate before larger source onboarding.",
        helpTopic: "command-center"
      },
      {
        href: "/master-activation-reconciliation",
        label: "Master Activation Reconciliation",
        description: "Review Build 361 Comms/AI Hub ACK evidence, runtime HOLD closure and the Yard Workers/iCamp source-onboarding gate.",
        helpTopic: "command-center"
      },
      {
        href: "/source-shell-onboarding",
        label: "YW & iCamp Source Shells",
        description: "Review Build 362 platform-shell identity binding, source revision/signer health projection and supervised Master acceptance gates.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/source-convergence",
        label: "YW & iCamp Source Convergence",
        description: "Review Build 363 source revision convergence, independent signer readiness, verified health intake and supervised acceptance closure.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/convergence-receipt-intake",
        label: "YW & iCamp Receipt Intake",
        description: "Review Build 364 convergence receipts, trusted signer verification, health correlation and the owner acceptance decision queue.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/source-trust-ledger",
        label: "Source Trust & Receipt Ledger",
        description: "Review Build 365 trusted signer enrollment, durable source receipts, replay/aging evidence and owner decision audit history.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/source-signer-enrollment",
        label: "Source Signer Enrollment",
        description: "Review Build 366 independent public-key pin intake, custody challenge verification, signed-health admission and owner-review preparation.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/source-owner-review",
        label: "Source Owner Review & Acceptance",
        description: "Review Build 367 current source signer/health evidence, AI Hub 307 + Comms QL-415 Master gate, owner packets and explicit acceptance decisions.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/master-runtime-source-refresh",
        label: "Master Runtime & Source Refresh",
        description: "Review Build 368 AI Hub 308 + Comms QL-416 runtime closure, current YW/iCamp revisions, receipt refresh handoffs and supervised acceptance rechecks.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/source-refresh-evidence",
        label: "Source Refresh Evidence & Acceptance Recheck",
        description: "Review Build 369 YW560/iCamp244 refresh evidence, deployed manifest confirmation, fresh signed-health correlation and the three-Master acceptance recheck.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/manifest-custody-receipt-decision",
        label: "Manifest, Custody & Receipt Decision",
        description: "Review Build 370 independent live manifest observation, product-shell identity, source signer custody correlation, fresh receipt closure and the AI Hub 309 / Comms QL-417 runtime decision recheck.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/yw-product-shell-resolution",
        label: "YW Product-Shell Resolution",
        description: "Review Build 371 YW371 production identity reconciliation, independent signer/custody closure, fresh signed HEALTHY admission and the AI Hub 309 / Comms QL-417 runtime discrepancy recheck.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/yw561-signer-receipt-replay-closure",
        label: "YW561 Signer, Receipt & Replay Closure",
        description: "Review Build 372 exact YW561 production identity, source-health signer custody evidence intake, current signed HEALTHY admission, durable replay correlation and the three-Master runtime closure recheck.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/yw561-live-signer-owner-recheck",
        label: "YW561 Live Signer & Owner Recheck",
        description: "Review Build 373 live source-health signer correlation, exact signed HEALTHY receipt closure, durable replay acceptance and the three-Master owner decision recheck.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/yw561-trusted-source-health-activation",
        label: "YW561 Trusted Source-Health Activation",
        description: "Review Build 374 trusted source-health signer admission, current receipt/replay activation, three-Master runtime correlation and the explicit owner acceptance gate.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/yw561-owner-decision-runtime-connection",
        label: "YW561 Owner Decision & Connection",
        description: "Review Build 375 exact-receipt owner decision execution, acceptance continuity, three-Master runtime transitions and connection-state reconciliation.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/yw561-independent-connection-sync",
        label: "YW561 Independent Connection & Sync",
        description: "Review Build 376 independent connection evidence intake, verified CONNECTED transition, exact-receipt acceptance continuity and three-Master synchronization closure.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/yw562-live-connection-continuity",
        label: "YW562 Live Connection & Continuity",
        description: "Review Build 377 YW561-to-YW562 exact-receipt revalidation, trusted connection intake execution, explicit three-Master sync activation and fail-closed continuity monitoring.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/yw562-runtime-ql422-readiness",
        label: "YW562 Runtime & QL-422 Readiness",
        description: "Review Build 378 source-signed YW562 runtime prerequisites, fresh source receipt admission, QL-422 original-host/three-Master correlation and protected activation readiness.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/yw562-protected-activation",
        label: "YW562 Protected Activation Decision",
        description: "Review Build 379 protected runtime admission, exact receipt/owner continuity, QL-422 protected closure and supervised activation authorization.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/yw562-runtime-activation-closure",
        label: "YW562 Runtime Activation & Closure",
        description: "Review Build 380 protected receiver activation, verified CONNECTED transition and three-Master synchronization closure.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/yw562-receiver-health-continuity",
        label: "YW562 Receiver Health Continuity",
        description: "Review Build 381 protected receiver-health renewal, automatic fail-closed rollback and three-Master CONNECTED revalidation.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/comms-complementary-plane",
        label: "Comms Complementary Plane",
        description: "Review Build 342 read-only Comms incident, source-impact and evidence-aware follow-up projections without message or task authority.",
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
        description: "Review connector capabilities, grants, workspace use and the connector driver registry without activating connections.",
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
        description: "Configure signed, replay-safe inbound endpoints and use the inbound endpoint module for callback routing, receipt search and durable revoke evidence.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/event-bus",
        label: "Cross-App Event Bus",
        description: "Manage governed subscriptions, held routes and the reusable host/module event bridge with exact event contracts.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/workflow-automation",
        label: "Workflow Automation",
        description: "Author reviewed rules, inspect held intents and use the workflow action plug-in for typed, reviewed host handoffs.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/integration-suggestions",
        label: "Integration Suggestions",
        description: "Review bounded AI-assisted mapping and workflow suggestions without automatic activation.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/integration-certification",
        label: "Integration Certification",
        description: "Certify six-app authentication, approved exchange, event handling, recovery and tenant-isolation evidence.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/event-recovery",
        label: "Event Recovery Console",
        description: "Review dead-letter failures, bounded replay requests and durable held recovery routes.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/communications-delivery-operations",
        label: "Communications Delivery Operations",
        description: "Review Build 417 delivery SLA, signed ACK latency, duplicate suppression, replay quality and dead-letter recovery evidence.",
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
        description: "Register deduplicated media references, review held packages and use the media host bridge for preview, transfer and lifecycle contracts.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/notification-consent",
        label: "Notification & Consent",
        description: "Record consent evidence and prepare held notifications through the shared coordination module with governed Comms Hub routing.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/shared-task-exchange",
        label: "Shared Tasks & Work Queue",
        description: "Create tasks and follow-ups through the shared coordination module and review held work-queue exchange packages.",
        helpTopic: "integration-delivery"
      },
      {
        href: "/shared-scheduling",
        label: "Shared Scheduling & Calendar",
        description: "Prepare appointments through the shared coordination module with held calendar packages and local overlap evidence.",
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
        description: "Review measured production outcomes, Production Learning VI evidence gaps and owner-authorized roadmap renewal candidates.",
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

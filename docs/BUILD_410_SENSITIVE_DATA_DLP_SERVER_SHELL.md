# AI Data Platform Build 410

**Sensitive Data Classification, Encryption, Redaction, Retention & Data-Loss Prevention Assurance**

Build 410 also establishes the next architecture boundary for the three Master applications: **AI Data Platform becomes the Rosevear Server Shell**, while AI Data Platform, Rosevear AI Hub and Rosevear Comms Hub become three clear modules inside that shell.

## Sensitive-data assurance

Five data classes are governed across all seven applications:
- D0_PUBLIC
- D1_INTERNAL
- D2_PERSONAL
- D3_CONFIDENTIAL
- D4_SECRET

Sensitive classes require transport protection, at-rest protection, redaction, export inspection, purpose-bound retention and deletion evidence. D4 secrets additionally require field-level protection. Raw secrets may not enter logs, audit evidence or cross-application messages.

Every application requires:
- a classification policy for all five classes;
- encryption assurance;
- structured log redaction;
- token/password/key redaction;
- personal-data audit minimization;
- purpose-bound retention and expiry/deletion workflow;
- export DLP inspection;
- owner-gated restricted export;
- raw-secret exfiltration prevention;
- cross-tenant export prevention.

## Rosevear Server Shell

The outer shell is **AI Data Platform / Rosevear Server Shell**.

It contains three modules:
1. **Data & Intelligence — AI Data Platform**
2. **AI, Home & Automation — Rosevear AI Hub**
3. **Communications & Operations — Rosevear Comms Hub**

Each module is independently disableable. The module switch is owner-controlled, a disabled module fails closed, and disabling one module must not take down the outer Server Shell or unrelated modules.

Build 410 establishes the module-state contract. The privileged owner switch itself is intentionally handed to Build 411, where module enable/disable belongs with privileged operations, break-glass custody and immutable audit evidence.

## 24/7 Windows server role

The existing Windows PC that runs Rosevear AI Hub becomes the **primary automation host role** for server-side 24/7 workloads.

That means:
- Home Assistant, MQTT, camera, local AI/Ollama and deterministic automation remain owned by the AI Hub module;
- future Comms Hub and AI Data Platform background workers can be hosted on that same server when locally enrolled;
- cloud/Vercel UI deployments may remain independently deployable;
- Production GREEN does not prove that the physical Windows server has updated or restarted;
- local service activation remains separately evidenced and fail-closed.

This preserves the AI Hub rule that important automations do not depend on an LLM or public Internet connection.

## Module themes

Three certified theme profiles are introduced:
- **Night Ops**
- **Copper Workshop**
- **Meadow Grid**

Each module can select its own color treatment and background-image slot while retaining one common Server Shell navigation language. Theme changes cannot hide or redefine security/health status colors.

## Futuristic YW and iCamp monitoring

The Server Shell receives read-only monitoring profiles for both governed slave shells:
- deployment state;
- runtime health;
- source revision;
- signer/receiver health;
- queue and dead-letter state;
- latency/error state;
- migration health;
- security holds;
- Vercel quota state.

Missing evidence renders UNKNOWN/HOLD rather than fabricating a healthy state. Monitoring alone never grants YW or iCamp operational authority.

## Home automation boundary

Home automation remains inside the AI Hub module, using the existing safe-control architecture:
- Home Assistant;
- MQTT;
- cameras;
- local Ollama/AI;
- deterministic automation engine;
- explicit tool risk levels and owner confirmation for higher-risk actions.

Hazardous workshop, life-safety and security actions remain outside autonomous control.

## Final governance state

SENSITIVE_DATA_DLP_AND_SERVER_SHELL_CONVERGENCE_ASSURED

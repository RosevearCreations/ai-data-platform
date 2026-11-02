import Link from "next/link";

import { buildHardeningAudit } from "@/lib/hardening-audit";

export const dynamic = "force-dynamic";

export default function HardeningPage() {
  const audit = buildHardeningAudit();
  const hardened = audit.items.filter((item) => item.status === "hardened").length;

  return (
    <main className="shell reviewShell opsDeepScreen opsDeepScreen--management">
      <section className="hero reviewHero">
        <p className="eyebrow">Build 271</p>
        <h1>Accessibility, Mobile, Performance &amp; Failure-Recovery Hardening</h1>
        <p className="lead">
          Application-wide hardening for keyboard and screen-reader use, narrow layouts,
          reduced motion, forced colors, loading and error recovery, and bounded performance.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/system-reliability">System Reliability</Link>
          <Link className="secondaryButton" href="/production-learning">Production Learning</Link>
          <Link className="secondaryButton" href="/help">Help Centre</Link>
        </div>
      </section>

      <section className="reviewSummary" aria-label="Build 271 hardening summary">
        <div className="commandMetrics">
          <article><strong>{hardened}/{audit.items.length}</strong><span>hardening checks covered</span></article>
          <article><strong>{audit.budgets.narrowViewportPx}px</strong><span>narrow viewport audit floor</span></article>
          <article><strong>{audit.budgets.tapTargetPx}px</strong><span>mobile interaction target</span></article>
          <article><strong>0</strong><span>new runtime dependencies</span></article>
        </div>
      </section>

      <section className="dataQualityPolicyNote">
        <strong>Failure-recovery rule</strong>
        <p>
          Loading, empty and failure states must explain what happened and provide a safe next action.
          Missing evidence is never treated as a successful zero result, and retry never bypasses authorization.
        </p>
      </section>

      {(["Accessibility", "Mobile", "Performance", "Recovery"] as const).map((area) => (
        <section className="reviewQueue" key={area} aria-labelledby={"hardening-" + area.toLowerCase()}>
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">Audit area</p>
              <h2 id={"hardening-" + area.toLowerCase()}>{area}</h2>
            </div>
          </div>
          <div className="reviewBatchList">
            {audit.items.filter((item) => item.area === area).map((item) => (
              <article className="reviewBatchSummary hardeningAuditCard" key={item.key}>
                <div>
                  <span className="reviewStatus reviewStatus-approved">{item.status}</span>
                  <h3>{item.label}</h3>
                  <p>{item.detail}</p>
                  <p><strong>Evidence:</strong> {item.evidence}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

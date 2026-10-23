import Link from "next/link";

import { HelpInfo } from "@/app/help/HelpInfo";
import { SurfaceCard } from "@/app/ui/SurfaceCard";
import { DEFAULT_UI_THEME, UI_THEMES } from "@/lib/ui-theme";

const statuses = [
  ["neutral", "Neutral", "General information and ordinary workflow content."],
  ["healthy", "Healthy", "Successful or healthy operational state."],
  ["attention", "Attention", "Needs review, pending action or a caution condition."],
  ["critical", "Critical", "Failure, blocking condition or serious invariant issue."],
  ["info", "Information", "Informational evidence or explanatory context."]
] as const;

export default function AppearancePage() {
  const theme = UI_THEMES.find((item) => item.id === DEFAULT_UI_THEME) ?? UI_THEMES[0];

  return (
    <main className="shell shellWide">
      <section className="hero compactHero">
        <HelpInfo topic="appearance-design-system" />
        <p className="eyebrow">Build 118</p>
        <h1>Appearance & Design System</h1>
        <p className="lead">
          Inspect the active visual foundation, reusable marble surfaces and operational
          status treatments. Build 118 establishes theme infrastructure; it does not yet
          store per-user theme preferences.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Command Center</Link>
          <Link className="secondaryButton" href="/workflows">Workflow directory</Link>
        </div>
      </section>

      <section className="designSystemSection">
        <div className="sectionHeading">
          <p className="eyebrow">Active theme</p>
          <h2>{theme.name}</h2>
          <HelpInfo topic="appearance-design-system" />
        </div>
        <SurfaceCard helpTopic="appearance-design-system" variant="raised" className="themeSpecimenHero">
          <span className="themeSpecimenBadge">Active · {theme.id}</span>
          <h3>{theme.name}</h3>
          <p>{theme.description}</p>
          <div className="themeSwatches" aria-label="Marble Standard theme tokens">
            <span className="themeSwatch themeSwatchStone">Stone</span>
            <span className="themeSwatch themeSwatchVein">Vein</span>
            <span className="themeSwatch themeSwatchAccent">Accent</span>
            <span className="themeSwatch themeSwatchText">Text</span>
          </div>
        </SurfaceCard>
      </section>

      <section className="designSystemSection">
        <div className="sectionHeading">
          <p className="eyebrow">Reusable surfaces</p>
          <h2>Card framework</h2>
          <HelpInfo topic="appearance-card-framework" />
        </div>
        <div className="designCardGrid">
          <SurfaceCard helpTopic="appearance-card-framework">
            <h3>Default marble card</h3>
            <p>Standard informational surface with subtle veining and a readable dark overlay.</p>
          </SurfaceCard>
          <SurfaceCard helpTopic="appearance-card-framework" variant="raised">
            <h3>Raised card</h3>
            <p>Higher visual priority for modules, summaries and primary grouped content.</p>
          </SurfaceCard>
          <SurfaceCard helpTopic="appearance-card-framework" variant="metric">
            <strong className="designMetric">128</strong>
            <span>Metric card</span>
            <p>Compact quantitative surface that preserves the same marble language.</p>
          </SurfaceCard>
          <SurfaceCard helpTopic="appearance-card-framework" variant="inset">
            <h3>Inset card</h3>
            <p>Lower-emphasis surface for nested details and secondary evidence.</p>
          </SurfaceCard>
        </div>
      </section>

      <section className="designSystemSection">
        <div className="sectionHeading">
          <p className="eyebrow">Operational semantics</p>
          <h2>Status treatments</h2>
          <HelpInfo topic="appearance-status-system" />
        </div>
        <div className="designStatusGrid">
          {statuses.map(([status, label, description]) => (
            <SurfaceCard
              helpTopic="appearance-status-system"
              status={status}
              variant="interactive"
              key={status}
            >
              <span className={"uiStatusPill uiStatusPill--" + status}>{label}</span>
              <p>{description}</p>
            </SurfaceCard>
          ))}
        </div>
      </section>

      <section className="designSystemSection">
        <div className="sectionHeading">
          <p className="eyebrow">Controls</p>
          <h2>Buttons, badges & focus</h2>
          <HelpInfo topic="appearance-accessibility" />
        </div>
        <SurfaceCard helpTopic="appearance-accessibility" variant="raised">
          <div className="designControlRow">
            <button type="button" className="primary">Primary action</button>
            <button type="button" className="secondaryButton">Secondary action</button>
            <span className="badge">Standard badge</span>
            <span className="uiStatusPill uiStatusPill--attention">Attention</span>
          </div>
          <p className="muted">
            Operational status colors retain semantic meaning above decorative marble.
            Keyboard focus, contrast and readable text always take priority over the theme.
          </p>
        </SurfaceCard>
      </section>
    </main>
  );
}

import Link from "next/link";

import { HelpInfo } from "./HelpInfo";
import { HELP_GROUPS, HELP_TOPICS } from "./help-content";

export default function HelpPage() {
  return (
    <main className="shell">
      <section className="hero">
        <HelpInfo topic="help-index" />
        <p className="eyebrow">Help</p>
        <h1>AI Data Platform help center</h1>
        <p className="lead">
          Detailed operating guidance for every major website section, including
          explicit manual-intervention steps wherever an external service or
          environment variable is required.
        </p>
        <div className="heroActions">
          <Link className="secondaryButton" href="/">Back to platform</Link>
        </div>
      </section>

      {HELP_GROUPS.map((group) => (
        <section key={group.title}>
          <div className="sectionHeading">
            <p className="eyebrow">Help topics</p>
            <h2>{group.title}</h2>
          </div>
          <div className="grid">
            {group.topics.map((topic) => (
              <article className="card helpCard" key={topic}>
                <h3>{HELP_TOPICS[topic].title}</h3>
                <p>{HELP_TOPICS[topic].summary}</p>
                <HelpInfo topic={topic} inline />
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

const workspaces = [
  {
    name: "Rosie Dazzlers",
    purpose: "Ontario detailing intelligence, pricing history and SEO evidence."
  },
  {
    name: "Devil n Dove",
    purpose: "Supplier, product, tool and inventory intelligence."
  },
  {
    name: "Personal",
    purpose: "Movie metadata enrichment and approved private datasets."
  }
] as const;

const foundations = [
  "Source evidence on every external observation",
  "Review before downstream business writes",
  "Local-first browser extraction",
  "AI for interpretation; deterministic code for repetition"
] as const;

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Build 001</p>
        <h1>AI Data Platform</h1>
        <p className="lead">
          Shared extraction and intelligence infrastructure for Rosie Dazzlers,
          Devil n Dove and approved personal datasets.
        </p>
        <div className="status" role="status">
          <span className="statusDot" aria-hidden="true" />
          Foundation shell online
        </div>
      </section>

      <section aria-labelledby="workspace-heading">
        <div className="sectionHeading">
          <p className="eyebrow">Workspaces</p>
          <h2 id="workspace-heading">One engine, isolated contexts</h2>
        </div>
        <div className="grid">
          {workspaces.map((workspace) => (
            <article className="card" key={workspace.name}>
              <h3>{workspace.name}</h3>
              <p>{workspace.purpose}</p>
              <span className="badge">Planned in Build 002+</span>
            </article>
          ))}
        </div>
      </section>

      <section className="principles" aria-labelledby="principles-heading">
        <div>
          <p className="eyebrow">Guardrails</p>
          <h2 id="principles-heading">Designed for traceable data</h2>
        </div>
        <ul>
          {foundations.map((foundation) => (
            <li key={foundation}>{foundation}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

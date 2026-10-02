const steps = [
  "Inspect current page",
  "Suggest fields",
  "Preview records",
  "Review before saving"
] as const;

export function App() {
  return (
    <main className="panel">
      <header className="header">
        <div>
          <p className="eyebrow">AI Data Platform</p>
          <h1>Page companion</h1>
        </div>
        <span className="build">001</span>
      </header>

      <section className="notice" aria-label="Build status">
        <strong>Extension shell ready</strong>
        <p>
          Page inspection begins in Build 003. This build intentionally requests
          no page-access permissions.
        </p>
      </section>

      <section>
        <p className="eyebrow">Workflow</p>
        <ol className="steps">
          {steps.map((step, index) => (
            <li key={step}>
              <span>{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="workspace">
        <label htmlFor="workspace">Workspace</label>
        <select id="workspace" defaultValue="rosiedazzlers" disabled>
          <option value="rosiedazzlers">Rosie Dazzlers</option>
          <option value="devilndove">Devil n Dove</option>
          <option value="personal">Personal</option>
        </select>
        <small>Workspace persistence and authentication arrive in Build 002.</small>
      </section>

      <button className="primary" type="button" disabled>
        Analyze current page
      </button>
    </main>
  );
}

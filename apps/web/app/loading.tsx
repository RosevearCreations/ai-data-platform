export default function Loading() {
  return (
    <main className="shell operationalStateShell" role="status" aria-live="polite" aria-busy="true">
      <section className="operationalStateCard">
        <p className="eyebrow">Loading</p>
        <h1>Preparing the current workspace</h1>
        <p>We are loading the requested application evidence. Existing controls remain unchanged.</p>
        <div className="operationalStateProgress" aria-hidden="true" />
      </section>
    </main>
  );
}

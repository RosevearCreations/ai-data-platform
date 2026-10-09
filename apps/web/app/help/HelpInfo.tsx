import { HELP_TOPICS, type HelpTopicKey } from "./help-content";

export function HelpInfo({
  topic,
  inline = false
}: {
  topic: HelpTopicKey;
  inline?: boolean;
}) {
  const help = HELP_TOPICS[topic];

  return (
    <details className={"helpInfo" + (inline ? " helpInfoInline" : "")}>
      <summary title={"Help: " + help.title}>
        <span aria-hidden="true">i</span>
        <span className="srOnly">Help for {help.title}</span>
      </summary>
      <div className="helpPopover">
        <strong>{help.title}</strong>
        <p>{help.summary}</p>
        <h4>How to use this section</h4>
        <ol>
          {help.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
        {help.notes.length ? (
          <>
            <h4>Important</h4>
            <ul>
              {help.notes.map((note) => <li key={note}>{note}</li>)}
            </ul>
          </>
        ) : null}
        {"manual" in help && help.manual?.length ? (
          <>
            <h4>Manual intervention</h4>
            <ol>
              {help.manual.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </>
        ) : null}
        <a className="textLink" href="/help">Open full help center</a>
      </div>
    </details>
  );
}

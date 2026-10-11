"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type WorkspaceOption = {
  id: string;
  name: string;
  role: "owner" | "admin" | "member";
};

type PolicyOption = {
  workspaceId: string;
  id: string;
  origin: string;
  collectionMethod: string;
  status: string;
  reviewExpiresAt: string;
};

type ScraperOption = {
  workspaceId: string;
  scraperId: string;
  name: string;
  kind: string;
  sourceOrigin: string;
};

type SourceRecord = {
  sourceId: string;
  displayName: string;
  sourceUrl: string;
  sourceOrigin: string;
  collectionMethod: string;
  sourcePolicyId: string;
  savedScraperId: string;
  cadence: string;
  status: string;
  notes: string;
  readiness: "ready" | "blocked" | "incomplete";
  blockers: string[];
};

type ProjectRecord = {
  workspaceId: string;
  workspaceName: string;
  workspaceProfile: string;
  role: "owner" | "admin" | "member";
  canManage: boolean;
  projectId: string;
  name: string;
  purpose: string;
  status: string;
  cadence: string;
  ownerLabel: string;
  notes: string;
  readiness: "ready" | "blocked" | "incomplete";
  sources: SourceRecord[];
};

type ManagerProps = {
  projects: ProjectRecord[];
  options: {
    workspaces: WorkspaceOption[];
    policies: PolicyOption[];
    scrapers: ScraperOption[];
  };
};

async function mutate(method: "POST" | "PATCH", body: Record<string, unknown>) {
  const response = await fetch("/api/collection-projects", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(payload.error || "Collection project request failed.");
}

function ProjectStatus({
  project,
  onUpdate
}: {
  project: ProjectRecord;
  onUpdate: (status: string) => void;
}) {
  if (!project.canManage || project.status === "archived") return null;
  return (
    <div className="collectionActions">
      {["planning", "active", "paused", "complete"].map((status) => (
        <button
          className={project.status === status ? "primary" : "secondaryButton"}
          type="button"
          key={status}
          disabled={project.status === status}
          onClick={() => onUpdate(status)}
        >
          {status}
        </button>
      ))}
    </div>
  );
}

export function CollectionProjectManager({ projects, options }: ManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const manageableWorkspaces = options.workspaces.filter(
    (workspace) => workspace.role === "owner" || workspace.role === "admin"
  );
  const [workspaceId, setWorkspaceId] = useState(manageableWorkspaces[0]?.id ?? "");
  const [projectName, setProjectName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [cadence, setCadence] = useState("");
  const [ownerLabel, setOwnerLabel] = useState("");

  const grouped = useMemo(() => {
    const map = new Map<string, ProjectRecord[]>();
    for (const project of projects) {
      const list = map.get(project.workspaceName) ?? [];
      list.push(project);
      map.set(project.workspaceName, list);
    }
    return [...map.entries()];
  }, [projects]);

  function run(task: () => Promise<void>) {
    setError("");
    startTransition(async () => {
      try {
        await task();
        router.refresh();
      } catch (value) {
        setError(value instanceof Error ? value.message : "Collection project request failed.");
      }
    });
  }

  function updateProjectStatus(project: ProjectRecord, status: string) {
    run(() =>
      mutate("PATCH", {
        action: "update-project",
        workspaceId: project.workspaceId,
        projectId: project.projectId,
        project: {
          name: project.name,
          purpose: project.purpose,
          status,
          cadence: project.cadence,
          ownerLabel: project.ownerLabel,
          notes: project.notes
        }
      })
    );
  }

  function updateSourceStatus(project: ProjectRecord, source: SourceRecord, status: string) {
    run(() =>
      mutate("PATCH", {
        action: "update-source",
        workspaceId: project.workspaceId,
        projectId: project.projectId,
        sourceId: source.sourceId,
        source: {
          displayName: source.displayName,
          sourceUrl: source.sourceUrl,
          collectionMethod: source.collectionMethod,
          sourcePolicyId: source.sourcePolicyId,
          savedScraperId: source.savedScraperId,
          cadence: source.cadence,
          status,
          notes: source.notes
        }
      })
    );
  }

  return (
    <div className="collectionManager">
      {error ? <div className="collectionError" role="alert">{error}</div> : null}

      <section className="collectionCreate" aria-labelledby="create-collection-project">
        <h2 id="create-collection-project">Create collection project</h2>
        {manageableWorkspaces.length ? (
          <form
            className="collectionProjectForm"
            onSubmit={(event) => {
              event.preventDefault();
              run(async () => {
                await mutate("POST", {
                  action: "create-project",
                  workspaceId,
                  project: {
                    name: projectName,
                    purpose,
                    cadence,
                    ownerLabel,
                    status: "planning",
                    notes: ""
                  }
                });
                setProjectName("");
                setPurpose("");
                setCadence("");
                setOwnerLabel("");
              });
            }}
          >
            <label>
              Workspace
              <select value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)}>
                {manageableWorkspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                ))}
              </select>
            </label>
            <label>
              Project name
              <input value={projectName} onChange={(event) => setProjectName(event.target.value)} required maxLength={120} />
            </label>
            <label className="collectionWide">
              Purpose
              <textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} maxLength={1000} />
            </label>
            <label>
              Cadence / collection rhythm
              <input value={cadence} onChange={(event) => setCadence(event.target.value)} placeholder="e.g. monthly review" maxLength={120} />
            </label>
            <label>
              Owner / responsible person
              <input value={ownerLabel} onChange={(event) => setOwnerLabel(event.target.value)} maxLength={120} />
            </label>
            <button className="primary" type="submit" disabled={pending}>Create project</button>
          </form>
        ) : (
          <p className="emptyState">Owner or admin access is required to create a collection project.</p>
        )}
      </section>

      {grouped.length ? grouped.map(([workspaceName, workspaceProjects]) => (
        <section className="collectionWorkspace" key={workspaceName}>
          <div className="sectionHeading">
            <p className="eyebrow">Workspace</p>
            <h2>{workspaceName}</h2>
          </div>
          <div className="collectionProjectList">
            {workspaceProjects.map((project) => {
              const policies = options.policies.filter((item) => item.workspaceId === project.workspaceId);
              const scrapers = options.scrapers.filter((item) => item.workspaceId === project.workspaceId);
              return (
                <article className="collectionProjectCard" key={project.projectId}>
                  <div className="collectionProjectHeader">
                    <div>
                      <span className="badge">{project.workspaceProfile} · {project.role}</span>
                      <h3>{project.name}</h3>
                      <p>{project.purpose || "No project purpose recorded."}</p>
                    </div>
                    <div className={"collectionReadiness collectionReadiness-" + project.readiness}>
                      {project.readiness}
                    </div>
                  </div>

                  <dl className="collectionProjectMeta">
                    <div><dt>Status</dt><dd>{project.status}</dd></div>
                    <div><dt>Cadence</dt><dd>{project.cadence || "Not set"}</dd></div>
                    <div><dt>Owner</dt><dd>{project.ownerLabel || "Not assigned"}</dd></div>
                    <div><dt>Sources</dt><dd>{project.sources.length}</dd></div>
                  </dl>

                  <ProjectStatus project={project} onUpdate={(status) => updateProjectStatus(project, status)} />

                  {project.canManage && project.status !== "archived" ? (
                    <details className="collectionEditPanel">
                      <summary>Edit project details</summary>
                      <ProjectEditForm
                        project={project}
                        pending={pending}
                        onSubmit={(updated) =>
                          run(() =>
                            mutate("PATCH", {
                              action: "update-project",
                              workspaceId: project.workspaceId,
                              projectId: project.projectId,
                              project: updated
                            })
                          )
                        }
                      />
                    </details>
                  ) : null}

                  <div className="collectionSourceList">
                    {project.sources.map((source) => (
                      <article className="collectionSourceCard" key={source.sourceId}>
                        <div className="collectionSourceHeader">
                          <div>
                            <strong>{source.displayName}</strong>
                            <span>{source.collectionMethod} · {source.status}</span>
                          </div>
                          <span className={"collectionReadiness collectionReadiness-" + source.readiness}>
                            {source.readiness}
                          </span>
                        </div>
                        <a className="textLink" href={source.sourceUrl} target="_blank" rel="noreferrer">
                          {source.sourceOrigin}
                        </a>
                        <p>
                          Source Policy: {source.sourcePolicyId || "not linked"} · Scraper/template: {source.savedScraperId || "not linked"}
                        </p>
                        {source.blockers.length ? (
                          <ul className="collectionBlockers">
                            {source.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                          </ul>
                        ) : (
                          <span className="collectionReadyNote">Current governance/scraper evidence is ready.</span>
                        )}
                        {project.canManage && source.status !== "retired" ? (
                          <details className="collectionEditPanel">
                            <summary>Edit source linkage</summary>
                            <SourceEditForm
                              source={source}
                              policies={policies}
                              scrapers={scrapers}
                              pending={pending}
                              onSubmit={(updated) =>
                                run(() =>
                                  mutate("PATCH", {
                                    action: "update-source",
                                    workspaceId: project.workspaceId,
                                    projectId: project.projectId,
                                    sourceId: source.sourceId,
                                    source: updated
                                  })
                                )
                              }
                            />
                          </details>
                        ) : null}
                        {project.canManage && source.status !== "retired" ? (
                          <div className="collectionActions">
                            {["planned", "active", "paused"].map((status) => (
                              <button
                                type="button"
                                className={source.status === status ? "primary" : "secondaryButton"}
                                disabled={pending || source.status === status}
                                key={status}
                                onClick={() => updateSourceStatus(project, source, status)}
                              >
                                {status}
                              </button>
                            ))}
                            <button
                              type="button"
                              className="secondaryButton"
                              disabled={pending}
                              onClick={() => run(() => mutate("PATCH", {
                                action: "retire-source",
                                workspaceId: project.workspaceId,
                                projectId: project.projectId,
                                sourceId: source.sourceId
                              }))}
                            >
                              Retire
                            </button>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>

                  {project.canManage && project.status !== "archived" ? (
                    <details className="collectionAddSource">
                      <summary>Add source to this project</summary>
                      <SourceForm
                        project={project}
                        policies={policies}
                        scrapers={scrapers}
                        pending={pending}
                        onSubmit={(source) =>
                          run(() =>
                            mutate("POST", {
                              action: "create-source",
                              workspaceId: project.workspaceId,
                              projectId: project.projectId,
                              source
                            })
                          )
                        }
                      />
                    </details>
                  ) : null}

                  {project.canManage && project.status !== "archived" ? (
                    <button
                      className="textDangerButton"
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          mutate("PATCH", {
                            action: "archive-project",
                            workspaceId: project.workspaceId,
                            projectId: project.projectId
                          })
                        )
                      }
                    >
                      Archive project
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      )) : (
        <div className="emptyState">No collection projects have been created yet.</div>
      )}
    </div>
  );
}

function SourceForm({
  project,
  policies,
  scrapers,
  pending,
  onSubmit
}: {
  project: ProjectRecord;
  policies: PolicyOption[];
  scrapers: ScraperOption[];
  pending: boolean;
  onSubmit: (source: Record<string, unknown>) => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [collectionMethod, setCollectionMethod] = useState("public-webpage");
  const [sourcePolicyId, setSourcePolicyId] = useState("");
  const [savedScraperId, setSavedScraperId] = useState("");
  const [cadence, setCadence] = useState(project.cadence);
  const [notes, setNotes] = useState("");

  return (
    <form
      className="collectionSourceForm"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          displayName,
          sourceUrl,
          collectionMethod,
          sourcePolicyId,
          savedScraperId,
          cadence,
          status: "planned",
          notes
        });
        setDisplayName("");
        setSourceUrl("");
        setSourcePolicyId("");
        setSavedScraperId("");
        setNotes("");
      }}
    >
      <label>
        Source name
        <input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={120} />
      </label>
      <label className="collectionWide">
        Source URL
        <input required type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} maxLength={1000} />
      </label>
      <label>
        Collection method
        <select value={collectionMethod} onChange={(event) => setCollectionMethod(event.target.value)}>
          <option value="public-webpage">public webpage</option>
          <option value="official-api">official API</option>
          <option value="official-dataset">official dataset</option>
          <option value="user-export">user export</option>
        </select>
      </label>
      <label>
        Source Policy
        <select value={sourcePolicyId} onChange={(event) => setSourcePolicyId(event.target.value)}>
          <option value="">Not linked yet</option>
          {policies.map((policy) => (
            <option key={policy.id} value={policy.id}>
              {policy.origin} · {policy.status} · {policy.collectionMethod}
            </option>
          ))}
        </select>
      </label>
      <label>
        Saved scraper/template
        <select value={savedScraperId} onChange={(event) => setSavedScraperId(event.target.value)}>
          <option value="">Not linked / not required</option>
          {scrapers.map((scraper) => (
            <option key={scraper.scraperId} value={scraper.scraperId}>
              {scraper.name} · {scraper.kind}
            </option>
          ))}
        </select>
      </label>
      <label>
        Cadence
        <input value={cadence} onChange={(event) => setCadence(event.target.value)} maxLength={120} />
      </label>
      <label className="collectionWide">
        Notes
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} />
      </label>
      <button className="primary" type="submit" disabled={pending}>Add source</button>
    </form>
  );
}


function ProjectEditForm({
  project,
  pending,
  onSubmit
}: {
  project: ProjectRecord;
  pending: boolean;
  onSubmit: (project: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState(project.name);
  const [purpose, setPurpose] = useState(project.purpose);
  const [cadence, setCadence] = useState(project.cadence);
  const [ownerLabel, setOwnerLabel] = useState(project.ownerLabel);
  const [notes, setNotes] = useState(project.notes);
  return (
    <form
      className="collectionProjectForm collectionInlineForm"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          name,
          purpose,
          cadence,
          ownerLabel,
          notes,
          status: project.status
        });
      }}
    >
      <label>
        Project name
        <input required value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
      </label>
      <label>
        Owner / responsible person
        <input value={ownerLabel} onChange={(event) => setOwnerLabel(event.target.value)} maxLength={120} />
      </label>
      <label className="collectionWide">
        Purpose
        <textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} maxLength={1000} />
      </label>
      <label>
        Cadence
        <input value={cadence} onChange={(event) => setCadence(event.target.value)} maxLength={120} />
      </label>
      <label className="collectionWide">
        Notes
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} />
      </label>
      <button className="primary" type="submit" disabled={pending}>Save project details</button>
    </form>
  );
}

function SourceEditForm({
  source,
  policies,
  scrapers,
  pending,
  onSubmit
}: {
  source: SourceRecord;
  policies: PolicyOption[];
  scrapers: ScraperOption[];
  pending: boolean;
  onSubmit: (source: Record<string, unknown>) => void;
}) {
  const [displayName, setDisplayName] = useState(source.displayName);
  const [sourceUrl, setSourceUrl] = useState(source.sourceUrl);
  const [collectionMethod, setCollectionMethod] = useState(source.collectionMethod);
  const [sourcePolicyId, setSourcePolicyId] = useState(source.sourcePolicyId);
  const [savedScraperId, setSavedScraperId] = useState(source.savedScraperId);
  const [cadence, setCadence] = useState(source.cadence);
  const [notes, setNotes] = useState(source.notes);
  return (
    <form
      className="collectionSourceForm collectionInlineForm"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          displayName,
          sourceUrl,
          collectionMethod,
          sourcePolicyId,
          savedScraperId,
          cadence,
          status: source.status,
          notes
        });
      }}
    >
      <label>
        Source name
        <input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={120} />
      </label>
      <label className="collectionWide">
        Source URL
        <input required type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} maxLength={1000} />
      </label>
      <label>
        Collection method
        <select value={collectionMethod} onChange={(event) => setCollectionMethod(event.target.value)}>
          <option value="public-webpage">public webpage</option>
          <option value="official-api">official API</option>
          <option value="official-dataset">official dataset</option>
          <option value="user-export">user export</option>
        </select>
      </label>
      <label>
        Source Policy
        <select value={sourcePolicyId} onChange={(event) => setSourcePolicyId(event.target.value)}>
          <option value="">Not linked yet</option>
          {policies.map((policy) => (
            <option key={policy.id} value={policy.id}>
              {policy.origin} · {policy.status} · {policy.collectionMethod}
            </option>
          ))}
        </select>
      </label>
      <label>
        Saved scraper/template
        <select value={savedScraperId} onChange={(event) => setSavedScraperId(event.target.value)}>
          <option value="">Not linked / not required</option>
          {scrapers.map((scraper) => (
            <option key={scraper.scraperId} value={scraper.scraperId}>
              {scraper.name} · {scraper.kind}
            </option>
          ))}
        </select>
      </label>
      <label>
        Cadence
        <input value={cadence} onChange={(event) => setCadence(event.target.value)} maxLength={120} />
      </label>
      <label className="collectionWide">
        Notes
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} />
      </label>
      <button className="primary" type="submit" disabled={pending}>Save source linkage</button>
    </form>
  );
}

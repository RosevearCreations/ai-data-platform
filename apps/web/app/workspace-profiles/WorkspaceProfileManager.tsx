"use client";

import { useMemo, useState } from "react";

import { HelpInfo } from "../help/HelpInfo";

const capabilityKeys = [
  "history","sourcePolicy","scheduledJobs","remoteExecution",
  "barcodeIntake","businessIntegrations"
] as const;

type Profile = {
  profileKey: string;
  name: string;
  description: string;
  workspaceType: "business" | "personal";
  normalizationFields: Array<{ key?: string }>;
  reviewDimensions: Array<{ key?: string }>;
  capabilities: Record<string, boolean>;
  isBuiltin: boolean;
  archivedAt: string | null;
};

type Workspace = {
  id: string;
  name: string;
  purpose: string;
  profileKey: string;
  profileName: string;
  role: "owner" | "admin" | "member";
};

function csv(items: Array<{ key?: string }>) {
  return items.map((item) => item.key ?? "").filter(Boolean).join(", ");
}
function list(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
async function jsonRequest(url: string, method: string, body: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Request failed.");
  }
  return payload;
}

function ProfileEditor({ profile }: { profile: Profile }) {
  const [name,setName]=useState(profile.name);
  const [description,setDescription]=useState(profile.description);
  const [normalization,setNormalization]=useState(csv(profile.normalizationFields));
  const [review,setReview]=useState(csv(profile.reviewDimensions));
  const [capabilities,setCapabilities]=useState(profile.capabilities);
  const [busy,setBusy]=useState(false);

  if (profile.isBuiltin) {
    return <>
      <p>{profile.description}</p>
      <p>Normalization: {normalization || "—"}</p>
      <p>Review: {review || "—"}</p>
      <span className="badge">built-in · {profile.workspaceType}</span>
    </>;
  }

  return (
    <form className="authForm" onSubmit={async (event)=>{
      event.preventDefault(); setBusy(true);
      try {
        await jsonRequest("/api/workspace-profiles","PATCH",{
          action:"update",profileKey:profile.profileKey,
          profile:{
            name,description,workspaceType:profile.workspaceType,
            normalizationFields:list(normalization),
            reviewDimensions:list(review),capabilities
          }
        });
        window.location.reload();
      } finally { setBusy(false); }
    }}>
      <label>Name<input value={name} onChange={(e)=>setName(e.target.value)} /></label>
      <label>Description<textarea value={description} onChange={(e)=>setDescription(e.target.value)} /></label>
      <label>Normalization fields<input value={normalization} onChange={(e)=>setNormalization(e.target.value)} /></label>
      <label>Review dimensions<input value={review} onChange={(e)=>setReview(e.target.value)} /></label>
      {capabilityKeys.map((key)=>(
        <label key={key}>
          <input type="checkbox" checked={Boolean(capabilities[key])}
            onChange={(e)=>setCapabilities((current)=>({...current,[key]:e.target.checked}))} />
          {key}
        </label>
      ))}
      <div className="heroActions">
        <button className="primary" disabled={busy}>Save profile</button>
        <button className="secondaryButton" type="button" disabled={busy}
          onClick={async ()=>{
            if(!confirm("Archive this custom profile?")) return;
            setBusy(true);
            try {
              await jsonRequest("/api/workspace-profiles","PATCH",{
                action:"archive",profileKey:profile.profileKey
              });
              window.location.reload();
            } finally { setBusy(false); }
          }}>
          Archive profile
        </button>
      </div>
    </form>
  );
}

function WorkspaceEditor({ workspace }: { workspace: Workspace }) {
  const [name,setName]=useState(workspace.name);
  const [purpose,setPurpose]=useState(workspace.purpose);
  const [busy,setBusy]=useState(false);
  if (workspace.role !== "owner" && workspace.role !== "admin") {
    return <span className="badge">{workspace.role}</span>;
  }
  return (
    <form className="authForm" onSubmit={async (event)=>{
      event.preventDefault(); setBusy(true);
      try {
        await jsonRequest("/api/workspaces","PATCH",{
          workspaceId:workspace.id,action:"update",name,purpose
        });
        window.location.reload();
      } finally { setBusy(false); }
    }}>
      <label>Name<input value={name} onChange={(e)=>setName(e.target.value)} /></label>
      <label>Purpose<textarea value={purpose} onChange={(e)=>setPurpose(e.target.value)} /></label>
      <div className="heroActions">
        <button className="primary" disabled={busy}>Save workspace</button>
        <button className="secondaryButton" type="button" disabled={busy}
          onClick={async ()=>{
            if(!confirm("Archive this workspace?")) return;
            setBusy(true);
            try {
              await jsonRequest("/api/workspaces","PATCH",{
                workspaceId:workspace.id,action:"archive"
              });
              window.location.reload();
            } finally { setBusy(false); }
          }}>
          Archive workspace
        </button>
      </div>
    </form>
  );
}

export function WorkspaceProfileManager({
  profiles,workspaces
}: { profiles:Profile[]; workspaces:Workspace[] }) {
  const activeProfiles=useMemo(()=>profiles.filter((p)=>!p.archivedAt),[profiles]);
  const [profileName,setProfileName]=useState("");
  const [profileDescription,setProfileDescription]=useState("");
  const [workspaceType,setWorkspaceType]=useState<"business"|"personal">("business");
  const [normalization,setNormalization]=useState("name, source_url, retrieved_at");
  const [review,setReview]=useState("identity, source_evidence, accuracy");
  const [profileBusy,setProfileBusy]=useState(false);
  const [workspaceName,setWorkspaceName]=useState("");
  const [workspacePurpose,setWorkspacePurpose]=useState("");
  const [profileKey,setProfileKey]=useState(activeProfiles[0]?.profileKey ?? "");
  const [workspaceBusy,setWorkspaceBusy]=useState(false);

  return <>
    <section>
      <div className="sectionHeading"><p className="eyebrow">Profiles</p><h2>Domain configuration</h2><HelpInfo topic="profiles-existing" /></div>
      <div className="grid">
        {profiles.map((profile)=>(
          <article className="card" key={profile.profileKey}>
            <h3>{profile.name}</h3>
            {profile.archivedAt ? <span className="badge">archived</span> : null}
            <ProfileEditor profile={profile} />
          </article>
        ))}
      </div>
    </section>

    <section>
      <div className="sectionHeading"><p className="eyebrow">Custom profile</p><h2>Create a reusable domain profile</h2><HelpInfo topic="profiles-custom" /></div>
      <form className="authForm card" onSubmit={async (event)=>{
        event.preventDefault(); setProfileBusy(true);
        try {
          await jsonRequest("/api/workspace-profiles","POST",{
            name:profileName,description:profileDescription,workspaceType,
            normalizationFields:list(normalization),reviewDimensions:list(review),
            capabilities:{
              history:true,sourcePolicy:true,scheduledJobs:false,
              remoteExecution:false,barcodeIntake:false,businessIntegrations:false
            }
          });
          window.location.reload();
        } finally { setProfileBusy(false); }
      }}>
        <label>Profile name<input value={profileName} onChange={(e)=>setProfileName(e.target.value)} required /></label>
        <label>Description<textarea value={profileDescription} onChange={(e)=>setProfileDescription(e.target.value)} /></label>
        <label>Workspace class<select value={workspaceType} onChange={(e)=>setWorkspaceType(e.target.value as "business"|"personal")}>
          <option value="business">Business</option><option value="personal">Personal</option>
        </select></label>
        <label>Normalization fields<input value={normalization} onChange={(e)=>setNormalization(e.target.value)} /></label>
        <label>Review dimensions<input value={review} onChange={(e)=>setReview(e.target.value)} /></label>
        <button className="primary" disabled={profileBusy}>Create custom profile</button>
      </form>
    </section>

    <section>
      <div className="sectionHeading"><p className="eyebrow">New workspace</p><h2>Create from a supported profile</h2><HelpInfo topic="workspace-create" /></div>
      <form className="authForm card" onSubmit={async (event)=>{
        event.preventDefault(); setWorkspaceBusy(true);
        try {
          await jsonRequest("/api/workspaces","POST",{
            name:workspaceName,purpose:workspacePurpose,profileKey
          });
          window.location.reload();
        } finally { setWorkspaceBusy(false); }
      }}>
        <label>Name<input value={workspaceName} onChange={(e)=>setWorkspaceName(e.target.value)} required /></label>
        <label>Purpose<textarea value={workspacePurpose} onChange={(e)=>setWorkspacePurpose(e.target.value)} /></label>
        <label>Profile<select value={profileKey} onChange={(e)=>setProfileKey(e.target.value)}>
          {activeProfiles.map((profile)=><option key={profile.profileKey} value={profile.profileKey}>{profile.name} ({profile.workspaceType})</option>)}
        </select></label>
        <button className="primary" disabled={workspaceBusy || !profileKey}>Create workspace</button>
      </form>
    </section>

    <section>
      <div className="sectionHeading"><p className="eyebrow">Active workspaces</p><h2>Edit or archive</h2><HelpInfo topic="workspace-manage" /></div>
      <div className="grid">
        {workspaces.map((workspace)=>(
          <article className="card" key={workspace.id}>
            <h3>{workspace.name}</h3><p>{workspace.profileName}</p>
            <WorkspaceEditor workspace={workspace} />
          </article>
        ))}
      </div>
    </section>
  </>;
}

"use client";

import { useState } from "react";

const modules = [
  ["ai-data-platform","Data & Intelligence"],
  ["rosevear-ai-hub","AI, Home & Automation"],
  ["rosevear-comms-hub","Communications & Operations"]
] as const;
const themes = [
  ["night-ops","Night Ops"],
  ["copper-workshop","Copper Workshop"],
  ["meadow-grid","Meadow Grid"]
] as const;

export function ServerShellThemeAcceptancePanel() {
  const [moduleId,setModuleId] = useState("ai-data-platform");
  const [profileId,setProfileId] = useState("night-ops");
  const [backgroundSlot,setBackgroundSlot] = useState("");
  const [status,setStatus] = useState(
    "Theme selection changes presentation only; security and health status meaning stays fixed."
  );
  const [pending,setPending] = useState(false);

  async function save() {
    setPending(true);
    try {
      const response = await fetch("/api/acceptance-advancement/theme", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({moduleId,profileId,backgroundSlot})
      });
      const payload = await response.json().catch(() => ({})) as {
        error?: string;
        selection?: { selectionId:string };
      };
      setStatus(
        response.ok && payload.selection
          ? "Saved theme evidence " + payload.selection.selectionId +
            ". Semantic security/health meaning remains immutable."
          : "Held: " + (payload.error ?? "theme selection rejected")
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="reviewQueue">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Build 413 · unified Server Shell themes</p>
          <h2>Per-module presentation profiles</h2>
        </div>
      </div>
      <div className="reviewBatchSummary">
        <label>Server module
          <select value={moduleId} onChange={(e)=>setModuleId(e.target.value)}>
            {modules.map(([id,label])=><option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label>Theme profile
          <select value={profileId} onChange={(e)=>setProfileId(e.target.value)}>
            {themes.map(([id,label])=><option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label>Optional background image slot
          <input
            value={backgroundSlot}
            maxLength={120}
            onChange={(e)=>setBackgroundSlot(e.target.value)}
            placeholder="e.g. workshop-grid-01"
          />
        </label>
        <button className="secondaryButton" type="button" disabled={pending} onClick={()=>void save()}>
          {pending ? "Saving…" : "Save module theme"}
        </button>
        <p aria-live="polite">{status}</p>
      </div>
    </section>
  );
}

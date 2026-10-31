"use client";

import { useEffect } from "react";

import { OperatorWorkspaceSavePanel } from "@/app/OperatorWorkspaceControls";
import {
  OPERATOR_WORKSPACE_EVENT,
  OPERATOR_WORKSPACE_STORAGE_KEY,
  migrateLegacyDataLibrarySavedViews,
  sanitizeOperatorWorkspaceProfiles
} from "@/lib/operator-workspaces";

const LEGACY_STORAGE_KEY = "ai-data-platform:data-library-saved-views:v1";

export function DataLibrarySavedViews({
  currentQuery,
  workspaceId,
  search,
  sort,
  visibleColumns,
  dateFrom,
  dateTo
}: {
  currentQuery: string;
  workspaceId: string;
  search: string;
  sort: string;
  visibleColumns: string[];
  dateFrom: string;
  dateTo: string;
}) {
  useEffect(() => {
    try {
      const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!legacy) return;
      const existingRaw = window.localStorage.getItem(OPERATOR_WORKSPACE_STORAGE_KEY);
      const existing = sanitizeOperatorWorkspaceProfiles(
        existingRaw ? JSON.parse(existingRaw) : []
      );
      const migrated = migrateLegacyDataLibrarySavedViews(existing, legacy);
      window.localStorage.setItem(OPERATOR_WORKSPACE_STORAGE_KEY, JSON.stringify(migrated));
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent(OPERATOR_WORKSPACE_EVENT));
    } catch {
      // Legacy local views remain non-authoritative convenience state.
    }
  }, []);

  return (
    <div className="librarySavedViews">
      <OperatorWorkspaceSavePanel
        destination="/data-library"
        destinationLabel="Unified Data Library"
        currentQuery={currentQuery}
        workspaceId={workspaceId}
        search={search}
        sort={sort}
        visibleColumns={visibleColumns}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />
    </div>
  );
}

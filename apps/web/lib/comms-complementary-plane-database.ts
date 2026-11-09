import { withUserDatabase } from "./database";
import {
  composeCommsComplementaryPlane,
  hashCommsAuthorizedProjection,
  validateCommsAuthorizedProjection,
  type CommsAuthorizedProjection
} from "./comms-complementary-plane";

type ProjectionRow = {
  projection_id: string;
  source_revision: string;
  observed_at: Date;
  expires_at: Date;
  evidence_uri: string;
  evidence_authority: "independent-source-verification";
  projection_sha256: string;
  projection: Record<string, unknown>;
  recorded_at: Date;
};

export async function listCommsComplementaryPlaneForUser(
  userId: string,
  now = new Date()
) {
  const row = await withUserDatabase(userId, async (client) => {
    const result = await client.query<ProjectionRow>(
      `select
         projection_id,
         source_revision,
         observed_at,
         expires_at,
         evidence_uri,
         evidence_authority,
         projection_sha256,
         projection,
         recorded_at
       from app.comms_plane_projection_evidence
       order by observed_at desc,recorded_at desc
       limit 1`
    );
    return result.rows[0] ?? null;
  });

  if (!row) {
    return {
      ...composeCommsComplementaryPlane({ now }),
      storageEvidence: null,
      recordedProjectionState: "NONE" as const
    };
  }

  try {
    const projection = validateCommsAuthorizedProjection(
      row.projection
    ) as CommsAuthorizedProjection;
    if (
      hashCommsAuthorizedProjection(row.projection) !==
        row.projection_sha256
    ) {
      throw new Error("comms_projection_hash_mismatch");
    }
    if (
      projection.sourceRevision !== row.source_revision ||
      projection.observedAt !== row.observed_at.toISOString() ||
      projection.expiresAt !== row.expires_at.toISOString() ||
      projection.evidenceURI !== row.evidence_uri
    ) {
      throw new Error("comms_projection_row_payload_mismatch");
    }

    return {
      ...composeCommsComplementaryPlane({ projection, now }),
      storageEvidence: {
        projectionId: row.projection_id,
        sourceRevision: row.source_revision,
        observedAt: row.observed_at.toISOString(),
        expiresAt: row.expires_at.toISOString(),
        evidenceURI: row.evidence_uri,
        evidenceAuthority: row.evidence_authority,
        projectionSha256: row.projection_sha256,
        recordedAt: row.recorded_at.toISOString()
      },
      recordedProjectionState: "VALID" as const
    };
  } catch (error) {
    return {
      ...composeCommsComplementaryPlane({ now }),
      projectionState: "HOLD_INVALID" as const,
      authorizedProjectionAvailable: false,
      projectionFresh: false,
      realIncidentCountKnown: false,
      realFollowUpCountKnown: false,
      storageEvidence: {
        projectionId: row.projection_id,
        sourceRevision: row.source_revision,
        observedAt: row.observed_at.toISOString(),
        expiresAt: row.expires_at.toISOString(),
        evidenceURI: row.evidence_uri,
        evidenceAuthority: row.evidence_authority,
        projectionSha256: row.projection_sha256,
        recordedAt: row.recorded_at.toISOString()
      },
      recordedProjectionState: "INVALID" as const,
      recordedProjectionError:
        error instanceof Error
          ? error.message
          : "comms_projection_invalid"
    };
  }
}

export type CommsComplementaryPlaneDatabaseModel = Awaited<
  ReturnType<typeof listCommsComplementaryPlaneForUser>
>;

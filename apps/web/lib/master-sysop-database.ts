import { createHash, randomUUID } from "node:crypto";

import { authPool, withUserDatabase } from "./database";
import {
  buildMasterSysopLaunchUrl,
  buildMasterSysopShellModel,
  buildNonAuthorizingHandoffContext,
  MASTER_SYSOP_HANDOFF_TTL_SECONDS,
  type MasterSysopDestinationKey,
  type MasterSysopMemberView,
  type MasterSysopRole,
  type MasterSysopSourceNavigationEvidence,
  type MasterSysopWorkspace
} from "./master-sysop-core";
import {
  evaluateMasterShellSourceFreshness,
  type MasterShellSourceState
} from "./master-shell-source-registry-core";
import type { MasterShellSourceId } from "./master-shell-contract-v1";

type SysopRow = {
  user_id: string;
  role: MasterSysopRole;
  granted_by: string;
  granted_at: Date;
  revoked_at: Date | null;
  note: string | null;
};

type WorkspaceRow = {
  id: string;
  slug: string;
  name: string;
  type: "business" | "personal";
  role: "owner" | "admin" | "member";
};

type SourceNavigationRow = {
  source_id: MasterShellSourceId;
  declared_status: Exclude<MasterShellSourceState, "UNKNOWN">;
  status_expires_at: Date;
  approved_origin: string | null;
  roles_allowed: unknown;
};

function strings(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

async function resolveUsers(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, { name: string; email: string }>();
  }
  const result = await authPool.query<{
    id: string;
    name: string;
    email: string;
  }>(
    `select id,name,email
     from auth."user"
     where id=any($1::text[])`,
    [userIds]
  );
  return new Map(
    result.rows.map((row) => [
      row.id,
      { name: row.name, email: row.email }
    ])
  );
}

async function currentSysopRole(userId: string) {
  return withUserDatabase(userId, async (client) => {
    const result = await client.query<{ role: MasterSysopRole | null }>(
      `select app.current_master_sysop_role() as role`
    );
    return result.rows[0]?.role ?? null;
  });
}

async function requireSysopOwner(userId: string) {
  const role = await currentSysopRole(userId);
  if (role !== "owner") {
    throw new Error("master_sysop_owner_required");
  }
}

export async function listMasterSysopShellForUser(
  userId: string,
  principal: { name: string; email: string },
  now = new Date()
) {
  const data = await withUserDatabase(userId, async (client) => {
    const [membership, claim, workspaces, members, sources] =
      await Promise.all([
        client.query<SysopRow>(
          `select user_id,role,granted_by,granted_at,revoked_at,note
           from app.master_sysop_members
           where user_id=$1
           limit 1`,
          [userId]
        ),
        client.query<{ eligible: boolean }>(
          `select app.master_sysop_claim_eligible() as eligible`
        ),
        client.query<WorkspaceRow>(
          `select w.id,w.slug,w.name,w.type,wm.role
           from app.workspaces w
           join app.workspace_members wm on wm.workspace_id=w.id
           where wm.user_id=$1
             and w.archived_at is null
           order by w.name`,
          [userId]
        ),
        client.query<SysopRow>(
          `select user_id,role,granted_by,granted_at,revoked_at,note
           from app.master_sysop_members
           order by revoked_at nulls first,role,user_id`
        ),
        client.query<SourceNavigationRow>(
          `select *
           from app.master_sysop_source_navigation_evidence()`
        )
      ]);

    return {
      membership: membership.rows[0] ?? null,
      claimEligible: claim.rows[0]?.eligible === true,
      workspaces: workspaces.rows,
      members: members.rows,
      sources: sources.rows
    };
  });

  const memberUsers = await resolveUsers(
    data.members.map((item) => item.user_id)
  );
  const members: MasterSysopMemberView[] = data.members.map((item) => {
    const user = memberUsers.get(item.user_id);
    return {
      userId: item.user_id,
      name: user?.name ?? "Unknown user",
      email: user?.email ?? "unavailable",
      role: item.role,
      grantedAt: item.granted_at.toISOString(),
      revokedAt: item.revoked_at?.toISOString() ?? null,
      active: item.revoked_at === null
    };
  });

  const workspaces: MasterSysopWorkspace[] = data.workspaces.map((item) => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    type: item.type,
    role: item.role
  }));

  const sourceEvidence: MasterSysopSourceNavigationEvidence[] =
    data.sources.map((row) => {
      const state = evaluateMasterShellSourceFreshness(
        row.declared_status,
        row.status_expires_at.toISOString(),
        now
      );
      return {
        sourceId: row.source_id,
        effectiveStatus: state.effectiveStatus,
        freshness: state.freshness,
        approvedOrigin: row.approved_origin,
        rolesAllowed: strings(row.roles_allowed)
      };
    });

  return buildMasterSysopShellModel({
    principal: {
      userId,
      name: principal.name,
      email: principal.email,
      role:
        data.membership && data.membership.revoked_at === null
          ? data.membership.role
          : data.membership?.role ?? null,
      revokedAt:
        data.membership?.revoked_at?.toISOString() ?? null
    },
    claimEligible: data.claimEligible,
    workspaces,
    sourceEvidence,
    members,
    generatedAt: now.toISOString()
  });
}

export async function claimMasterSysopOwner(userId: string) {
  return withUserDatabase(userId, async (client) => {
    const eligible = await client.query<{ eligible: boolean }>(
      `select app.master_sysop_claim_eligible() as eligible`
    );
    if (eligible.rows[0]?.eligible !== true) {
      throw new Error("master_sysop_claim_not_eligible");
    }
    const result = await client.query<SysopRow>(
      `insert into app.master_sysop_members (
         user_id,role,granted_by,note
       ) values ($1,'owner',$1,$2)
       returning user_id,role,granted_by,granted_at,revoked_at,note`,
      [
        userId,
        "Build 341 first Master Sysop claim by the authenticated Personal workspace owner."
      ]
    );
    return result.rows[0];
  });
}

export async function grantMasterSysopByEmail(
  userId: string,
  input: {
    email: string;
    role: MasterSysopRole;
    note?: string | null;
  }
) {
  await requireSysopOwner(userId);

  const email = input.email.trim().toLowerCase();
  if (
    email.length < 3 ||
    email.length > 320 ||
    !email.includes("@")
  ) {
    throw new Error("master_sysop_email_invalid");
  }
  if (input.role !== "owner" && input.role !== "operator") {
    throw new Error("master_sysop_role_invalid");
  }

  const users = await authPool.query<{
    id: string;
    name: string;
    email: string;
  }>(
    `select id,name,email
     from auth."user"
     where lower(email)=lower($1)
     limit 2`,
    [email]
  );
  if (users.rows.length !== 1) {
    throw new Error("master_sysop_target_user_not_found");
  }
  const target = users.rows[0];

  await withUserDatabase(userId, async (client) => {
    await client.query(
      `insert into app.master_sysop_members (
         user_id,role,granted_by,note
       ) values ($1,$2,$3,$4)
       on conflict (user_id) do update
       set role=excluded.role,
           revoked_at=null,
           note=excluded.note`,
      [
        target.id,
        input.role,
        userId,
        input.note?.trim().slice(0, 500) || null
      ]
    );
  });

  return {
    userId: target.id,
    name: target.name,
    email: target.email,
    role: input.role
  };
}

export async function revokeMasterSysop(
  userId: string,
  targetUserId: string
) {
  await requireSysopOwner(userId);
  if (!targetUserId || targetUserId.length > 200) {
    throw new Error("master_sysop_target_invalid");
  }

  return withUserDatabase(userId, async (client) => {
    const result = await client.query<{ user_id: string }>(
      `update app.master_sysop_members
       set revoked_at=coalesce(revoked_at,now())
       where user_id=$1
       returning user_id`,
      [targetUserId]
    );
    if (!result.rowCount) {
      throw new Error("master_sysop_target_not_found");
    }
    return { revoked: true, userId: result.rows[0].user_id };
  });
}

function deniedAuditState(state: string) {
  if (state === "ORIGIN_UNMEASURED") return "origin-unmeasured";
  if (state === "TENANT_UNMAPPED") return "tenant-unmapped";
  if (state === "TENANT_DENIED") return "tenant-denied";
  return "destination-held";
}

export async function prepareMasterSysopHandoff(
  userId: string,
  principal: { name: string; email: string },
  destinationKey: MasterSysopDestinationKey,
  now = new Date()
) {
  const model = await listMasterSysopShellForUser(
    userId,
    principal,
    now
  );
  if (!model.principal.activeSysop) {
    throw new Error("master_sysop_authorization_required");
  }

  const destination = model.destinations.find(
    (item) => item.key === destinationKey
  );
  if (!destination) {
    throw new Error("master_sysop_destination_invalid");
  }

  const handoffId = randomUUID();
  const issuedAt = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + MASTER_SYSOP_HANDOFF_TTL_SECONDS * 1000
  ).toISOString();

  const workspace =
    destination.tenantContext.state === "mapped" &&
    destination.tenantContext.workspaceSlug &&
    destination.tenantContext.workspaceRole
      ? {
          slug: destination.tenantContext.workspaceSlug,
          role: destination.tenantContext.workspaceRole
        }
      : null;

  const handoff = buildNonAuthorizingHandoffContext({
    handoffId,
    destinationKey,
    workspace,
    issuedAt,
    expiresAt
  });

  const auditState = destination.handoffAllowed
    ? destination.state === "INTERNAL_READY"
      ? "internal"
      : "prepared"
    : deniedAuditState(destination.state);

  await withUserDatabase(userId, async (client) => {
    await client.query(
      `insert into app.master_sysop_handoff_audit (
         handoff_id,actor_user_id,destination_key,workspace_id,
         workspace_role,handoff_state,context_hash,issued_at,
         expires_at,details
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
      [
        handoffId,
        userId,
        destination.key,
        destination.tenantContext.workspaceId,
        destination.tenantContext.workspaceRole,
        auditState,
        handoff.contextHash,
        issuedAt,
        expiresAt,
        JSON.stringify({
          build: 341,
          destinationState: destination.state,
          sourceStatus: destination.sourceStatus,
          sourceFreshness: destination.sourceFreshness,
          authority: "none",
          actorIdentityTransferred: false,
          destinationAuthenticationRequired:
            destination.destinationAuthenticationRequired,
          destinationAuthorizationGranted: false
        })
      ]
    );
  });

  if (!destination.handoffAllowed) {
    return {
      prepared: false,
      handoffId,
      state: destination.state,
      reason:
        "Destination handoff remains fail-closed until the source/origin/tenant evidence is sufficient.",
      expiresAt
    };
  }

  if (destination.state === "INTERNAL_READY") {
    return {
      prepared: true,
      handoffId,
      state: destination.state,
      launchUrl: "/master-shell-command-center",
      expiresAt,
      authority: "none",
      destinationReauthenticationRequired: false
    };
  }

  if (!destination.origin) {
    throw new Error("master_sysop_destination_origin_unavailable");
  }

  return {
    prepared: true,
    handoffId,
    state: destination.state,
    launchUrl: buildMasterSysopLaunchUrl(
      destination.origin,
      handoff.encoded
    ),
    expiresAt,
    authority: "none",
    destinationReauthenticationRequired: true,
    destinationAuthorizationGranted: false,
    contextHash: handoff.contextHash
  };
}

export async function masterSysopIsolationProbe(
  userId: string,
  workspaceId: string
) {
  return withUserDatabase(userId, async (client) => {
    const row = await client.query<{ role: string }>(
      `select wm.role
       from app.workspace_members wm
       where wm.workspace_id=$1
         and wm.user_id=$2
       limit 1`,
      [workspaceId, userId]
    );
    return {
      allowed: Boolean(row.rowCount),
      role: row.rows[0]?.role ?? null
    };
  });
}

export function contextAuditHash(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import {
  buildScheduleExchangeEnvelope,
  normalizeScheduleItem,
  safeScheduleReviewReason,
  scheduleRangesOverlap,
  type ScheduleItemType,
  type ScheduleStatus
} from "./shared-scheduling-core";
import type { PeerApplicationId } from "./app-connection-registry";
import { listWorkspacesForUser, withUserDatabase } from "./database";

async function requireWorkspaceAdmin(client: PoolClient, workspaceId: string) {
  const result = await client.query<{ role: string }>(
    `select role from app.workspace_members
     where workspace_id=$1
       and user_id=nullif(current_setting('app.user_id',true),'')
     limit 1`,
    [workspaceId]
  );
  const role = result.rows[0]?.role;
  if (role !== "owner" && role !== "admin") throw new Error("workspace_admin_required");
}

function dateOrNull(value: unknown) {
  return value === null || value === undefined ? null : new Date(String(value));
}

export async function listSharedSchedulingForUser(userId: string) {
  const workspaces = await listWorkspacesForUser(userId);
  const state = await withUserDatabase(userId, async (client) => {
    const [items, conflicts, packages] = await Promise.all([
      client.query(`select * from app.shared_schedule_items order by start_at asc, created_at desc limit 500`),
      client.query(`
        select c.*, a.title as schedule_title, b.title as conflicting_title
        from app.shared_schedule_conflict_evidence c
        inner join app.shared_schedule_items a on a.schedule_id=c.schedule_id
        inner join app.shared_schedule_items b on b.schedule_id=c.conflicting_schedule_id
        order by c.recorded_at desc limit 500`),
      client.query(`
        select p.*, s.title, s.item_type, s.status, s.start_at, s.end_at,
               s.source_application_id, rv.decision, rv.reason, rv.reviewed_at
        from app.shared_schedule_exchange_packages p
        inner join app.shared_schedule_items s on s.schedule_id=p.schedule_id
        left join app.shared_schedule_exchange_reviews rv on rv.package_id=p.package_id
        order by case when rv.decision is null then 0 else 1 end, p.created_at desc limit 500`)
    ]);

    return {
      items: items.rows.map((row)=>({
        scheduleId:String(row.schedule_id),
        workspaceId:String(row.workspace_id),
        canonicalTenantKey:String(row.canonical_tenant_key),
        sourceApplicationId:String(row.source_application_id) as PeerApplicationId,
        destinationApplicationId:String(row.destination_application_id) as PeerApplicationId,
        sourceRecordId:String(row.source_record_id),
        itemType:String(row.item_type) as ScheduleItemType,
        title:String(row.title),
        status:String(row.status) as ScheduleStatus,
        startAt:new Date(String(row.start_at)),
        endAt:dateOrNull(row.end_at),
        timezone:String(row.timezone),
        locationText:row.location_text ? String(row.location_text) : null,
        customerRecordId:row.customer_record_id ? String(row.customer_record_id) : null,
        serviceRecordId:row.service_record_id ? String(row.service_record_id) : null,
        staffRecordIds:Array.isArray(row.staff_record_ids) ? row.staff_record_ids.map(String) : [],
        equipmentRecordIds:Array.isArray(row.equipment_record_ids) ? row.equipment_record_ids.map(String) : [],
        notes:row.notes ? String(row.notes) : null,
        state:"held" as const,
        holdReason:"schedule-exchange-not-authorized" as const,
        createdAt:new Date(String(row.created_at))
      })),
      conflicts: conflicts.rows.map((row)=>({
        conflictId:String(row.conflict_id),
        workspaceId:String(row.workspace_id),
        scheduleId:String(row.schedule_id),
        conflictingScheduleId:String(row.conflicting_schedule_id),
        scheduleTitle:String(row.schedule_title),
        conflictingTitle:String(row.conflicting_title),
        conflictScope:"local-held-items-only" as const,
        reason:String(row.reason),
        recordedAt:new Date(String(row.recorded_at))
      })),
      packages: packages.rows.map((row)=>({
        packageId:String(row.package_id),
        workspaceId:String(row.workspace_id),
        scheduleId:String(row.schedule_id),
        title:String(row.title),
        itemType:String(row.item_type),
        status:String(row.status),
        startAt:new Date(String(row.start_at)),
        endAt:dateOrNull(row.end_at),
        sourceApplicationId:String(row.source_application_id),
        destinationApplicationId:String(row.destination_application_id),
        destinationTenantKey:String(row.destination_tenant_key),
        localConflictCount:Number(row.local_conflict_count),
        state:"held" as const,
        holdReason:"schedule-exchange-not-authorized" as const,
        reviewDecision:row.decision==="approve" || row.decision==="reject" ? row.decision : null,
        reviewReason:row.reason ? String(row.reason) : null,
        reviewedAt:dateOrNull(row.reviewed_at),
        createdAt:new Date(String(row.created_at))
      }))
    };
  });

  return {
    workspaces,
    ...state,
    summary:{
      heldScheduleItems:state.items.length,
      localConflictFindings:state.conflicts.length,
      heldPackages:state.packages.length,
      pendingReviews:state.packages.filter((item)=>item.reviewDecision===null).length,
      approvedForFutureHandoff:state.packages.filter((item)=>item.reviewDecision==="approve").length
    },
    policy:{
      bookingContractId:"rosevear.shared.booking.v1",
      appendOnlyScheduling:true,
      localConflictDetectionOnly:true,
      peerCalendarWrites:false,
      outboundNetworkRequests:false,
      automaticAppointmentCreation:false,
      ownerAdminReviewRequired:true,
      ql266Resumed:false
    }
  };
}

export async function createSharedScheduleItem(userId:string,input:{
  workspaceId:string;
  canonicalTenantKey:string;
  sourceApplicationId:string;
  destinationApplicationId:string;
  sourceRecordId:string;
  itemType:string;
  title:string;
  status:string;
  startAt:string;
  endAt?:string|null;
  timezone:string;
  locationText?:string|null;
  customerRecordId?:string|null;
  serviceRecordId?:string|null;
  staffRecordIds?:string[];
  equipmentRecordIds?:string[];
  notes?:string|null;
}) {
  const normalized=normalizeScheduleItem(input);
  return withUserDatabase(userId,async(client)=>{
    await requireWorkspaceAdmin(client,input.workspaceId);
    const scheduleId=randomUUID();
    const inserted=await client.query<{schedule_id:string}>(
      `insert into app.shared_schedule_items (
        schedule_id,workspace_id,canonical_tenant_key,source_application_id,destination_application_id,
        source_record_id,item_type,title,status,start_at,end_at,timezone,location_text,
        customer_record_id,service_record_id,staff_record_ids,equipment_record_ids,notes,
        portable_record,schedule_sha256,created_by
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18,$19::jsonb,$20,$21)
      on conflict (workspace_id,schedule_sha256) do nothing returning schedule_id`,
      [
        scheduleId,input.workspaceId,normalized.canonicalTenantKey,normalized.sourceApplicationId,
        normalized.destinationApplicationId,normalized.sourceRecordId,normalized.itemType,normalized.title,
        normalized.status,normalized.startAt,normalized.endAt,normalized.timezone,normalized.locationText,
        normalized.customerRecordId,normalized.serviceRecordId,JSON.stringify(normalized.staffRecordIds),
        JSON.stringify(normalized.equipmentRecordIds),normalized.notes,JSON.stringify(normalized.portableRecord),
        normalized.scheduleSha256,userId
      ]
    );
    let resolvedId=inserted.rows[0]?.schedule_id ? String(inserted.rows[0].schedule_id) : "";
    if(!resolvedId){
      const existing=await client.query<{schedule_id:string}>(
        `select schedule_id from app.shared_schedule_items where workspace_id=$1 and schedule_sha256=$2 limit 1`,
        [input.workspaceId,normalized.scheduleSha256]
      );
      resolvedId=existing.rows[0]?.schedule_id ?? "";
    }
    if(!resolvedId) throw new Error("schedule_exchange_conflict");

    const candidates=await client.query(
      `select schedule_id,start_at,end_at,title
       from app.shared_schedule_items
       where workspace_id=$1
         and destination_application_id=$2
         and schedule_id<>$3
         and status<>'cancelled'
         and start_at < coalesce($5::timestamptz,$4::timestamptz + interval '1 minute')
         and coalesce(end_at,start_at + interval '1 minute') > $4::timestamptz
       order by start_at asc limit 100`,
      [input.workspaceId,normalized.destinationApplicationId,resolvedId,normalized.startAt,normalized.endAt]
    );

    let localConflictCount=0;
    for(const row of candidates.rows){
      const overlaps=scheduleRangesOverlap(
        {startAt:normalized.startAt,endAt:normalized.endAt},
        {startAt:new Date(String(row.start_at)).toISOString(),endAt:row.end_at ? new Date(String(row.end_at)).toISOString() : null}
      );
      if(!overlaps) continue;
      const first=[resolvedId,String(row.schedule_id)].sort();
      const conflictId=randomUUID();
      const result=await client.query(
        `insert into app.shared_schedule_conflict_evidence
         (conflict_id,workspace_id,schedule_id,conflicting_schedule_id,reason,recorded_by)
         values ($1,$2,$3,$4,$5,$6)
         on conflict (workspace_id,schedule_id,conflicting_schedule_id) do nothing`,
        [
          conflictId,input.workspaceId,first[0],first[1],
          "Overlapping held schedule items for the same destination application. This is local evidence only; peer calendar availability was not queried.",
          userId
        ]
      );
      if((result.rowCount??0)>0) localConflictCount+=1;
    }

    await client.query(
      `insert into app.shared_schedule_exchange_audit
       (audit_id,workspace_id,actor_user_id,action,schedule_id,details)
       values ($1,$2,$3,'schedule-created',$4,$5::jsonb)`,
      [randomUUID(),input.workspaceId,userId,resolvedId,JSON.stringify({
        contractId:normalized.contractId,
        destinationApplicationId:normalized.destinationApplicationId,
        localConflictCount,
        peerCalendarWrite:false
      })]
    );

    return {scheduleId:resolvedId,...normalized,state:"held" as const,localConflictCount};
  });
}

export async function prepareScheduleExchangePackage(userId:string,input:{
  scheduleId:string;
  destinationTenantKey:string;
}) {
  return withUserDatabase(userId,async(client)=>{
    const result=await client.query(`select * from app.shared_schedule_items where schedule_id=$1 limit 1`,[input.scheduleId]);
    const row=result.rows[0];
    if(!row) throw new Error("schedule_not_found");
    const workspaceId=String(row.workspace_id);
    await requireWorkspaceAdmin(client,workspaceId);
    const normalized=normalizeScheduleItem({
      canonicalTenantKey:String(row.canonical_tenant_key),
      sourceApplicationId:String(row.source_application_id),
      destinationApplicationId:String(row.destination_application_id),
      sourceRecordId:String(row.source_record_id),
      itemType:String(row.item_type),
      title:String(row.title),
      status:String(row.status),
      startAt:new Date(String(row.start_at)).toISOString(),
      endAt:row.end_at ? new Date(String(row.end_at)).toISOString() : null,
      timezone:String(row.timezone),
      locationText:row.location_text ? String(row.location_text) : null,
      customerRecordId:row.customer_record_id ? String(row.customer_record_id) : null,
      serviceRecordId:row.service_record_id ? String(row.service_record_id) : null,
      staffRecordIds:Array.isArray(row.staff_record_ids) ? row.staff_record_ids.map(String) : [],
      equipmentRecordIds:Array.isArray(row.equipment_record_ids) ? row.equipment_record_ids.map(String) : [],
      notes:row.notes ? String(row.notes) : null
    });
    const destinationTenantKey=input.destinationTenantKey.trim().toLowerCase();
    if(!/^[a-z0-9][a-z0-9._:-]{1,119}$/.test(destinationTenantKey)) throw new Error("schedule_destination_tenant_invalid");

    const prepared=buildScheduleExchangeEnvelope(normalized);
    const conflictResult=await client.query<{count:string}>(
      `select count(*)::text as count
       from app.shared_schedule_conflict_evidence
       where workspace_id=$1 and (schedule_id=$2 or conflicting_schedule_id=$2)`,
      [workspaceId,input.scheduleId]
    );
    const localConflictCount=Number(conflictResult.rows[0]?.count ?? "0");
    const packageId=randomUUID();
    const inserted=await client.query<{package_id:string}>(
      `insert into app.shared_schedule_exchange_packages (
        package_id,workspace_id,schedule_id,destination_application_id,destination_tenant_key,
        payload_sha256,local_conflict_count,created_by
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)
      on conflict (workspace_id,schedule_id,destination_application_id,destination_tenant_key,payload_sha256)
      do nothing returning package_id`,
      [
        packageId,workspaceId,input.scheduleId,normalized.destinationApplicationId,destinationTenantKey,
        prepared.payloadSha256,localConflictCount,userId
      ]
    );
    let resolvedId=inserted.rows[0]?.package_id ? String(inserted.rows[0].package_id) : "";
    if(!resolvedId){
      const existing=await client.query<{package_id:string}>(
        `select package_id from app.shared_schedule_exchange_packages
         where workspace_id=$1 and schedule_id=$2 and destination_application_id=$3
           and destination_tenant_key=$4 and payload_sha256=$5 limit 1`,
        [workspaceId,input.scheduleId,normalized.destinationApplicationId,destinationTenantKey,prepared.payloadSha256]
      );
      resolvedId=existing.rows[0]?.package_id ?? "";
    }
    if(!resolvedId) throw new Error("schedule_package_conflict");

    await client.query(
      `insert into app.shared_schedule_exchange_audit
       (audit_id,workspace_id,actor_user_id,action,schedule_id,package_id,details)
       values ($1,$2,$3,'schedule-package-prepared',$4,$5,$6::jsonb)`,
      [randomUUID(),workspaceId,userId,input.scheduleId,resolvedId,JSON.stringify({
        state:"held",localConflictCount,peerCalendarWriteRequested:false,payloadSha256:prepared.payloadSha256
      })]
    );
    return {packageId:resolvedId,state:"held" as const,localConflictCount,payloadSha256:prepared.payloadSha256};
  });
}

export async function reviewScheduleExchangePackage(userId:string,input:{
  packageId:string;
  decision:"approve"|"reject";
  reason:string;
}) {
  if(!safeScheduleReviewReason(input.reason)) throw new Error("schedule_review_reason_invalid");
  return withUserDatabase(userId,async(client)=>{
    const result=await client.query(`
      select workspace_id,local_conflict_count
      from app.shared_schedule_exchange_packages where package_id=$1 limit 1`,[input.packageId]);
    const row=result.rows[0];
    if(!row) throw new Error("schedule_package_not_found");
    const workspaceId=String(row.workspace_id);
    await requireWorkspaceAdmin(client,workspaceId);
    if(input.decision==="approve" && Number(row.local_conflict_count)>0) {
      throw new Error("schedule_local_conflicts_require_resolution");
    }
    const reviewId=randomUUID();
    await client.query(
      `insert into app.shared_schedule_exchange_reviews
       (review_id,workspace_id,package_id,decision,reason,reviewed_by)
       values ($1,$2,$3,$4,$5,$6)`,
      [reviewId,workspaceId,input.packageId,input.decision,input.reason.trim(),userId]
    );
    await client.query(
      `insert into app.shared_schedule_exchange_audit
       (audit_id,workspace_id,actor_user_id,action,package_id,review_id,details)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [randomUUID(),workspaceId,userId,
       input.decision==="approve" ? "schedule-approved-for-future-handoff" : "schedule-package-rejected",
       input.packageId,reviewId,JSON.stringify({state:"held",peerCalendarWrite:false})]
    );
    return {reviewId,packageId:input.packageId,decision:input.decision,state:"held" as const};
  });
}

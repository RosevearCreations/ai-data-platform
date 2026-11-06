import { createHash } from "node:crypto";

import {
  getCrossAppDataContract,
  validateCrossAppDataContractRecord
} from "./cross-app-data-contract-registry";
import {
  PEER_APPLICATION_DEFINITIONS,
  type PeerApplicationId
} from "./app-connection-registry";

export const SCHEDULE_ITEM_TYPES = Object.freeze([
  "appointment",
  "booking",
  "job",
  "maintenance",
  "event",
  "hold"
] as const);

export const SCHEDULE_STATUSES = Object.freeze([
  "tentative",
  "confirmed",
  "cancelled",
  "completed"
] as const);

export type ScheduleItemType = (typeof SCHEDULE_ITEM_TYPES)[number];
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

export type NormalizedScheduleItem = {
  canonicalTenantKey: string;
  sourceApplicationId: PeerApplicationId;
  destinationApplicationId: PeerApplicationId;
  sourceRecordId: string;
  itemType: ScheduleItemType;
  title: string;
  status: ScheduleStatus;
  startAt: string;
  endAt: string | null;
  timezone: string;
  locationText: string | null;
  customerRecordId: string | null;
  serviceRecordId: string | null;
  staffRecordIds: string[];
  equipmentRecordIds: string[];
  notes: string | null;
  contractId: "rosevear.shared.booking.v1";
  contractVersion: "1.0.0";
  portableRecord: Record<string, unknown>;
  scheduleSha256: string;
};

export type ScheduleExchangeEnvelope = {
  schema: "rosevear.schedule.exchange-package.v1";
  contractId: "rosevear.shared.booking.v1";
  contractVersion: "1.0.0";
  sourceApplicationId: PeerApplicationId;
  destinationApplicationId: PeerApplicationId;
  canonicalTenantKey: string;
  sourceRecordId: string;
  itemType: ScheduleItemType;
  title: string;
  status: ScheduleStatus;
  startAt: string;
  endAt: string | null;
  timezone: string;
  locationText: string | null;
  customerRecordId: string | null;
  serviceRecordId: string | null;
  staffRecordIds: string[];
  equipmentRecordIds: string[];
  notes: string | null;
  state: "held";
  holdReason: "schedule-exchange-not-authorized";
  peerCalendarWriteRequested: false;
  portableRecord: Record<string, unknown>;
};

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record).sort().map((key) =>
      JSON.stringify(key) + ":" + canonical(record[key])
    ).join(",") + "}";
  }
  return JSON.stringify(value);
}

function boundedText(value: unknown, max: number, code: string, required = false) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error(code);
    return null;
  }
  const normalized = typeof value === "string"
    ? value.normalize("NFKC").trim().replace(/\s+/g, " ")
    : "";
  if (!normalized || normalized.length > max || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new Error(code);
  }
  return normalized;
}

function dateTime(value: unknown, code: string, required = false) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error(code);
    return null;
  }
  if (typeof value !== "string") throw new Error(code);
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error(code);
  return new Date(ms).toISOString();
}

function stringList(value: unknown, maxItems: number, maxLength: number, code: string) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > maxItems) throw new Error(code);
  const result=value.map((item)=>{
    const normalized=boundedText(item,maxLength,code,true);
    if(!normalized) throw new Error(code);
    return normalized;
  });
  return [...new Set(result)];
}

function isPeerApplication(value: string): value is PeerApplicationId {
  return PEER_APPLICATION_DEFINITIONS.some((application) => application.id === value);
}

export function normalizeScheduleTenantKey(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-z0-9][a-z0-9._:-]{1,119}$/.test(normalized)) {
    throw new Error("schedule_tenant_key_invalid");
  }
  return normalized;
}

export function normalizeScheduleItem(input: {
  canonicalTenantKey: string;
  sourceApplicationId: string;
  destinationApplicationId: string;
  sourceRecordId: string;
  itemType: string;
  title: string;
  status: string;
  startAt: string;
  endAt?: string | null;
  timezone: string;
  locationText?: string | null;
  customerRecordId?: string | null;
  serviceRecordId?: string | null;
  staffRecordIds?: string[];
  equipmentRecordIds?: string[];
  notes?: string | null;
}): NormalizedScheduleItem {
  if (!isPeerApplication(input.sourceApplicationId)) throw new Error("schedule_source_application_invalid");
  if (!isPeerApplication(input.destinationApplicationId)) throw new Error("schedule_destination_application_invalid");
  if (input.sourceApplicationId === input.destinationApplicationId) throw new Error("schedule_same_application_denied");
  if (!(SCHEDULE_ITEM_TYPES as readonly string[]).includes(input.itemType)) throw new Error("schedule_item_type_invalid");
  if (!(SCHEDULE_STATUSES as readonly string[]).includes(input.status)) throw new Error("schedule_status_invalid");

  const canonicalTenantKey=normalizeScheduleTenantKey(input.canonicalTenantKey);
  const sourceRecordId=boundedText(input.sourceRecordId,160,"schedule_source_record_id_invalid",true) as string;
  const title=boundedText(input.title,240,"schedule_title_invalid",true) as string;
  const startAt=dateTime(input.startAt,"schedule_start_at_invalid",true) as string;
  const endAt=dateTime(input.endAt,"schedule_end_at_invalid");
  if(endAt && Date.parse(endAt)<=Date.parse(startAt)) throw new Error("schedule_time_range_invalid");
  const timezone=boundedText(input.timezone,100,"schedule_timezone_invalid",true) as string;
  if(!/^[A-Za-z_]+\/[A-Za-z0-9_+\-]+(?:\/[A-Za-z0-9_+\-]+)?$/.test(timezone) && timezone!=="UTC") {
    throw new Error("schedule_timezone_invalid");
  }
  const locationText=boundedText(input.locationText,300,"schedule_location_invalid");
  const customerRecordId=boundedText(input.customerRecordId,160,"schedule_customer_record_id_invalid");
  const serviceRecordId=boundedText(input.serviceRecordId,160,"schedule_service_record_id_invalid");
  const staffRecordIds=stringList(input.staffRecordIds,30,160,"schedule_staff_records_invalid");
  const equipmentRecordIds=stringList(input.equipmentRecordIds,30,160,"schedule_equipment_records_invalid");
  const notes=boundedText(input.notes,1200,"schedule_notes_invalid");

  const portableRecord:Record<string,unknown>={
    sourceApplicationId:input.sourceApplicationId,
    sourceRecordId,
    tenantKey:canonicalTenantKey,
    updatedAt:startAt,
    startAt,
    status:input.status
  };
  if(endAt) portableRecord.endAt=endAt;
  if(locationText) portableRecord.locationText=locationText;
  if(customerRecordId) portableRecord.customerRecordId=customerRecordId;
  if(serviceRecordId) portableRecord.serviceRecordId=serviceRecordId;
  if(notes) portableRecord.notes=notes;

  const contract=getCrossAppDataContract("rosevear.shared.booking.v1");
  if(!contract) throw new Error("schedule_booking_contract_missing");
  const validation=validateCrossAppDataContractRecord(contract.contractId,portableRecord);
  if(!validation.valid) throw new Error("schedule_booking_contract_validation_failed:"+validation.errors.join("|"));

  const normalized={
    schema:"rosevear.shared.schedule-item.v1",
    canonicalTenantKey,
    sourceApplicationId:input.sourceApplicationId,
    destinationApplicationId:input.destinationApplicationId,
    sourceRecordId,
    itemType:input.itemType,
    title,
    status:input.status,
    startAt,
    endAt,
    timezone,
    locationText,
    customerRecordId,
    serviceRecordId,
    staffRecordIds,
    equipmentRecordIds,
    notes,
    contractId:"rosevear.shared.booking.v1",
    contractVersion:"1.0.0",
    portableRecord
  };

  return {
    canonicalTenantKey,
    sourceApplicationId:input.sourceApplicationId,
    destinationApplicationId:input.destinationApplicationId,
    sourceRecordId,
    itemType:input.itemType as ScheduleItemType,
    title,
    status:input.status as ScheduleStatus,
    startAt,
    endAt,
    timezone,
    locationText,
    customerRecordId,
    serviceRecordId,
    staffRecordIds,
    equipmentRecordIds,
    notes,
    contractId:"rosevear.shared.booking.v1",
    contractVersion:"1.0.0",
    portableRecord,
    scheduleSha256:sha256(canonical(normalized))
  };
}

export function scheduleRangesOverlap(
  left:{startAt:string;endAt:string|null},
  right:{startAt:string;endAt:string|null}
) {
  const leftStart=Date.parse(left.startAt);
  const rightStart=Date.parse(right.startAt);
  const leftEnd=left.endAt ? Date.parse(left.endAt) : leftStart + 60_000;
  const rightEnd=right.endAt ? Date.parse(right.endAt) : rightStart + 60_000;
  return leftStart < rightEnd && rightStart < leftEnd;
}

export function buildScheduleExchangeEnvelope(item:NormalizedScheduleItem) {
  const envelope:ScheduleExchangeEnvelope={
    schema:"rosevear.schedule.exchange-package.v1",
    contractId:item.contractId,
    contractVersion:item.contractVersion,
    sourceApplicationId:item.sourceApplicationId,
    destinationApplicationId:item.destinationApplicationId,
    canonicalTenantKey:item.canonicalTenantKey,
    sourceRecordId:item.sourceRecordId,
    itemType:item.itemType,
    title:item.title,
    status:item.status,
    startAt:item.startAt,
    endAt:item.endAt,
    timezone:item.timezone,
    locationText:item.locationText,
    customerRecordId:item.customerRecordId,
    serviceRecordId:item.serviceRecordId,
    staffRecordIds:item.staffRecordIds,
    equipmentRecordIds:item.equipmentRecordIds,
    notes:item.notes,
    state:"held",
    holdReason:"schedule-exchange-not-authorized",
    peerCalendarWriteRequested:false,
    portableRecord:item.portableRecord
  };
  return {envelope,payloadSha256:sha256(canonical(envelope))};
}

export function safeScheduleReviewReason(value:string) {
  const normalized=value.trim();
  return normalized.length>=8 && normalized.length<=500 && !/[\u0000-\u001f\u007f]/.test(normalized);
}

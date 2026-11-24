import type {Build443WitnessBinding} from "./build443-witness-key-custody";
export const BUILD_444=444 as const;
export const BUILD_444_SCHEMA="rosevear.ai-data-platform.build444-owner-recovery-ceremony.v1" as const;
export type Build444Proof={ownerSessionVerified:boolean;ownerRoleVerified:boolean;accountEmailAccessible:boolean;recoveryEmailDeliveryConfirmed:boolean;originalWitnessEvidenceVerified:boolean};
export function build444Readiness(input:{
 mailKeyPresent:boolean;senderPresent:boolean;senderAddress:string|null;trustedWitnessPinsPresent:boolean;
 witnessBindings:Record<string,Build443WitnessBinding>|null;proof?:Partial<Build444Proof>
}){
 const sender=input.senderAddress?.trim()??"";
 const senderShapeValid=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender)&&!sender.includes("\n");
 const mailConfigReady=input.mailKeyPresent&&input.senderPresent&&senderShapeValid;
 const bindings=input.witnessBindings?Object.entries(input.witnessBindings):[];
 const permitted=bindings.filter(([key,b])=>key.length>0&&b?.active===true&&b.independentOfSource===true&&Boolean(b.originalDeviceId)&&Boolean(b.witnessId)&&Boolean(b.witnessRole)&&Array.isArray(b.appIds)&&b.appIds.length>0);
 const witnessEnrollmentReady=input.trustedWitnessPinsPresent&&permitted.length>0;
 const p=input.proof??{};
 const recoveryVerified=mailConfigReady&&p.ownerSessionVerified===true&&p.ownerRoleVerified===true&&p.accountEmailAccessible===true&&p.recoveryEmailDeliveryConfirmed===true;
 const fieldAccepted=witnessEnrollmentReady&&p.originalWitnessEvidenceVerified===true;
 return {
  schema:BUILD_444_SCHEMA,build:444,
  accountIdentityMode:"EMAIL_AND_PASSWORD" as const,
  mailConfiguration:mailConfigReady?"CONFIGURED_NOT_DELIVERY_VERIFIED":"HOLD_CONFIGURE_VERIFIED_SENDER",
  recoveryCeremony:recoveryVerified?"VERIFIED":"HOLD_PENDING_ORIGINAL_OWNER_IDENTITY_AND_DELIVERY",
  originalDeviceEnrollment:witnessEnrollmentReady?"KEY_POLICY_CONFIGURED_PROOFS_PENDING":"HOLD_NO_APPROVED_INDEPENDENT_WITNESS",
  fieldAcceptance:fieldAccepted?"WITNESS_EVIDENCE_REVIEW_REQUIRED":"HOLD_INDEPENDENT_FIELD_PROOF_REQUIRED",
  verifiedSenderShape:senderShapeValid,
  approvedIndependentKeyBindings:permitted.length,
  automaticAccountChanges:0,automaticPeerPromotions:0,
  note:"Environment configuration does not verify provider sending, account ownership, signer independence or original-device attendance."
 };
}

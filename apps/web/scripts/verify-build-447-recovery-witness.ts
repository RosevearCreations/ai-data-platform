import assert from "node:assert/strict";
import {BUILD_447_APPS,classifyBuild447Delivery,reconcileBuild447,type Build447RecoveryInput,type Build447WitnessRow} from "../lib/build447-recovery-witness-reconciliation";
const now=new Date("2026-11-25T16:00:00.000Z");
const original:Build447RecoveryInput={
 ownerCredential:true,ownerRole:true,resetTokenRedeemed:true,postResetSession:true,emailVerified:false,
 recoveryDelivery:"PENDING_OR_DELAYED",verificationDelivery:"NOT_CHECKED",recoveryAcceptedAt:"2026-11-25T15:40:00.000Z"
};
const initial=reconcileBuild447(original,[],now);
assert.equal(initial.ownerRecovery,"ORIGINAL_OWNER_POST_RESET_LOGIN_VERIFIED");
assert.equal(initial.mailboxDeliveryClosure,"HOLD_MAILBOX_VERIFICATION_OR_DELIVERY");
assert.equal(initial.witnessCount,0);
assert.equal(initial.applications.length,7);
assert.equal(initial.deliveryException.state,"PROVIDER_DELIVERY_DELAYED_REVIEW");
assert.equal(classifyBuild447Delivery({...original,recoveryDelivery:"PROVIDER_FAILED"},now).state,"PROVIDER_DELIVERY_EXCEPTION");
assert.equal(classifyBuild447Delivery({...original,recoveryDelivery:"NOT_CHECKED"},now).state,"PROVIDER_LOOKUP_UNAVAILABLE");
assert.equal(classifyBuild447Delivery({...original,recoveryAcceptedAt:null},now).state,"NO_PROVIDER_ACCEPTANCE_RECEIPT");
assert.equal(classifyBuild447Delivery({...original,recoveryAcceptedAt:"2026-11-25T16:01:00.000Z"},now).state,"INVALID_RECEIPT_TIME_HOLD");
const rows:Build447WitnessRow[]=BUILD_447_APPS.map(appId=>({appId,state:"CERTIFIED",reason:"INDEPENDENT_SOURCE_BOUND_WITNESS_VERIFIED",sourceCommit:"a".repeat(40),observedAt:"2026-11-25T15:59:00.000Z"}));
const ready=reconcileBuild447({...original,emailVerified:true,recoveryDelivery:"PROVIDER_DELIVERED_NOT_MAILBOX_PROVEN"},rows,now);
assert.equal(ready.ownerRecovery,"ORIGINAL_OWNER_POST_RESET_LOGIN_VERIFIED");
assert.equal(ready.mailboxDeliveryClosure,"VERIFIED_ORIGINAL_MAILBOX_AND_TRANSPORT");
assert.equal(ready.witnessCount,7);
assert.equal(ready.sevenApplicationClosure,"INDEPENDENT_WITNESSES_CERTIFIED");
assert.equal(reconcileBuild447(original,[...rows,rows[0]],now).witnessCount,6);
assert.equal(reconcileBuild447(original,rows.map(x=>({...x,observedAt:"2026-11-25T15:30:00Z"})),now).witnessCount,0);
assert.equal(reconcileBuild447({...original,postResetSession:false},rows,now).ownerRecovery,"HOLD_PENDING_OWNER_RESET_AND_NEW_LOGIN");
assert.equal(reconcileBuild447(original,rows,now).automaticResends,0);
console.log("Build 447 live owner recovery, Resend exceptions and independent seven-application witness reconciliation tests passed.");

import assert from "node:assert/strict";
import {reconcileBuild446,type Build446Proof} from "../lib/build446-mailbox-closure";
const base:Build446Proof={
 hasCredential:true,originalOwnerRole:true,originalEmailVerified:false,
 recoveryProviderReceiptAt:null,recoveryLastEvent:null,resetCompletedAt:null,
 authenticatedOwnerSessionCreatedAt:null,verificationProviderReceiptAt:null,verificationLastEvent:null
};
assert.equal(reconcileBuild446(base).closure,"HOLD_MISSING_LIVE_RECOVERY_EVIDENCE");
const accepted={...base,recoveryProviderReceiptAt:"2026-11-25T10:00:00Z",recoveryLastEvent:"sent"};
assert.equal(reconcileBuild446(accepted).closure,"HOLD_MISSING_LIVE_RECOVERY_EVIDENCE");
const delivered={...accepted,recoveryLastEvent:"delivered"};
assert.equal(reconcileBuild446(delivered).mailbox,"HOLD_UNVERIFIED_ORIGINAL_EMAIL");
const reset={...delivered,resetCompletedAt:"2026-11-25T10:05:00Z",authenticatedOwnerSessionCreatedAt:"2026-11-25T10:06:00Z"};
assert.equal(reconcileBuild446(reset).closure,"HOLD_MISSING_LIVE_RECOVERY_EVIDENCE");
const verified={...reset,originalEmailVerified:true,verificationProviderReceiptAt:"2026-11-25T10:04:00Z",verificationLastEvent:"delivered"};
assert.equal(reconcileBuild446(verified).closure,"VERIFIED_AUTHENTICATED_RECOVERY_CLOSURE");
assert.equal(reconcileBuild446({...verified,authenticatedOwnerSessionCreatedAt:"2026-11-25T10:03:00Z"}).closure,"HOLD_MISSING_LIVE_RECOVERY_EVIDENCE");
assert.equal(reconcileBuild446({...verified,resetCompletedAt:"2026-11-25T09:55:00Z"}).closure,"HOLD_MISSING_LIVE_RECOVERY_EVIDENCE");
assert.equal(reconcileBuild446({...verified,recoveryLastEvent:"bounced"}).closure,"HOLD_MISSING_LIVE_RECOVERY_EVIDENCE");
assert.equal(reconcileBuild446({...verified,originalOwnerRole:false}).closure,"HOLD_MISSING_LIVE_RECOVERY_EVIDENCE");
assert.equal(reconcileBuild446({...verified,hasCredential:false}).closure,"HOLD_MISSING_LIVE_RECOVERY_EVIDENCE");
assert.equal(reconcileBuild446({...verified,originalEmailVerified:false}).closure,"HOLD_MISSING_LIVE_RECOVERY_EVIDENCE");
assert.equal(reconcileBuild446(verified).automaticPasswordMutation,false);
console.log("Build 446 real verified-email, delivery receipt, reset token and new owner session closure checks passed.");

# AI Data Platform Build 416

**Original-Host Service Continuity, Reboot Witness & Independent Runtime Custody**

Build 416 is an evidence and custody release. It does not install or start a Windows worker, enable a cloud module intent, rotate a key/certificate, activate a receiver, control an actuator, or require a synchronized multi-application release.

## Independently reviewed current source

The Build 416 source review is pinned to these exact default-branch revisions:

- Rosevear AI Hub: `793faaed8498bc649ae9b48788474ae715675697`
- AI Data Platform: `319b718950ff48e5a8ca28fd82d03d2e56bf74ad`
- Rosevear Comms Hub: `904f1480d349b6ee508fd11221063d28cc35342e`

Hub PR #804 is merged, but current Hub main is newer and includes Build 356 / QL-465. The current source establishes these facts:

1. Hub implements an outbound client contract for `POST /internal/rosevear/master/events/read-only/v1`, using pinned TLS/mTLS and a signed peer `RECEIVED` ACK.
2. AI Data Platform has no exact receiving route at that path on the reviewed revision: **NOT IMPLEMENTED**.
3. Rosevear Comms Hub has no exact receiving route at that path on the reviewed revision: **NOT IMPLEMENTED**.
4. Hub source names intended SCM services `Rosevear-AIDataPlatform`, `Rosevear-AIHub`, and `Rosevear-CommsHub`.
5. Current Hub source reports those three Windows services as **NOT INSTALLED** on the original host and contains no SCM worker installer for them.
6. Build 356 provides only the two Hub unattended Scheduled Task installers. It explicitly does not install or start AI Data Platform/Comms workers.

Therefore sink adoption, real peer mTLS/ACK, Windows worker installation and physical 24/7 acceptance are **HOLD / NOT VERIFIED**.

## Service startup policy

The required startup mode for any separately authorized SCM worker is:

| Logical custody ID | Windows SCM name | Required mode |
| --- | --- | --- |
| rosevear-ai-hub-automation-host | Rosevear-AIHub | AUTOMATIC |
| rosevear-ai-data-platform-worker | Rosevear-AIDataPlatform | AUTOMATIC |
| rosevear-comms-hub-worker | Rosevear-CommsHub | AUTOMATIC |

This is the owner policy target, not evidence that any service is installed or configured. An accepted receipt must independently show the real service on `DESKTOP-AE894KC` with the exact SCM name and AUTOMATIC mode.

## Original-host receipt specification

For each of the three services, the protected evidence ledger requires:

- exact original host `DESKTOP-AE894KC`;
- logical custody ID and matching fixed SCM name;
- exact source revision;
- SHA-256 installer artifact, executable and opaque service-account identity digests;
- distinct pre-boot and post-boot evidence digests plus one boot session ID;
- installed service and AUTOMATIC startup mode;
- Windows recovery policy verified;
- unattended start before interactive logon;
- post-boot RUNNING observation without manual intervention;
- at least ten-minute continuity and independent 24-hour continuity;
- rollback-to-prior-configuration readiness;
- owner startup-mode approval receipt;
- distinct independent custodian and independent boot-witness receipts;
- expiry and VERIFIED state.

No raw account name, password, private key, certificate value, absolute private path or environment secret belongs in this ledger.

## Independent peer ACK specification

Each AI Data Platform and Comms peer receipt must prove:

- exact read-only route adoption;
- protocol 1.1;
- separately enrolled mTLS client certificate and peer signer;
- TLS chain/hostname and pinned peer leaf verification;
- real mTLS handshake;
- fresh signed `RECEIVED` ACK bound to the event digest;
- durable replay protection;
- no-command, receipt-only sink behavior;
- source authority preserved and no direct peer database write;
- fresh independently verified evidence.

A historical signed sink package or a source document does not prove a current live connection.

## Certificate overlap and re-enrollment

A completed rotation receipt requires:

- owner-plan digest;
- distinct previous and candidate leaf-pin digests;
- overlap of no more than 24 hours;
- old credential retained during the overlap for rollback;
- candidate handshake verified;
- peer re-enrolled to the candidate;
- a fresh signed ACK under the candidate identity;
- old credential retired only after acceptance;
- rollback readiness during the overlap;
- no automatic certificate activation.

Build 416 does not perform the rotation.

## Rollback and continuity expectations

A failed boot ceremony or peer re-enrollment remains HOLD. Preserve the last known working configuration while the candidate is being tested. Do not remove the previous credential or prior service configuration until the candidate has a valid signed peer ACK and independent acceptance. A 24-hour continuity claim requires a real post-reboot observation window; CI fixtures cannot satisfy it.

## Release boundary

Build 416 software may be Production GREEN while operational state remains HOLD / NOT VERIFIED. GREEN proves only the software release, migration and validation. It does not prove a Windows worker exists, started before logon, survived reboot, ran for 24 hours, reached a peer, or rotated a certificate.

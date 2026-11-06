# Build 297 — Cross-App Notification & Consent Service

## Purpose

Build 297 centralizes consent-aware notification preparation for the Rosevear application estate while keeping actual communications delivery behind a later explicit authorization boundary.

It reuses the Build 286 shared contract:

- `rosevear.shared.notification.v1`

Rosevear Comms Hub is recorded as the preferred communications operator.

## Consent evidence

Workspace owners/admins may append channel-specific consent evidence for:

- email;
- SMS;
- push;
- in-app;
- voice.

Evidence records the canonical tenant, customer record, channel, permission state, basis, source application/record, observed time and optional expiry.

Consent history is append-only. The newest evidence for the exact tenant/customer/channel scope is used when a notification request is prepared.

States are:

- `granted`;
- `denied`;
- `revoked`;
- `unknown`.

Missing, denied, revoked, mismatched or expired consent fails closed.

## Notification requests

A request records:

- source application and source record;
- canonical tenant and customer record;
- channel;
- template key;
- consent basis;
- requested and optional scheduled time;
- optional subject;
- bounded content summary;
- Build 286 portable notification contract record.

Every request is created with:

- `state = held`;
- `hold_reason = notification-dispatch-not-authorized`;
- `operator_application_id = rosevear-comms-hub`.

Build 297 performs no provider API call and no outbound network request.

## Review

Owners/admins may approve or reject a held request with an immutable review reason.

Approval is permitted only when the latest consent evidence is granted for the exact tenant/customer/channel scope.

Approval means only:

- suitable for a future governed Comms Hub handoff.

Approval does **not**:

- send email;
- send SMS;
- place voice calls;
- send push notifications;
- create in-app messages in another application;
- call Rosevear Comms Hub;
- call a communications provider;
- release the request from `held`.

## Delivery evidence

The database can retain append-only evidence describing either:

- `not-dispatched`; or
- `external-evidence-only`.

This lets later controlled workflows reconcile externally observed delivery evidence without claiming Build 297 performed the send.

## Database evidence

Migration `0100_cross_app_notification_consent.sql` adds:

- `app.notification_consent_evidence`;
- `app.notification_requests`;
- `app.notification_request_reviews`;
- `app.notification_delivery_evidence`;
- `app.notification_consent_audit`.

All tables use RLS. Runtime access is SELECT/INSERT only and UPDATE/DELETE are revoked.

## Operator surface

The authenticated `/notification-consent` console provides:

- consent evidence registration;
- consent-aware request preparation;
- held request review;
- Comms Hub preferred-operator readback;
- explicit no-dispatch policy readback.

The API is `/api/notification-consent`.

## Authorization boundary

Build 297 performs:

- no outbound network request;
- no provider API call;
- no Comms Hub API call;
- no peer-application write;
- no automatic dispatch;
- no request release;
- no QL-266 resumption.

QL-266 remains under its existing review/deferred/disconnected boundary.

## Next build

**Build 298 — Shared Tasks, Follow-Ups & Work Queue Exchange**.

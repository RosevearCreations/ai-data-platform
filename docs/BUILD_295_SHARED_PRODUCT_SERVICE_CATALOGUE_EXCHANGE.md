# Build 295 — Shared Product, Service & Catalogue Exchange

## Purpose

Build 295 standardizes maker, service and campground catalogue records before any future cross-application transport.

The build reuses the declarative Build 286 contracts rather than inventing a second product/service schema:

- `rosevear.shared.product.v1` for products;
- `rosevear.shared.service.v1` for services, packages, add-ons, campsites, amenities and rentals.

The source application remains authoritative. AI Data Platform stores normalized snapshots and exchange evidence only.

## Supported business applications

Build 295 accepts catalogue source and destination identities for:

- Devil n Dove;
- Rosie Dazzlers;
- Yard Workers;
- iCamp.

Rosevear Comms Hub and Rosevear AI Hub are not treated as product/service catalogue systems in this build.

## Normalization

A normalized source snapshot retains explicit provenance:

- source application;
- canonical tenant key;
- source record ID and optional version;
- item kind;
- Build 286 contract ID/version;
- portable contract record;
- SHA-256 content digest.

Product records may carry SKU, name, description, category, status and CAD unit price.

Service-family records may carry name, description, category, status, CAD starting price, duration and service-area labels.

Build 295 deliberately does not add image/media fields to the exchange workflow. Shared media references are the responsibility of Build 296.

## Exchange packages

An owner/admin may prepare a destination package from a normalized source snapshot.

The package binds:

- source application/tenant/record;
- destination application/tenant;
- item kind;
- shared contract ID/version;
- normalized portable record;
- SHA-256 package digest.

The source and destination applications must differ.

Every package is written as:

- `state = held`;
- `hold_reason = catalogue-exchange-not-authorized`.

There is no release transition in Build 295.

## Review

Each package may receive one immutable owner/admin review:

- `approve` means the normalized package is suitable for possible future transport;
- `reject` means the package is not suitable.

Approval does **not** dispatch the package and does not alter the held package state.

## Database evidence

Migration `0098_shared_catalogue_exchange.sql` adds:

- `app.catalogue_exchange_items`;
- `app.catalogue_exchange_packages`;
- `app.catalogue_exchange_reviews`;
- `app.catalogue_exchange_audit`.

All four tables use RLS. Runtime access is SELECT/INSERT only. The compact integration database gate verifies all Build 295 tables and migration 0098.

## Operator surface

The authenticated `/catalogue-exchange` console provides:

- normalized source catalogue intake;
- product/service contract standing;
- held destination package preparation;
- approve/reject review;
- explicit transport-boundary readback.

The API is `/api/catalogue-exchange`.

## Authorization boundary

Build 295 performs:

- no peer-application write;
- no outbound HTTP request;
- no automatic dispatch;
- no QL-337 product/service payload delivery;
- no connection activation.

QL-266 remains:

- `UNDER_REVIEW`;
- external test `REVIEW_DEFERRED`;
- connection `DISCONNECTED`.

External requests remain 0 and live exchanges remain 0.

## Next build

**Build 296 — Shared Media & Asset Exchange**.

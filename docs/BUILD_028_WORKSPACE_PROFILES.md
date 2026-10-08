# Build 028 — Configurable Workspace Types & Domain Profiles

Build 028 separates stable workspace identity from reusable domain behavior.

## Built-in profiles

- rosie-detailing — existing Rosie Dazzlers competitive intelligence;
- maker-commerce — existing Devil n Dove supplier/inventory intelligence;
- personal-media — existing Personal movie/media metadata;
- generic-business — conservative new business domain;
- generic-personal — conservative new personal domain.

## Profile configuration

Each profile owns normalization fields, review dimensions, provenance policy, history policy, explicit-review policy, a default extraction template and capability flags for history, source governance, scheduling, remote execution, barcode intake and business integration.

Custom profiles default with only history/source-policy enabled. Human approval remains mandatory and automatic downstream writes remain disabled.

## Lifecycle

Owners/admins can create and edit custom profiles, archive them, create a workspace from any visible active profile, edit workspace name/purpose and archive workspaces. Built-in profiles cannot be edited or archived.

## Compatibility

Existing workspace IDs and slugs do not change. The compatibility business/personal type remains. The three seeded workspaces are migrated to explicit specialized profiles, so existing modules retain behavior while future workspaces no longer require hard-coded slug additions.

## Isolation

Profile visibility and mutation use RLS. Workspace data continues to use existing workspace RLS. New workspace creation uses an explicit security-definer function so workspace + owner membership are created atomically without broadening runtime insert permissions.

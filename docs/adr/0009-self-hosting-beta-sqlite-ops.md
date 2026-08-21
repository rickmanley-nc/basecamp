# ADR 0009: Self-Hosting Beta Uses SQLite With Operational Guardrails

Date: 2026-08-21

## Status

Accepted for M6. Qualified by
[ADR 0010: Production Deployment Targets And Profiles](./0010-production-deployment-targets.md).

## Context

Basecamp's long-term self-hosted production target remains PostgreSQL, but the
current application persistence layer is implemented on Node's built-in SQLite
module. M6 needs an installable beta that operators can run, back up, restore,
upgrade, and validate without pretending the PostgreSQL adapter already exists.

## Decision

The M6 self-hosting beta runs the web app, API server, reverse proxy, persistent
SQLite database volume, persistent evidence/storage volume, and backup service
through Docker Compose. Compose is the M6 reference single-node deployment
adapter, not the long-term production architecture.

The server keeps using SQLite for M6. The Compose stack treats the SQLite file
and storage directory as persistent operational data, and the backup/export
helpers include database, storage, config, version, seed/content version,
structured JSON, CSV exports, and evidence references.

## Consequences

- The beta is honest and runnable with the code that exists today.
- Operators get a real deployment, backup, restore, health, export, import, and
  upgrade runbook.
- PostgreSQL remains the hardening path for a later milestone rather than a
  partially wired service in M6.
- Backup and export validation can run in CI/local tests without needing a
  separate database server.

## Security Boundary

M6 protects administrative operations with a shared admin token and documents
VPN or secure reverse proxy access for remote use. Full user authentication and
multi-user authorization are still future work.

## Migration Path

Introduce a PostgreSQL adapter after the domain model and operational backup
contract settle. The portable JSON/CSV export and import baseline created in M6
is the migration bridge from SQLite beta deployments to future PostgreSQL
deployments. v1.0 planning makes cloud pilot the MVP deployment target and
keeps later homelab data separated unless the admin explicitly exports/imports
data between profiles.

# ADR 0010: Production Deployment Targets And Profiles

Date: 2026-08-21

## Status

Accepted for v1.0 planning.

## Context

Basecamp's first installable self-hosting beta uses Docker Compose because M6
needed a concrete single-host runbook. That should not make Compose the product
architecture.

The intended real deployment shape is broader:

- A homelab primary deployment on an admin-controlled home network.
- A cloud pilot deployment for testing with real users outside local developer
  machines.
- Local development environments for contributors.

These deployments have different trust, data, reliability, and reset
requirements. The architecture needs to support them without mixing real
homelab data with cloud pilot/test data.

## Decision

Basecamp will treat deployment orchestration as an adapter around a portable
application architecture.

The core production architecture is:

- Static web application artifact.
- Stateless API/sync server.
- Production database adapter, with PostgreSQL as the production target.
- Evidence/document storage abstraction, starting with filesystem storage and
  designed so S3-compatible object storage can be added without rewriting
  product workflows.
- Explicit migrations as part of release and upgrade flow.
- Reverse proxy/TLS boundary controlled by the deployment environment.
- Secrets supplied by the deployment environment, not committed to git.
- Health, readiness, audit, backup, restore, export, and import contracts that
  do not depend on one orchestrator.

Deployment profiles:

- `local-dev`: contributor machine, local SQLite, fast iteration, no production
  claims.
- `homelab`: single-node admin-controlled home network deployment, VPN or secure
  reverse proxy for remote access, durable backups, restore drills, and clear
  upgrade/rollback instructions.
- `cloud-pilot`: cloud server for testing with real users, isolated pilot data,
  stronger authentication expectations, reset/seed controls, logs/metrics, and
  no dependence on private homelab data.

Docker Compose remains the M6 and near-term single-node reference adapter. It is
allowed to run the homelab beta and a simple cloud pilot, but v1.0 readiness
must prove that app, database, storage, secrets, backup, restore, and reverse
proxy responsibilities are separable from Compose.

## Consequences

- Existing M6 Compose work remains useful as the reference single-node
  deployment.
- Compose files must not become the only place where production behavior is
  defined.
- v1.0 needs explicit work for PostgreSQL, storage abstraction, authentication,
  deployment profiles, cloud pilot isolation, and production-grade validation.
- Release notes and issue comments should identify which deployment profile was
  validated.
- Cloud pilot data must be treated as separate from homelab data unless an
  explicit export/import action is performed by the admin.

## Non-Goals

- Kubernetes is not required for v1.0.
- High availability is not required for the homelab target.
- Managed cloud services are not mandatory for normal operation.
- Compose is not removed; it is reclassified as a reference adapter.

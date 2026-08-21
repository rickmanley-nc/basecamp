# ADR 0010: Production Deployment Targets And Profiles

Date: 2026-08-21

## Status

Accepted for v1.0 planning.

## Context

Basecamp's first installable self-hosting beta uses Docker Compose because M6
needed a concrete single-host runbook. That should not make Compose the product
architecture.

The intended real deployment shape is broader:

- A cloud pilot deployment for the v1 MVP, used by the admin and one trusted
  friend with real user data.
- A later homelab primary deployment on an admin-controlled home network.
- Local development environments for contributors.

These deployments have different trust, data, reliability, and reset
requirements. The architecture needs to support them without mixing real
cloud pilot data with future homelab data.

The current v1 MVP target is an x86_64/amd64 server running Ubuntu 22.04 LTS
with 12 GB or 16 GB RAM. Ubuntu 22.04 LTS has standard security maintenance
through May 2027. Migration to Ubuntu 24.04 LTS is deferred until the admin
explicitly requests it. The first pilot users are the admin and one trusted
friend. The pilot should use real data, except where fake/demo data is needed
for CI, QA, or repeatable tests.

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
- `cloud-pilot`: v1 MVP server for testing with two real users, isolated pilot
  data, admin-created local accounts, username/password login, reset/seed
  controls for QA, logs/metrics, local-disk backups, and no SSO dependency.
- `homelab`: post-MVP single-node admin-controlled home network deployment,
  likely LAN-only with UniFi-managed IP, hostname, DNS, and routing. TLS should
  be added when this profile is brought online, especially for remote access.

The cloud pilot should be LAN/private-network only unless TLS is configured. If
it is reachable over the public internet, TLS is required before real user data
or passwords are used.

Docker Compose remains the M6 and near-term single-node reference adapter. It is
allowed to run the MVP cloud pilot and later homelab beta, but v1.0 readiness
must prove that app, database, storage, secrets, backup, restore, and reverse
proxy responsibilities are separable from Compose.

## Consequences

- Existing M6 Compose work remains useful as the reference single-node
  deployment.
- Compose files must not become the only place where production behavior is
  defined.
- v1.0 needs explicit work for PostgreSQL, storage hardening beyond the M7
  portability boundary, cloud pilot operations, physical iPhone testing, and
  production-grade validation.
- M7 provides the first cloud pilot local-auth baseline with admin-created
  username/password accounts and no SSO dependency.
- M8 records deployment profile metadata in backup manifests, restore results,
  and admin status so recovery evidence follows the same profile boundary.
- Release notes and issue comments should identify which deployment profile was
  validated.
- Cloud pilot data must be treated as separate from future homelab data unless an
  explicit export/import action is performed by the admin.

## Non-Goals

- Kubernetes is not required for v1.0.
- High availability is not required for the homelab target.
- Managed cloud services are not mandatory for normal operation.
- Compose is not removed; it is reclassified as a reference adapter.
- SSO is not part of v1.0 because it conflicts with eventual offgrid operation.

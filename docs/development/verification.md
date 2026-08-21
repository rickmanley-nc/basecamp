# Verification Policy

Last updated: 2026-08-21

This policy defines acceptable verification environments for Basecamp work. It
keeps milestone progress moving without pretending a local smoke test proves a
production install or a physical mobile field workflow.

The v1.0 release gate is defined in
[Basecamp v1.0 MVP Readiness](../product/v1-mvp-readiness.md). Use that
checklist when deciding whether validation is sufficient for a v1 blocker.

## Accepted Environments

Local machine:

- Acceptable for repository checks, unit tests, type checks, web/server local
  preview, seed import, local SQLite development, and early workflow smoke tests.
- Acceptable for Docker Compose config validation when the Docker Compose plugin
  is installed, because `docker compose ... config --quiet` does not prove a
  running deployment.
- Commands should be repo-relative and portable.
- Public notes must not include personal workstation paths.

Clean local environment:

- Acceptable when an issue needs a fresh checkout, clean database, local VM, or
  clean container state.
- Required when the acceptance criteria say a workflow must be followed from a
  fresh environment.

Homelab:

- Post-MVP target for real household data on an admin-controlled home network.
- Expected to use UniFi-managed IP assignment, hostname, DNS, and routing.
- Validation should eventually prove install, upgrade, backup, restore, LAN/VPN
  or secure reverse proxy access, TLS, SAN/NAS backup destination, and mobile
  pairing when those workflows are in scope.

Cloud pilot:

- v1 MVP target for testing with the admin and one trusted friend outside a
  local developer machine.
- Target host is an x86_64/amd64 server running Ubuntu 22.04 LTS with 12 GB or
  16 GB RAM.
- Ubuntu 22.04 LTS is accepted for v1 while it remains in standard security
  maintenance through May 2027. Migration validation for Ubuntu 24.04 LTS is
  deferred until the admin explicitly requests it.
- Should use real user data, except fake/demo data needed for CI, QA, and
  repeatable tests.
- Must use admin-created local username/password accounts and must not require
  SSO.
- Must use local disk backups for v1, with later SAN/NAS backup support planned
  for the homelab profile.
- Must have a documented reset/seed path.
- If reachable outside a LAN or private network, TLS is required before real
  data or passwords are used.
- PostgreSQL production-persistence validation may use the optional Compose
  `postgres` profile or an admin-provided PostgreSQL server. Record whether the
  validation covered migrations only, portable SQLite import, promoted API
  runtime behavior, runtime backup status, or restore drill proof.

Separate server:

- Acceptable when the admin provides access to a test server.
- Required for final self-hosting validation unless the issue explicitly allows a
  local VM or clean local container deployment.
- Server validation should use admin-controlled paths such as `/opt/basecamp`,
  `/etc/basecamp`, `/var/lib/basecamp`, and `/var/backups/basecamp`.

Physical iPhone:

- Required for iOS validation involving camera, QR/barcode scanning, iOS
  permissions, local build installation, local network access, offline behavior,
  notifications, and real device pairing.
- Simulator testing is acceptable for layout, navigation, pure domain logic, and
  early app-shell checks, but it does not replace physical device validation for
  field workflows.

Physical Android:

- Required for Android validation involving camera, QR/barcode scanning, APK or
  AAB installation, offline behavior, notifications, and real device pairing.
- Emulator testing is acceptable for layout, navigation, pure domain logic, and
  early app-shell checks, but it does not replace physical device validation for
  field workflows.

Physical iPhone and Android validation are both required for v1 field data
capture because the mobile experience is the primary way data will be added away
from a desk.

## Separate Server Access Checklist

When the admin provides a server, collect the operational facts needed to run the
test without embedding secrets in tracked files, issues, PRs, releases, or
comments:

- Linux distribution and version.
- CPU architecture.
- Available memory and disk.
- LAN address or DNS name.
- SSH access method and whether `sudo` is available.
- Whether Docker Engine and Docker Compose are already installed.
- Whether `docker compose --env-file <env-file> config --quiet` passes before
  starting services.
- Desired persistent data path.
- Desired backup path.
- Remote access stance: LAN-only, VPN, or reverse proxy.
- TLS/DNS constraints if remote access is in scope.
- Deployment profile: `homelab` or `cloud-pilot`.
- Whether data is real user data, fake/demo data, or disposable QA data.
- Whether cloud pilot data is isolated from future homelab data.
- Whether test data can be destroyed after validation.
- Whether `BASECAMP_QA_CONTROLS_ENABLED=true` is acceptable for a short reset
  or seed window, and whether a backup has been taken first.

Secrets, private keys, passwords, tokens, and one-time codes must be exchanged
through a secure channel chosen by the admin, not committed to the repo or
published in GitHub text.

## Mobile Device Test Checklist

When mobile testing is in scope, provide user-followable steps for the admin to
run on the required device platform:

- Required iOS or Android version.
- Install path: local Xcode development install, ad hoc, TestFlight after local
  archive upload, Android debug APK, Android release APK/AAB, stable release, or
  contributor development build.
- How to install or update the app.
- How to connect to the Basecamp server.
- How to pair or sign in.
- Which platform permissions are expected and why.
- What sample data or server state is needed.
- Exact test actions to perform.
- Expected result after each action.
- Offline test steps.
- Reconnect/sync verification steps.
- Where to report pass/fail notes and screenshots if needed.

## Validation Reporting

Every issue resolution comment should state where validation happened:

- Local machine.
- Clean local environment.
- Homelab.
- Cloud pilot.
- Separate server.
- Physical iPhone.
- Physical Android.
- Simulator.
- CI.

For backup/restore work, the resolution comment should also state the
deployment profile, release version, whether the manifest included admin config,
and whether the restore drill verified local users, inventory, evidence files,
reports, and admin status.

If the ideal environment is not available yet, say so directly and record the
follow-up milestone or issue that must complete real-device or real-server
validation.

For PostgreSQL persistence work, acceptable validation includes the
`PostgreSQL persistence and runtime validation` GitHub Actions job plus local or
cloud-pilot checks when the environment is available. Runtime work must include
the API smoke test, not only migration/import commands. Local validation
includes:

```bash
docker compose -f infra/compose.yml --profile postgres --env-file infra/basecamp.env.example config --quiet
pnpm ops:postgres:migrate
pnpm ops:postgres:status
pnpm ops:postgres:import
BASECAMP_DATABASE_KIND=postgresql pnpm test tests/postgres-server-runtime.test.ts
BASECAMP_DATABASE_KIND=postgresql pnpm ops:export
BASECAMP_DATABASE_KIND=postgresql pnpm ops:backup
BASECAMP_DATABASE_KIND=postgresql BASECAMP_USER_USERNAME=<user> BASECAMP_USER_PASSWORD=<password> pnpm ops:user:create
BASECAMP_DATABASE_KIND=postgresql BASECAMP_USER_USERNAME=<user> pnpm ops:user:disable
```

`pnpm ops:postgres:*` commands require `BASECAMP_DATABASE_URL` or
`DATABASE_URL`; PostgreSQL runtime commands also require that connection string.
Use a disposable PostgreSQL database for local checks unless the issue
explicitly targets the cloud pilot server.

For cloud-pilot QA reset/seed validation, local proof should exercise both the
admin API routes and the ops scripts against disposable data. Cloud-pilot proof
must record the deployment profile, database kind, whether evidence storage was
deleted, whether a backup existed first, and the cleanup or rollback action
performed. Do not close the v1 blocker from local-only validation when the issue
requires server proof.

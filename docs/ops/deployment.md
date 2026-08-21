# Basecamp Deployment Guide

Last updated: 2026-08-21

This guide is the operator runbook for installing the Basecamp server and web app
on an admin-controlled host.

## Current Status

Basecamp is not production-installable yet. The current repository supports a
local development preview with a Vite web app, Fastify server, and SQLite-backed
development database.

The self-hosted beta target is M6. M6 must produce a user-followable deployment
guide that installs the web app, API server, database, persistent storage,
reverse proxy, health checks, backups, restore drill, and upgrade path.

## Current Local Preview

Use this only for development and review. It does not include production auth,
PostgreSQL, container packaging, backup automation, TLS, or upgrade support.

Prerequisites:

- Node.js 24 or newer.
- pnpm 11 or newer.
- A shell on the machine running the preview.

Run from the repository root:

```bash
pnpm install
pnpm --filter @basecamp/database db:reset
```

Start the API server:

```bash
pnpm --filter @basecamp/server dev
```

Start the web app in a second terminal:

```bash
pnpm --filter @basecamp/web dev
```

Open:

- Web: `http://127.0.0.1:4318`
- API health: `http://127.0.0.1:4317/health`

## Self-Hosted Beta Target

The M6 deployment must be installable by following a release guide, without
needing to infer hidden development steps from the repository.

Required services:

- Web app.
- API/sync server.
- PostgreSQL database.
- Persistent file storage for evidence, photos, documents, exports, and backups.
- Reverse proxy.
- Backup job.
- Health checks for web, server, database, storage, migrations, and backup
  freshness.

Required admin-controlled paths:

- `/opt/basecamp` for release assets.
- `/etc/basecamp` for configuration.
- `/var/lib/basecamp` for persistent application data.
- `/var/backups/basecamp` for local backups.

Expected release artifacts:

- Container images or a documented image source.
- `compose.yml`.
- `.env.example`.
- Migration command.
- Backup command.
- Restore command.
- Upgrade and rollback instructions.

## Target Server Install Runbook

M6 should turn this outline into verified commands:

1. Prepare a Linux host with a stable LAN address or DNS name.
2. Install Docker Engine and the Docker Compose plugin from the official Docker
   documentation.
3. Create `/opt/basecamp`, `/etc/basecamp`, `/var/lib/basecamp`, and
   `/var/backups/basecamp`.
4. Download or copy the Basecamp release bundle into `/opt/basecamp`.
5. Copy `.env.example` to `/etc/basecamp/basecamp.env`.
6. Configure public URL, server URL, database credentials, storage paths, backup
   paths, and secret values in `/etc/basecamp/basecamp.env`.
7. Start services with Docker Compose.
8. Run migrations.
9. Confirm health checks pass.
10. Open the web app from a browser on the local network.
11. Configure remote access only through the documented VPN or secure reverse
    proxy path.
12. Run the first backup.
13. Complete a restore drill before trusting the installation.

## Required Release Validation

A self-hosting release cannot close its milestone until these are verified:

- Fresh install from the release artifacts.
- App loads without internet access after images/assets are present.
- API health check passes.
- Web can reach the API.
- Database migrations run idempotently.
- Persistent data survives container restart.
- Backup completes and passes integrity checks.
- Restore drill succeeds from a fresh deployment.
- Upgrade path includes backup-before-upgrade and rollback guidance.
- Public instructions contain no personal workstation paths.

## External References

- [Docker Engine install documentation](https://docs.docker.com/engine/install/)
- [Docker Compose documentation](https://docs.docker.com/compose/)

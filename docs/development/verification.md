# Verification Policy

Last updated: 2026-08-21

This policy defines acceptable verification environments for Basecamp work. It
keeps milestone progress moving without pretending a local smoke test proves a
production install or an iPhone field workflow.

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

Separate server:

- Acceptable when the admin provides access to a test server.
- Required for final self-hosting validation unless the issue explicitly allows a
  local VM or clean local container deployment.
- Server validation should use admin-controlled paths such as `/opt/basecamp`,
  `/etc/basecamp`, `/var/lib/basecamp`, and `/var/backups/basecamp`.

Physical iPhone:

- Required for mobile validation involving camera, QR/barcode scanning, iOS
  permissions, TestFlight or stable installation, local network access, offline
  behavior, notifications, and real device pairing.
- Simulator testing is acceptable for layout, navigation, pure domain logic, and
  early app-shell checks, but it does not replace physical device validation for
  field workflows.

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
- Whether test data can be destroyed after validation.

Secrets, private keys, passwords, tokens, and one-time codes must be exchanged
through a secure channel chosen by the admin, not committed to the repo or
published in GitHub text.

## Mobile Device Test Checklist

When mobile testing is in scope, provide user-followable steps for the admin to
run on an iPhone:

- Required iOS version.
- Install channel: TestFlight, stable release, or contributor development build.
- How to install or update the app.
- How to connect to the Basecamp server.
- How to pair or sign in.
- Which iOS permissions are expected and why.
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
- Separate server.
- Physical iPhone.
- Simulator.
- CI.

If the ideal environment is not available yet, say so directly and record the
follow-up milestone or issue that must complete real-device or real-server
validation.

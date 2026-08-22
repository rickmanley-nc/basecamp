# Basecamp iPhone Field Validation Report

Last updated: 2026-08-22

Use this report when validating Basecamp Mobile on a physical iPhone for the v1
cloud-pilot launch. Attach the completed report, or paste it as a GitHub issue
comment, to the relevant v1 issues:

- #75 for the local iPhone build and install path.
- #76 for mobile field capture, offline sync, and evidence upload.
- #77 for physical iPhone field validation.
- #93 for the mobile-first local quest onboarding gate.

Use the same report format across issues #75, #76, #77, and #94 so each issue
has a specific progress or resolution comment instead of only a linked PR.

This report is intentionally public-safe. Do not include passwords, tokens,
private hostnames, private IP addresses, pairing secrets, phone-local file URIs,
device identifiers, or screenshots that reveal household preparedness-sensitive
details. Use descriptions such as `LAN`, `VPN`, `secure remote`, or
`cloud-pilot` instead of publishing private infrastructure values.

## Preflight

Before starting the test:

- Confirm the cloud-pilot server is reachable from Safari on the iPhone.
- Confirm a pilot local username/password account exists.
- Confirm a server backup exists before testing destructive sync, reset, or user
  disable behavior.
- Confirm the Basecamp Mobile version/build and install channel.
- Confirm screenshots are either unnecessary or can be redacted before posting.

## Report Template

```markdown
## Physical iPhone Validation

- Date:
- Tester:
- iPhone model:
- iOS version:
- Basecamp Mobile version/build:
- Install channel:
- Server URL mode:
- Deployment profile:
- Database kind:
- Backup confirmed before test: yes/no

Do not include passwords, tokens, private hostnames, private IPs, pairing secrets, or phone-local file URIs.

| Area | Pass/Fail | Scope | Notes |
| --- | --- | --- | --- |
| Install |  | physical-iphone; issues #75, #77, #93 | |
| First-run local quest |  | physical-iphone; issues #77, #93 | |
| Mobile/web bootstrap |  | physical-iphone; issues #76, #77, #94 | |
| Server URL |  | physical-iphone; issues #76, #77 | |
| Sign-in |  | physical-iphone; issues #76, #77 | |
| First sync |  | physical-iphone; issues #76, #77 | |
| Local Network |  | physical-iphone; issues #76, #77 | |
| Quick Capture online |  | physical-iphone; issues #76, #77 | |
| Evidence photo |  | physical-iphone; issues #76, #77 | |
| Evidence document |  | physical-iphone; issues #76, #77 | |
| Basecamp QR scan |  | physical-iphone; issues #76, #77 | |
| Barcode scan |  | physical-iphone; issues #76, #77 | |
| Offline cache |  | physical-iphone; issues #76, #77 | |
| Offline queue restart |  | physical-iphone; issues #76, #77 | |
| Reconnect sync |  | physical-iphone; issues #76, #77 | |
| Conflict visibility |  | physical-iphone; issues #76, #77 | |
| Sign-out |  | physical-iphone; issues #76, #77 | |
| Lost device/user disable procedure |  | cloud-pilot; issues #75, #77 | |

## Follow-Ups

- Blockers:
- Bugs:
- Documentation gaps:
- Screenshots attached: yes/no
```

## Pass Criteria

| Area | Pass Criteria |
| --- | --- |
| Install | App installs, opens without crashing, and shows the mobile-first Basecamp onboarding flow. |
| First-run local quest | The app does not require server sign-in, persists the selected quest locally, and queues quest progress offline. |
| Mobile/web bootstrap | Mobile-start quest progress uploads with a stable quest ID; web-start active quests refresh after sign-in; duplicate starter progress is accepted idempotently or shown as a visible conflict. |
| Server URL | URL is accepted from the optional Sync path; invalid URLs show a clear error and do not save credentials. |
| Sign-in | Sign-in succeeds; password field clears; token is stored securely; Home refreshes from the server. |
| First sync | Home, Quests, Inventory, and Offline screens show server-backed data or an explicit empty state. |
| Local Network | LAN/private server sync works after permission is granted. If denied, the failure is understandable. |
| Quick Capture online | Command appears in the outbox, sync attempts, and the server accepts it or shows a conflict. |
| Evidence photo | Permission prompt appears when expected; upload succeeds or stays retryable; no phone-local URI appears in server metadata. |
| Evidence document | Document picker opens, upload succeeds or gives a clear actionable retry state. |
| Basecamp QR scan | Asset workflow appears with inspect, maintain, move, adjust quantity, report issue, and instructions actions. |
| Barcode scan | Inventory confirmation appears with barcode context, quantity, location, and notes fields. |
| Offline cache | Previously synced data remains visible enough for field use, including the Offline cached-data snapshot; online-only failures do not erase cached data. |
| Offline queue restart | Pending commands survive app restart and remain visible in Offline/outbox state. |
| Reconnect sync | Pending commands upload idempotently or show a user-visible conflict; accepted commands are not duplicated. |
| Conflict visibility | Conflict explains what needs human review without exposing internal payloads or secrets. |
| Sign-out | The prior session is gone; protected server data requires sign-in again. |
| Lost device/user disable procedure | User disable guidance is understandable; no password or token is recorded publicly. |

## Evidence To Record

Record only public-safe facts:

- iPhone model and iOS version.
- Basecamp Mobile version/build and install channel.
- Server URL mode, deployment profile, and database kind.
- Backup confirmation before destructive checks.
- Permission prompt results for Local Network, Camera, Photos, and Documents.
- First-run category chosen, starter quest shown, and local queue result.
- Sync plan shown, mobile-start sync result, web-start refresh result, and
  duplicate or conflict result.
- Offline cached-data snapshot counts for active quests, inventory items,
  critical BOMs, maintenance, and references.
- Pass/fail result and short notes for each row.
- Accepted command count, conflict count, upload result, or evidence retry
  result when relevant.
- Bugs, blockers, and documentation gaps that should become follow-up issues.

## Source Of Truth

The typed checklist used by tests lives in `apps/mobile/src/validation.ts`.
When this report changes, update that source and the matching tests so the docs,
mobile package, and v1 gate stay aligned.

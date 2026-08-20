# ADR 0003: Local-First Self-Hosted Sync

Date: 2026-08-20

## Status

Accepted for initial implementation planning.

## Context

Preparedness software must remain useful during infrastructure failures.
Basecamp's mobile companion needs offline reference and offline write capture.
The self-hosted server remains the source of truth, but clients must keep
working when disconnected.

## Decision

Use a local-first client model with server authority:

- Clients store offline read models and a durable command outbox.
- Commands are idempotent and user-intent oriented.
- The server validates and accepts commands, updates source-of-truth state, and
  returns sync cursors.
- Routine conflicts use entity-specific merge rules.
- Ambiguous or high-risk conflicts become user-visible resolution tasks.

## Alternatives Considered

- Online-only mobile: simpler, but violates preparedness requirements.
- Full CRDT model for all data: powerful, but too complex for many structured
  preparedness workflows.
- Server overwrite on reconnect: simple, but risks losing field data.

## Consequences

- Offline capture becomes reliable.
- Domain commands need careful design.
- Sync tests become a first-class test category.

## Risks

- Conflict rules can become complicated.
- Photos/evidence need storage and retry behavior.
- Users may expect instant multi-device convergence.

## Migration Path

Start with command outbox and entity-specific merge policies. Introduce CRDTs
only for collaboration-heavy fields if real conflicts justify that complexity.

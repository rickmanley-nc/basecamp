# @basecamp/sync

Offline synchronization and conflict-resolution primitives.

Owns:

- Local change queue/outbox model.
- Conflict policy definitions.
- Sync metadata and replay rules.
- Client/server reconciliation helpers.

Routine actions should sync automatically. Ambiguous conflicts should be rare
and resolved with user-visible, plain-language choices.

# @basecamp/sync

Offline synchronization and conflict-resolution primitives.

Owns:

- Local change queue/outbox model.
- Deterministic Quick Capture command parsing.
- QR/barcode scan workflow mapping.
- Offline read model shape for mobile field use.
- Conflict policy definitions.
- Sync metadata and replay rules.
- Client/server reconciliation helpers.

Routine actions should sync automatically. Ambiguous conflicts should be rare
and resolved with user-visible, plain-language choices.

M4 command batches include client ID, local sequence, timestamp, entity version,
and user intent. The server is responsible for idempotent acceptance and cursor
assignment; this package owns the shared command and conflict vocabulary.

M5 persistence consumes `drill.record`, `skill.record`, and `evidence.attach`
commands so offline field validation can become drill runs, skill training
records, and linked evidence after sync.

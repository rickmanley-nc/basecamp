# @basecamp/ui

Basecamp-owned UI system and Kaizen adapter boundary.

Responsibilities:

- Wrap Kaizen primitives where Basecamp needs stable semantics, variants, accessibility behavior, or vendor isolation.
- Export Basecamp design tokens, themes, and approved composed components.
- Host custom Basecamp visuals such as progress maps, readiness gauges, quest nodes, and outpost badges.
- Keep application feature code from depending directly on Kaizen package internals.

Initial Kaizen package checked on 2026-08-20:

- `@nvidia/foundations-react-core@1.7.0`
- Apache-2.0
- Unstyled React primitives
- React peer dependencies: `^18.0.0 || ^19.0.0`
- CLI bin: `kui-sync-skills`

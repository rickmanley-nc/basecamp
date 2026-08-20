# ADR 0002: Basecamp UI Kaizen Adapter

Date: 2026-08-20

## Status

Accepted for initial implementation planning.

## Context

Basecamp has a strong preference for NVIDIA Kaizen UI Foundations as the primary
web UI foundation. At the same time, Basecamp must develop its own product
identity and avoid direct vendor coupling throughout feature code.

## Decision

Create `packages/ui` as the Basecamp-owned UI package. Web feature code imports
Basecamp components from `@basecamp/ui`. The UI package may wrap
`@nvidia/foundations-react-core` primitives where Basecamp needs stable
semantics, variants, accessibility behavior, styling, repeated composition, or a
vendor isolation boundary.

## Alternatives Considered

- Direct Kaizen imports in `apps/web`: fastest early, but high vendor coupling.
- Fully custom UI system: maximum control, but ignores the Kaizen requirement and
  creates unnecessary design-system work.
- Wrap every primitive: consistent import surface, but lots of low-value
  abstraction.

## Consequences

- Feature code gets a stable Basecamp UI API.
- Kaizen upgrades are centralized.
- Custom Basecamp visuals can share theme and accessibility foundations.

## Risks

- Adapter layer can become too broad or too thin.
- CSS/token licensing needs careful review.
- Developers may bypass the boundary without lint rules.

## Migration Path

If Kaizen changes or is replaced, update `packages/ui` adapters and theme
implementation while preserving feature imports where possible.

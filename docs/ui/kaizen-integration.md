# Kaizen UI Integration

Last updated: 2026-08-20

Basecamp has a strong preference for NVIDIA Kaizen UI Foundations as the primary
web UI foundation. Kaizen is an architectural dependency, not a cosmetic theme.

## Current Package Metadata

Checked on 2026-08-20:

- Package: `@nvidia/foundations-react-core`
- Version: `1.7.0`
- License: Apache-2.0
- Description: unstyled React implementation of Kaizen UI Foundations
- Peer dependencies: React `^18.0.0 || ^19.0.0`, React DOM `^18.0.0 || ^19.0.0`
- CLI bin: `kui-sync-skills`

## Dependency Boundary

Feature code must not import Kaizen directly.

```text
apps/web
  -> @basecamp/ui
    -> @nvidia/foundations-react-core
```

`packages/ui` owns:

- Kaizen primitive adapters.
- Basecamp-specific component variants.
- Theme and token exports.
- Accessibility defaults.
- Component composition.
- Custom Basecamp visuals.
- Upgrade and replacement boundary.

## Wrapper Rules

Wrap a Kaizen primitive when Basecamp needs:

- Stable product semantics.
- Basecamp-specific variants.
- Repeated composition.
- Accessibility defaults.
- Styling or token composition.
- Insulation from vendor API changes.

Do not wrap:

- Every trivial primitive by default.
- One-off layout elements with no product semantics.
- Kaizen internals just to rename imports.

## Styling Rules

Kaizen should own supported design-system concerns:

- Component primitives.
- Typography foundations.
- Form controls.
- Interaction states.
- Accessibility behavior.
- Token conventions.

Basecamp owns:

- Product identity.
- Progress maps.
- Readiness gauges.
- Quest nodes.
- Badge and capability outpost visuals.
- Category visual identities.
- Equipment status visualizations.

Utility CSS may be evaluated for layout, grid, flex, gaps, positioning, and
responsive composition. It should not become a competing visual design system.

## Offline Asset Rules

Normal operation cannot depend on:

- CDN CSS.
- CDN fonts.
- Remote icon sets.
- Remote image assets.
- SaaS-only UI dependencies.

Required assets must be bundled into the Basecamp web build. Licensing must be
reviewed before redistributing NVIDIA-branded or proprietary assets.

## CSS Strategy

Because `@nvidia/foundations-react-core` is unstyled, Basecamp must explicitly
select and document the CSS/token source used with it.

Candidate paths:

1. Use a compatible Kaizen external stylesheet if the installed package set
   provides one with redistributable licensing.
2. Use Kaizen-compatible tokens plus Basecamp-authored CSS in `packages/ui`.
3. Add a utility layout layer while keeping visual tokens governed by
   `packages/ui`.

The selected path must document:

- Imported CSS files.
- Asset origins.
- License constraints.
- Bundle location.
- Override policy.
- Upgrade checks.

## Component Catalog

Create a catalog before broad feature implementation.

Initial components:

- Button
- IconButton
- TextInput
- TextArea
- Select
- Checkbox
- Switch
- Tabs
- Dialog
- Drawer
- Toast/notification
- StatusBadge
- ProgressRing
- ReadinessGauge
- QuestCard
- QuestNode
- CategoryLevelPill
- OutpostBadge
- MaintenanceDueItem
- EvidenceCapture

Each component entry should include:

- Purpose.
- Source primitive.
- Accessibility behavior.
- Variants.
- States.
- Example usage.
- Do and do-not guidance.

## M1 Adapter Status

M1 proves the integration boundary without building the full catalog.

- `@basecamp/ui` imports `@nvidia/foundations-react-core`.
- `apps/web` imports only `@basecamp/ui`.
- The initial `Button` adapter wraps the Kaizen Button primitive.
- `PageShell`, `Panel`, `StatusBadge`, `ProgressRing`, `Metric`, and
  `QuestListItem` are Basecamp-owned compositions.
- CSS is bundled from `@basecamp/ui/styles.css`; no CDN assets are required.

## Agent Guidance Sync

When Kaizen is installed in `packages/ui`, run:

```bash
pnpm exec kui-sync-skills
```

Commit generated guidance only after reviewing where the package writes it and
whether it is appropriate for this repository. Re-run during Kaizen upgrades.

## Upgrade Process

1. Confirm current npm package metadata.
2. Review release notes or changelog.
3. Update pinned dependency version.
4. Run unit, type, accessibility, and visual checks.
5. Run component catalog smoke tests.
6. Run `pnpm exec kui-sync-skills` when supported.
7. Update this document with version, CSS, asset, and migration notes.

## Risks

- Kaizen package APIs may change.
- CSS and token package choices may differ from the React core package.
- Licensing may restrict redistributing NVIDIA-specific assets.
- Direct imports from feature code could make later replacement painful.

## Mitigations

- Enforce `@basecamp/ui` import boundary.
- Keep Kaizen adapters small and explicit.
- Pin versions.
- Document CSS and asset provenance.
- Add lint rules once implementation begins.

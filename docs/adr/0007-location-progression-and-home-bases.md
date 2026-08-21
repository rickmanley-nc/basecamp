# ADR 0007: Location Progression And Home Bases

Status: Accepted

Date: 2026-08-21

## Context

M3 introduces inventory, assets, kits, locations, and QR tags. Basecamp already
uses outposts as category capability achievements, but users also need physical
places to progress toward outpost and home base readiness.

A household may track more than one meaningful place. A primary home, a family
member's house, a vehicle, a cabin, a cache, or a field site may each have a
different readiness level.

## Decision

Locations are first-class user-named entities with their own maturity
progression:

- known_location
- stash
- outpost
- basecamp
- home_base

Multiple locations may reach `home_base` maturity. Location maturity is derived
from inventory, kits, durable assets, maintenance, quests, evidence, drills, and
category readiness at that location.

Physical location outposts and gamified category outpost achievements are
separate concepts. They may link to each other when a validated category
capability exists at a specific place.

## Consequences

- A location can be named freely by the user while public docs use neutral
  examples.
- One place can be a Home Base while another remains a Known Location, Stash, or
  Outpost.
- Inventory, BOM, maintenance, QR tag, and readiness work in M3 must be scoped
  to locations.
- Reports should distinguish a global household gap from a location-specific
  gap.

## Alternatives Considered

- **Single home-only model.** Rejected because preparedness commonly spans more
  than one house, vehicle, cache, or support site.
- **Treat outpost only as a badge.** Rejected because users need physical places
  to mature from simple storage into operating bases.
- **Allow only one home base.** Rejected because multiple family or household
  bases can be valid and useful.

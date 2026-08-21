import { basecampSeed } from "@basecamp/content";
import {
  calculateLocationProgression,
  calculateNextMaintenanceDue,
  completeMaintenancePolicy,
  createAssetTag,
  rollupAcquisitionNeeds,
  type Asset,
  type InventoryItem,
  type InventoryLot,
  type Kit,
  type Location,
  type LocationReadiness,
  type MaintenancePolicy
} from "@basecamp/domain";
import { describe, expect, it } from "vitest";

const capabilityState = {
  owned: true,
  configured: true,
  tested: true,
  validated: true,
  maintained: true
};

describe("inventory, location progression, BOMs, maintenance, and tags", () => {
  it("lets multiple user-named locations independently mature to home base", () => {
    const locations: Location[] = [
      { id: "location-primary-home", name: "Primary Home", kind: "home", maturity: "known_location" },
      { id: "location-family-home", name: "Family Home", kind: "family_home", maturity: "outpost" }
    ];
    const items: InventoryItem[] = [
      item("item-water", "Stored water", "water"),
      item("item-food", "Stored food", "food"),
      item("item-radio", "Handheld radio", "communications"),
      item("item-generator", "Generator", "power")
    ];
    const lots: InventoryLot[] = locations.flatMap((location) =>
      items.map((inventoryItem, index) => ({
        id: `${location.id}-lot-${index}`,
        itemId: inventoryItem.id,
        locationId: location.id,
        quantity: 2,
        unit: "each",
        state: "located"
      }))
    );
    const assets: Asset[] = locations.map((location) => ({
      id: `${location.id}-asset-generator`,
      name: `${location.name} generator`,
      type: "power_asset",
      state: "in_service",
      locationId: location.id,
      categoryId: "power"
    }));
    const kits: Kit[] = locations.map((location) => ({
      id: `${location.id}-kit`,
      name: `${location.name} go-bag`,
      state: "in_service",
      locationId: location.id,
      categoryId: "evacuation"
    }));
    const readiness: LocationReadiness[] = locations.flatMap((location) => [
      {
        locationId: location.id,
        categoryId: "water",
        score: 90,
        status: "validated",
        sourceCapabilityOutpostId: "water-outpost"
      },
      {
        locationId: location.id,
        categoryId: "communications",
        score: 90,
        status: "validated",
        sourceCapabilityOutpostId: "communications-outpost"
      }
    ]);

    const progressions = locations.map((location) =>
      calculateLocationProgression({
        location,
        inventoryItems: items,
        inventoryLots: lots,
        assets,
        kits,
        readiness,
        maintenanceDue: [],
        activeMaintenancePolicyCount: 2
      })
    );

    expect(progressions.map((progression) => progression.maturity)).toEqual([
      "home_base",
      "home_base"
    ]);
    expect(progressions[0]?.previousMaturity).toBe("known_location");
    expect(progressions[1]?.linkedCapabilityOutpostIds).toContain("water-outpost");
  });

  it("derives acquisition needs from active quest BOMs and current inventory", () => {
    const emptyNeeds = rollupAcquisitionNeeds(
      basecampSeed,
      ["water-store-24-hour-drinking-water"],
      { items: [], lots: [] }
    );
    const substitutedNeeds = rollupAcquisitionNeeds(
      basecampSeed,
      ["water-store-24-hour-drinking-water"],
      {
        items: [
          {
            id: "item-commercial-sealed-water",
            name: "Commercial sealed water",
            type: "water_storage",
            categoryId: "water",
            state: "located",
            functionalRequirement: "commercial sealed water",
            unit: "gallon",
            capabilityState
          }
        ],
        lots: [
          {
            id: "lot-water",
            itemId: "item-commercial-sealed-water",
            locationId: "location-primary-home",
            quantity: 3,
            unit: "gallon",
            state: "located"
          }
        ]
      }
    );

    expect(emptyNeeds[0]).toMatchObject({
      functionalRequirement: "Potable drinking water storage",
      state: "need_to_purchase"
    });
    expect(substitutedNeeds[0]).toMatchObject({
      state: "substituted",
      matchedItemIds: ["item-commercial-sealed-water"]
    });
  });

  it("calculates recurring maintenance and creates failure follow-up context", () => {
    const policy: MaintenancePolicy = {
      id: "maintenance-policy-generator-run",
      name: "Generator run test",
      scopeType: "asset",
      assetId: "asset-generator",
      intervalCount: 1,
      intervalUnit: "month",
      active: true,
      nextDueAt: "2026-08-20T00:00:00.000Z"
    };
    const completion = completeMaintenancePolicy(policy, {
      now: "2026-08-21T00:00:00.000Z",
      outcome: "issue_found",
      notes: "Would not start."
    });

    expect(calculateNextMaintenanceDue(policy, "2026-08-21T00:00:00.000Z")).toBe(
      "2026-09-21T00:00:00.000Z"
    );
    expect(completion.policy.nextDueAt).toBe("2026-09-21T00:00:00.000Z");
    expect(completion.event.followUpQuestTitle).toBe("Resolve maintenance issue: Generator run test");
  });

  it("creates stable Basecamp asset tags without local machine paths", () => {
    const tag = createAssetTag({
      assetId: "asset-generator",
      now: "2026-08-21T00:00:00.000Z",
      baseUrl: "https://basecamp.example"
    });

    expect(tag.lookupPath).toBe("/assets/asset-generator");
    expect(tag.qrPayload).toBe("https://basecamp.example/assets/asset-generator");
    expect(tag.qrPayload).toMatch(/^https:\/\/basecamp\.example/);
  });
});

function item(id: string, name: string, categoryId: string): InventoryItem {
  return {
    id,
    name,
    type: "consumable_supply",
    categoryId,
    state: "located",
    unit: "each",
    capabilityState
  };
}

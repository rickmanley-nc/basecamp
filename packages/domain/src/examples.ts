import type {
  AccomplishmentTemplate,
  CapabilityStateSnapshot,
  EvidenceReference,
  InventoryItem,
  MaintenanceReference,
  QuestInstance
} from "./model";

export const configuredTestedValidatedMaintained: CapabilityStateSnapshot = {
  owned: true,
  configured: true,
  tested: true,
  validated: true,
  maintained: true
};

export const exampleRadioInventoryItem: InventoryItem = {
  id: "asset-handheld-radio-1",
  name: "Handheld radio",
  type: "communications_asset",
  categoryId: "communications",
  state: "validated",
  capabilityState: configuredTestedValidatedMaintained
};

export const exampleMaintenanceReference: MaintenanceReference = {
  assetId: "asset-handheld-radio-1",
  cadence: "monthly",
  nextDueBehavior: "auto_calculated",
  completionState: "tested"
};

export const exampleEvidenceReference: EvidenceReference = {
  kind: "drill-result",
  required: true,
  description: "Successful radio contact between two defined locations."
};

export const exampleAccomplishment: AccomplishmentTemplate = {
  id: "communications-two-location-test",
  title: "Test communication between two locations",
  categoryId: "communications",
  targetLevel: 2,
  taxonomy: ["test", "drill", "validation"],
  requiredStates: ["owned", "configured", "tested", "validated"],
  inventory: [
    {
      assetId: "asset-handheld-radio-1",
      categoryId: "communications",
      requiredState: "configured",
      quantity: 2
    }
  ],
  evidence: [exampleEvidenceReference],
  maintenance: [exampleMaintenanceReference],
  validation: "Successful contact is logged with locations, channel, time, and lesson notes."
};

export const exampleActiveQuest: QuestInstance = {
  id: "quest-instance-communications-radio-test",
  templateId: "communications-test-two-location-radio",
  status: "active",
  selectedByUser: true,
  categoryPursuitState: "active",
  progressPercent: 30,
  startedAt: "2026-08-20T00:00:00Z"
};

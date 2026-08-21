import {
  createAssetActionCommand,
  createCommandOutbox,
  createOfflineCommand,
  createScanWorkflow,
  enqueueCommand,
  markCommandFailed,
  parseQuickCapture,
  resolveOfflineCommandConflict,
  restoreOutbox,
  serializeOutbox
} from "@basecamp/sync";
import { describe, expect, it } from "vitest";

describe("offline sync and quick capture primitives", () => {
  it("parses deterministic quick capture examples without a SaaS dependency", () => {
    const inventory = parseQuickCapture("Bought four gallons of water", {
      clientId: "iphone-test",
      localSequence: 1,
      now: "2026-08-21T00:00:00.000Z"
    });
    const maintenance = parseQuickCapture("Changed generator oil", {
      clientId: "iphone-test",
      localSequence: 2,
      now: "2026-08-21T00:01:00.000Z"
    });
    const drill = parseQuickCapture("Ran evacuation drill", {
      clientId: "iphone-test",
      localSequence: 3,
      now: "2026-08-21T00:02:00.000Z"
    });
    const skill = parseQuickCapture("Practiced first aid", {
      clientId: "iphone-test",
      localSequence: 4,
      now: "2026-08-21T00:03:00.000Z"
    });
    const failure = parseQuickCapture("Generator failed to start", {
      clientId: "iphone-test",
      localSequence: 5,
      now: "2026-08-21T00:04:00.000Z"
    });
    const quest = parseQuickCapture("Completed Store 24-Hour Drinking Water", {
      clientId: "iphone-test",
      localSequence: 6,
      now: "2026-08-21T00:05:00.000Z"
    });

    expect(inventory.command.intent).toMatchObject({
      type: "inventory.adjust_quantity",
      itemName: "Water",
      quantityDelta: 4,
      unit: "gallons"
    });
    expect(maintenance.command.intent).toMatchObject({
      type: "maintenance.complete",
      policyId: "maintenance-policy-generator-oil"
    });
    expect(drill.command.intent).toMatchObject({ type: "drill.record", drillName: "Evacuation Drill" });
    expect(skill.command.intent).toMatchObject({ type: "skill.record", skillName: "First Aid" });
    expect(failure.command.intent).toMatchObject({ type: "failure.report", subject: "Generator" });
    expect(quest.command.intent).toMatchObject({
      type: "quest.set_status",
      questTitle: "Store 24-hour Drinking Water",
      action: "complete"
    });
  });

  it("turns QR and barcode scans into mobile workflows", () => {
    const qr = createScanWorkflow({
      kind: "qr",
      value: "https://basecamp.example/assets/asset-backup-generator"
    });
    const barcode = createScanWorkflow(
      { kind: "barcode", value: "012345678905" },
      {
        clientId: "iphone-test",
        localSequence: 1,
        now: "2026-08-21T00:00:00.000Z"
      }
    );
    const action = createAssetActionCommand("asset-backup-generator", "report_issue", {
      clientId: "iphone-test",
      localSequence: 2,
      now: "2026-08-21T00:01:00.000Z",
      notes: "Would not start"
    });

    expect(qr).toMatchObject({
      target: "asset",
      assetId: "asset-backup-generator",
      offlineBehavior: "open_cached_asset"
    });
    expect(qr.availableAssetActions).toEqual([
      "inspect",
      "maintain",
      "move",
      "adjust_quantity",
      "report_issue",
      "view_instructions"
    ]);
    expect(barcode).toMatchObject({
      target: "inventory_barcode",
      barcode: "012345678905",
      offlineBehavior: "queue_inventory_confirmation"
    });
    expect(action.intent).toMatchObject({
      type: "asset.report_issue",
      assetId: "asset-backup-generator"
    });
  });

  it("serializes a durable command outbox and tracks retry state", () => {
    const initial = createCommandOutbox("iphone-test");
    const enqueued = enqueueCommand(
      initial,
      {
        entityType: "inventory",
        intent: {
          type: "inventory.adjust_quantity",
          source: "manual",
          itemName: "Water",
          quantityDelta: 1
        }
      },
      "2026-08-21T00:00:00.000Z"
    );
    const restored = restoreOutbox(serializeOutbox(enqueued.outbox));
    const failed = markCommandFailed(
      restored,
      enqueued.queued.command.commandId,
      "offline",
      "2026-08-21T00:01:00.000Z"
    );

    expect(restored.nextSequence).toBe(2);
    expect(restored.queued[0]?.command).toMatchObject({
      clientId: "iphone-test",
      localSequence: 1
    });
    expect(failed.queued[0]).toMatchObject({
      status: "failed",
      retryCount: 1,
      lastError: "offline"
    });
  });

  it("models idempotency and entity-specific conflict policies", () => {
    const inventory = createOfflineCommand({
      clientId: "iphone-test",
      localSequence: 1,
      createdAt: "2026-08-21T00:00:00.000Z",
      entityType: "inventory",
      entityId: "item-water",
      entityVersion: 1,
      intent: {
        type: "inventory.adjust_quantity",
        source: "manual",
        itemId: "item-water",
        quantityDelta: 2
      }
    });
    const quest = createOfflineCommand({
      clientId: "iphone-test",
      localSequence: 2,
      createdAt: "2026-08-21T00:01:00.000Z",
      entityType: "quest",
      entityId: "water-store-24-hour-drinking-water",
      entityVersion: 1,
      intent: {
        type: "quest.set_status",
        questId: "water-store-24-hour-drinking-water",
        action: "complete"
      }
    });

    expect(resolveOfflineCommandConflict(inventory, { currentEntityVersion: 2 })).toMatchObject({
      outcome: "accepted",
      policy: "merge_additive_inventory_quantity",
      userVisible: false
    });
    expect(resolveOfflineCommandConflict(quest, { currentEntityVersion: 2 })).toMatchObject({
      outcome: "conflict",
      policy: "user_visible_conflict",
      userVisible: true
    });
    expect(resolveOfflineCommandConflict(inventory, { duplicateCommandIds: [inventory.commandId] })).toMatchObject({
      outcome: "duplicate",
      policy: "idempotent_duplicate"
    });
  });
});

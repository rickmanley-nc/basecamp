import {
  apiRoutes,
  createDashboardSummary,
  type DashboardSummary,
  type QuickInventoryEntryRequest,
  type QuestActionRequest
} from "@basecamp/api";
import { basecampSeed } from "@basecamp/content";
import type { PursuitState } from "@basecamp/domain";
import {
  Button,
  Metric,
  PageShell,
  Panel,
  ProgressRing,
  QuestListItem,
  StatusBadge
} from "@basecamp/ui";
import React, { useEffect, useMemo, useState } from "react";

export const fallbackDashboardSummary = createDashboardSummary(basecampSeed);

const pursuitOptions: Array<{
  label: string;
  state: PursuitState;
}> = [
  { label: "Active", state: "active" },
  { label: "Interested", state: "interested" },
  { label: "Later", state: "later" },
  { label: "Paused", state: "paused" },
  { label: "Not now", state: "not_currently_pursuing" }
];

type QuickInventoryType = NonNullable<QuickInventoryEntryRequest["type"]>;

const inventoryTypeOptions: Array<{
  label: string;
  value: QuickInventoryType;
}> = [
  { label: "Supply", value: "consumable_supply" },
  { label: "Water", value: "water_storage" },
  { label: "Food", value: "food_storage" },
  { label: "Fuel", value: "fuel" },
  { label: "Tool", value: "tool" },
  { label: "Power asset", value: "power_asset" },
  { label: "Radio", value: "communications_asset" },
  { label: "Kit", value: "kit" }
];

export interface AppProps {
  summary?: DashboardSummary;
}

export function App({ summary = fallbackDashboardSummary }: AppProps) {
  const [dashboard, setDashboard] = useState(summary);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    summary.criticalGaps[0]?.categoryId ?? summary.categories[0]?.id ?? "water"
  );
  const [statusMessage, setStatusMessage] = useState("Ready");
  const [inventoryForm, setInventoryForm] = useState({
    itemName: "",
    quantity: "1",
    unit: "each",
    locationName: "Primary Home",
    categoryId: summary.categories[0]?.id ?? "water",
    type: "consumable_supply" as QuickInventoryType,
    expiresAt: "",
    notes: ""
  });

  useEffect(() => {
    let cancelled = false;

    fetchDashboard()
      .catch(() => {
        if (!cancelled) {
          setStatusMessage("Using bundled seed state");
        }
      });

    async function fetchDashboard() {
      const response = await fetch(apiRoutes.dashboard);

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const nextDashboard = (await response.json()) as DashboardSummary;

      if (!cancelled) {
        setDashboard(nextDashboard);
        setSelectedCategoryId(
          nextDashboard.criticalGaps[0]?.categoryId ?? nextDashboard.categories[0]?.id ?? selectedCategoryId
        );
      }
    }

    return () => {
      cancelled = true;
    };
  }, []);

  async function reloadDashboard() {
    const response = await fetch(apiRoutes.dashboard);

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    setDashboard((await response.json()) as DashboardSummary);
  }

  async function submitQuickInventoryEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage("Adding inventory");

    const payload: QuickInventoryEntryRequest = {
      itemName: inventoryForm.itemName,
      quantity: Number(inventoryForm.quantity),
      locationName: inventoryForm.locationName,
      unit: inventoryForm.unit,
      categoryId: inventoryForm.categoryId,
      type: inventoryForm.type,
      ...(inventoryForm.expiresAt.length === 0 ? {} : { expiresAt: inventoryForm.expiresAt }),
      ...(inventoryForm.notes.length === 0 ? {} : { notes: inventoryForm.notes })
    };

    try {
      const response = await fetch(apiRoutes.quickInventoryEntry, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const result = (await response.json()) as { dashboard: DashboardSummary };
      setDashboard(result.dashboard);
      setInventoryForm((current) => ({
        ...current,
        itemName: "",
        quantity: "1",
        expiresAt: "",
        notes: ""
      }));
      setStatusMessage("Inventory added");
    } catch {
      setStatusMessage("Inventory entry needs the local server");
    }
  }

  async function generateAssetTag(assetId: string) {
    setStatusMessage("Generating asset tag");

    try {
      const response = await fetch(`/api/assets/${assetId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      await response.json();
      await reloadDashboard();
      setStatusMessage("Asset tag ready");
    } catch {
      setStatusMessage("Asset tag needs the local server");
    }
  }

  const selectedPath = useMemo(
    () =>
      dashboard.categoryPaths.find((path) => path.categoryId === selectedCategoryId) ??
      dashboard.categoryPaths[0],
    [dashboard.categoryPaths, selectedCategoryId]
  );
  const selectedCategory = dashboard.categories.find((category) => category.id === selectedPath?.categoryId);
  const activeCategories = dashboard.categories.filter(
    (category) => category.pursuitState === "active"
  );
  const deferredCategories = dashboard.categories.filter((category) =>
    ["later", "paused", "not_currently_pursuing"].includes(category.pursuitState)
  );

  async function updateCategoryPursuit(categoryId: string, pursuitState: PursuitState) {
    setStatusMessage("Updating category");

    try {
      const response = await fetch(`/api/categories/${categoryId}/pursuit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pursuitState })
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      setDashboard((await response.json()) as DashboardSummary);
      setStatusMessage("Category updated");
    } catch {
      setDashboard((current) => ({
        ...current,
        categories: current.categories.map((category) =>
          category.id === categoryId ? { ...category, pursuitState } : category
        )
      }));
      setStatusMessage("Updated locally");
    }
  }

  async function runQuestAction(questId: string, action: QuestActionRequest["action"]) {
    setStatusMessage(`${action} quest`);

    try {
      const response = await fetch(`/api/quests/${questId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const payload = (await response.json()) as { dashboard: DashboardSummary };
      setDashboard(payload.dashboard);
      setStatusMessage("Quest updated");
    } catch {
      setStatusMessage("Action needs the local server");
    }
  }

  return (
    <PageShell
      title="Basecamp Operations"
      eyebrow="M5 milestone"
      actions={<StatusBadge tone="active">{statusMessage}</StatusBadge>}
    >
      <div className="bc-dashboard-grid">
        <Panel title="Readiness" description="Weighted capability, validation, and maintenance state.">
          <ProgressRing value={dashboard.readinessScore} label="Readiness Score" />
          <div className="bc-metric-grid">
            <Metric label="Level" value={dashboard.preparednessLevel} />
            <Metric label="Active categories" value={activeCategories.length} />
            <Metric label="Deferred categories" value={deferredCategories.length} />
            <Metric label="XP" value={dashboard.gamification.totalXp} />
          </div>
        </Panel>

        <Panel title="Recommended Next" description="Ranked choices; recommendations do not auto-start.">
          <ul className="bc-list" aria-label="Recommended quests">
            {dashboard.recommendedQuests.map((quest) => (
              <QuestListItem
                key={quest.id}
                title={quest.title}
                meta={`${quest.recommendationKind?.replaceAll("_", " ") ?? "next"} · ${quest.estimatedMinutes} min · ${quest.xp} XP`}
                actions={
                  <>
                    <Button tone="primary" onClick={() => void runQuestAction(quest.id, "start")}>
                      Start
                    </Button>
                    <Button tone="quiet" onClick={() => void runQuestAction(quest.id, "save")}>
                      Save
                    </Button>
                  </>
                }
              />
            ))}
          </ul>
        </Panel>
      </div>

      <div className="bc-dashboard-grid bc-dashboard-grid-balanced">
        <Panel title="Quick Inventory" description="Search-first entry for common supplies and tracked gear.">
          <form className="bc-form-grid" onSubmit={(event) => void submitQuickInventoryEntry(event)}>
            <label>
              <span>Item</span>
              <input
                autoComplete="off"
                onChange={(event) =>
                  setInventoryForm((current) => ({ ...current, itemName: event.target.value }))
                }
                placeholder="Drinking water"
                required
                value={inventoryForm.itemName}
              />
            </label>
            <div className="bc-inline-fields">
              <label>
                <span>Qty</span>
                <input
                  min="0.01"
                  onChange={(event) =>
                    setInventoryForm((current) => ({ ...current, quantity: event.target.value }))
                  }
                  required
                  step="0.01"
                  type="number"
                  value={inventoryForm.quantity}
                />
              </label>
              <label>
                <span>Unit</span>
                <input
                  onChange={(event) =>
                    setInventoryForm((current) => ({ ...current, unit: event.target.value }))
                  }
                  value={inventoryForm.unit}
                />
              </label>
            </div>
            <label>
              <span>Location</span>
              <input
                autoComplete="off"
                onChange={(event) =>
                  setInventoryForm((current) => ({ ...current, locationName: event.target.value }))
                }
                required
                value={inventoryForm.locationName}
              />
            </label>
            <div className="bc-inline-fields">
              <label>
                <span>Category</span>
                <select
                  onChange={(event) =>
                    setInventoryForm((current) => ({ ...current, categoryId: event.target.value }))
                  }
                  value={inventoryForm.categoryId}
                >
                  {dashboard.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Type</span>
                <select
                  onChange={(event) =>
                    setInventoryForm((current) => ({
                      ...current,
                      type: event.target.value as QuickInventoryType
                    }))
                  }
                  value={inventoryForm.type}
                >
                  {inventoryTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              <span>Expiration</span>
              <input
                onChange={(event) =>
                  setInventoryForm((current) => ({ ...current, expiresAt: event.target.value }))
                }
                type="date"
                value={inventoryForm.expiresAt}
              />
            </label>
            <label>
              <span>Notes</span>
              <textarea
                onChange={(event) =>
                  setInventoryForm((current) => ({ ...current, notes: event.target.value }))
                }
                rows={2}
                value={inventoryForm.notes}
              />
            </label>
            <Button disabled={inventoryForm.itemName.trim().length === 0} tone="primary" type="submit">
              Add
            </Button>
          </form>
        </Panel>

        <Panel title="Locations" description="Named places mature independently from stash to home base.">
          <ul className="bc-list" aria-label="Location maturity">
            {dashboard.inventory.locations.length === 0 ? (
              <QuestListItem title="No locations yet" meta="Add inventory to start a known location" />
            ) : null}
            {dashboard.inventory.locations.map((location) => (
              <QuestListItem
                key={location.id}
                title={location.name}
                meta={`${location.maturity.replaceAll("_", " ")} · ${location.categoryCount} categories · ${location.inventoryCount} lots`}
              />
            ))}
          </ul>
        </Panel>
      </div>

      <div className="bc-dashboard-grid bc-dashboard-grid-balanced">
        <Panel title="Acquisition Rollup" description="Active quest BOMs become derived needs.">
          <ul className="bc-list" aria-label="Acquisition needs">
            {dashboard.inventory.acquisitionNeeds.length === 0 ? (
              <QuestListItem title="No active BOM needs" meta="Start a BOM-backed quest to derive the list" />
            ) : null}
            {dashboard.inventory.acquisitionNeeds.map((need) => (
              <QuestListItem
                key={need.id}
                title={need.functionalRequirement}
                meta={`${need.state.replaceAll("_", " ")} · ${need.quantity} · ${need.questTitle}`}
              />
            ))}
          </ul>
        </Panel>

        <Panel title="Inventory And Maintenance">
          <div className="bc-backlog-grid bc-backlog-grid-two">
            <section className="bc-backlog-column" aria-label="Inventory items">
              <h3>Inventory</h3>
              <ul className="bc-list">
                {dashboard.inventory.items.length === 0 ? (
                  <QuestListItem title="No inventory yet" meta="Quick entry will populate this list" />
                ) : null}
                {dashboard.inventory.items.slice(0, 5).map((item) => (
                  <QuestListItem
                    key={item.id}
                    title={item.name}
                    meta={`${item.quantity} ${item.unit} · ${item.locationNames.join(", ") || "unlocated"}`}
                  />
                ))}
              </ul>
            </section>
            <section className="bc-backlog-column" aria-label="Maintenance due">
              <h3>Maintenance</h3>
              <ul className="bc-list">
                {dashboard.inventory.maintenanceDue.length === 0 ? (
                  <QuestListItem title="No maintenance due" meta="Recurring policies will appear here" />
                ) : null}
                {dashboard.inventory.maintenanceDue.slice(0, 5).map((item) => (
                  <QuestListItem
                    key={item.policyId}
                    title={item.title}
                    meta={`${item.status} · ${item.dueAt.slice(0, 10)} · ${item.scopeLabel}`}
                  />
                ))}
              </ul>
            </section>
          </div>
        </Panel>
      </div>

      <Panel title="Assets And QR Tags" description="Basecamp tags use stable asset identifiers and scan URLs.">
        <ul className="bc-list" aria-label="Assets and QR tags">
          {dashboard.inventory.assets.length === 0 ? (
            <QuestListItem title="No tracked assets yet" meta="Durable assets can be tagged when added" />
          ) : null}
          {dashboard.inventory.assets.map((asset) => (
            <QuestListItem
              actions={
                <Button tone="quiet" onClick={() => void generateAssetTag(asset.id)}>
                  Tag
                </Button>
              }
              key={asset.id}
              title={asset.name}
              meta={`${asset.state.replaceAll("_", " ")} · ${asset.tagCount} tags`}
            />
          ))}
        </ul>
      </Panel>

      <Panel title="Category Pursuit" description="Hold, defer, or resume categories without hiding gaps.">
        <div className="bc-category-grid">
          {dashboard.categories.map((category) => (
            <article className="bc-category-card" key={category.id}>
              <button
                className="bc-category-select"
                onClick={() => setSelectedCategoryId(category.id)}
                type="button"
              >
                <strong>{category.name}</strong>
                <span>Level {category.level} · {category.readinessScore}%</span>
              </button>
              <StatusBadge tone={category.status === "critical_gap" ? "gap" : category.pursuitState === "later" ? "later" : "active"}>
                {category.status.replaceAll("_", " ")}
              </StatusBadge>
            </article>
          ))}
        </div>
      </Panel>

      {selectedPath ? (
        <div className="bc-dashboard-grid">
          <Panel title={`${selectedPath.categoryName} Path`} description="Keyboard-friendly progression fallback.">
            <div className="bc-segmented" role="group" aria-label={`${selectedPath.categoryName} pursuit state`}>
              {pursuitOptions.map((option) => (
                <Button
                  ariaPressed={selectedCategory?.pursuitState === option.state}
                  key={option.state}
                  onClick={() => void updateCategoryPursuit(selectedPath.categoryId, option.state)}
                  tone={selectedCategory?.pursuitState === option.state ? "primary" : "secondary"}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <ol className="bc-path-list" aria-label={`${selectedPath.categoryName} progression path`}>
              {selectedPath.nodes.map((node) => (
                <li className={`bc-path-node bc-path-node-${node.state}`} key={node.id}>
                  <span>{node.type.replaceAll("_", " ")}</span>
                  <strong>{node.title}</strong>
                  <small>{node.state.replaceAll("_", " ")} · Level {node.targetLevel}</small>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Quest Backlog" description="Multiple active, saved, and deferred quests are tracked separately.">
            <div className="bc-backlog-grid">
              <QuestBucket
                label="Active"
                quests={dashboard.activeQuests}
                onPrimary={(questId) => void runQuestAction(questId, "complete")}
                primaryLabel="Complete"
              />
              <QuestBucket
                label="Saved"
                quests={dashboard.savedQuests}
                onPrimary={(questId) => void runQuestAction(questId, "start")}
                primaryLabel="Start"
              />
              <QuestBucket
                label="Deferred"
                quests={dashboard.deferredQuests}
                onPrimary={(questId) => void runQuestAction(questId, "resume")}
                primaryLabel="Resume"
              />
            </div>
          </Panel>
        </div>
      ) : null}

      <div className="bc-dashboard-grid">
        <Panel title="Gap Report" description="Critical, validation, acquisition, maintenance, and deferred gaps.">
          <div className="bc-metric-grid">
            <Metric label="Critical" value={dashboard.gapReport.criticalCategoryGaps.length} />
            <Metric label="Validation" value={dashboard.gapReport.validationGaps.length} />
            <Metric label="Acquisition" value={dashboard.gapReport.acquisitionGaps.length} />
            <Metric label="Deferred" value={dashboard.gapReport.intentionalDeferrals.length} />
          </div>
          <ul className="bc-list" aria-label="Suggested follow-up quests">
            {dashboard.gapReport.followUpQuests.slice(0, 4).map((followUp) => (
              <QuestListItem
                key={followUp.id}
                title={followUp.title}
                meta={followUp.reason}
              />
            ))}
          </ul>
        </Panel>

        <Panel title="Critical Gaps">
          <ul className="bc-list" aria-label="Critical readiness gaps">
            {dashboard.criticalGaps.map((gap) => (
              <QuestListItem
                key={gap.categoryId}
                title={gap.categoryName}
                meta={`${gap.score}% · ${gap.reason.replaceAll("_", " ")}`}
              />
            ))}
          </ul>
        </Panel>

        <Panel title="Badges And Capability Outposts">
          <ul className="bc-list" aria-label="Badge and capability outpost progress">
            {dashboard.gamification.badges.slice(0, 4).map((badge) => (
              <QuestListItem
                key={badge.badgeId}
                title={badge.name}
                meta={`${badge.progressPercent}% · next ${badge.nextTier ?? "complete"}`}
              />
            ))}
            {dashboard.gamification.capabilityOutposts.map((outpost) => (
              <QuestListItem
                key={outpost.outpostId}
                title={outpost.name}
                meta={`${outpost.progressPercent}% · ${outpost.earned ? "earned" : "in progress"}`}
              />
            ))}
          </ul>
        </Panel>
      </div>
    </PageShell>
  );
}

interface QuestBucketProps {
  label: string;
  quests: DashboardSummary["activeQuests"];
  primaryLabel: string;
  onPrimary: (questId: string) => void;
}

function QuestBucket({ label, quests, primaryLabel, onPrimary }: QuestBucketProps) {
  return (
    <section className="bc-backlog-column" aria-label={`${label} quests`}>
      <h3>{label}</h3>
      {quests.length === 0 ? <p className="bc-muted">None</p> : null}
      <ul className="bc-list">
        {quests.map((quest) => (
          <QuestListItem
            actions={
              <Button tone="quiet" onClick={() => onPrimary(quest.id)}>
                {primaryLabel}
              </Button>
            }
            key={quest.id}
            meta={`${quest.status} · ${quest.estimatedMinutes} min`}
            title={quest.title}
          />
        ))}
      </ul>
    </section>
  );
}

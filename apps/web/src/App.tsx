import {
  apiRoutes,
  createDashboardSummary,
  type DashboardSummary,
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

export interface AppProps {
  summary?: DashboardSummary;
}

export function App({ summary = fallbackDashboardSummary }: AppProps) {
  const [dashboard, setDashboard] = useState(summary);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    summary.criticalGaps[0]?.categoryId ?? summary.categories[0]?.id ?? "water"
  );
  const [statusMessage, setStatusMessage] = useState("Ready");

  useEffect(() => {
    let cancelled = false;

    fetch(apiRoutes.dashboard)
      .then((response) => (response.ok ? response.json() : Promise.reject(response.statusText)))
      .then((nextDashboard: DashboardSummary) => {
        if (!cancelled) {
          setDashboard(nextDashboard);
          setSelectedCategoryId(
            nextDashboard.criticalGaps[0]?.categoryId ?? nextDashboard.categories[0]?.id ?? selectedCategoryId
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatusMessage("Using bundled seed state");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
      title="Readiness Core"
      eyebrow="M2 milestone"
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

        <Panel title="Badges And Outposts">
          <ul className="bc-list" aria-label="Badge and outpost progress">
            {dashboard.gamification.badges.slice(0, 4).map((badge) => (
              <QuestListItem
                key={badge.badgeId}
                title={badge.name}
                meta={`${badge.progressPercent}% · next ${badge.nextTier ?? "complete"}`}
              />
            ))}
            {dashboard.gamification.outposts.map((outpost) => (
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

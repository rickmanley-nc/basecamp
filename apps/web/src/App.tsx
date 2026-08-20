import { createDashboardSummary, type DashboardSummary } from "@basecamp/api";
import { basecampSeed } from "@basecamp/content";
import {
  Button,
  Metric,
  PageShell,
  Panel,
  ProgressRing,
  QuestListItem,
  StatusBadge
} from "@basecamp/ui";

export const fallbackDashboardSummary = createDashboardSummary(basecampSeed);

export interface AppProps {
  summary?: DashboardSummary;
}

export function App({ summary = fallbackDashboardSummary }: AppProps) {
  const activeCategories = summary.categories.filter(
    (category) => category.pursuitState === "active"
  );
  const deferredCategories = summary.categories.filter(
    (category) => category.pursuitState === "later"
  );

  return (
    <PageShell
      title="Dashboard"
      eyebrow="M1 vertical slice"
      actions={<Button tone="primary">Start Quest</Button>}
    >
      <div className="bc-dashboard-grid">
        <Panel title="Readiness" description="Early placeholder score from seeded content.">
          <ProgressRing value={summary.readinessScore} label="Readiness Score" />
          <div className="bc-metric-grid">
            <Metric label="Level" value={summary.preparednessLevel} detail="First review state" />
            <Metric label="Active categories" value={activeCategories.length} />
            <Metric label="Deferred categories" value={deferredCategories.length} />
          </div>
        </Panel>

        <Panel title="Recommended Next" description="Useful choices without forcing a path.">
          <ul className="bc-list" aria-label="Recommended quests">
            {summary.recommendedQuests.map((quest) => (
              <QuestListItem
                key={quest.id}
                title={quest.title}
                meta={`${quest.estimatedMinutes} min · ${quest.xp} XP`}
              />
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Category Levels" description="Independent progress and pursuit states.">
        <div className="bc-category-grid">
          {summary.categories.slice(0, 12).map((category) => (
            <article className="bc-category-card" key={category.id}>
              <strong>{category.name}</strong>
              <span>Level {category.level}</span>
              <StatusBadge tone={category.pursuitState === "later" ? "later" : "active"}>
                {category.pursuitState.replaceAll("_", " ")}
              </StatusBadge>
            </article>
          ))}
        </div>
      </Panel>

      <div className="bc-dashboard-grid">
        <Panel title="Active Quests">
          <ul className="bc-list" aria-label="Active quests">
            {summary.activeQuests.map((quest) => (
              <QuestListItem
                key={quest.id}
                title={quest.title}
                meta={`Level ${quest.targetLevel} · ${quest.priority}`}
              />
            ))}
          </ul>
        </Panel>

        <Panel title="Upcoming Maintenance">
          <ul className="bc-list" aria-label="Upcoming maintenance">
            {summary.upcomingMaintenance.map((item) => (
              <QuestListItem key={item.id} title={item.title} meta={item.due} />
            ))}
          </ul>
        </Panel>
      </div>
    </PageShell>
  );
}

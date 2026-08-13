"use client";

import type { Insights } from "@/lib/insights";
import { ActivityHeatmap } from "./activity-heatmap";
import { FunnelChart } from "./funnel-chart";
import { InsightsSettings } from "./insights-settings";
import { JourneySankey } from "./journey-sankey";
import { WeeklyApplicationsChart } from "./weekly-applications-chart";
import { useInsightsPrefs, type CardId } from "./use-insights-prefs";

export function InsightsBoard({ insights }: { insights: Insights }) {
  const { prefs, update, reset } = useInsightsPrefs();
  const { applied, funnel, sankey, weekly, daily, windowStartLabel } = insights;
  const since = `Since ${windowStartLabel}, by date applied`;

  const cards: Record<CardId, { title: string; subtitle: string; wide: boolean; body: React.ReactNode }> = {
    funnel: {
      title: "Pipeline",
      subtitle:
        "Applications that reached each stage or further, so a rejection after an interview still counts as an interview. The muted number is the share carried over from the stage above.",
      wide: false,
      body:
        applied === 0 ? <Empty>No applications submitted yet.</Empty> : <FunnelChart stages={funnel} />,
    },
    weekly: {
      title: "Applications per week",
      subtitle: since,
      wide: false,
      body: <WeeklyApplicationsChart weeks={weekly} />,
    },
    sankey: {
      title: "Where applications go",
      subtitle:
        "Every application as a flow from Applied through the stages it reached to how it ended. Ribbon width is the number of applications, and its color is where it lands.",
      wide: true,
      body:
        applied === 0 ? (
          <Empty>No applications submitted yet.</Empty>
        ) : (
          <JourneySankey graph={sankey[prefs.detail]} />
        ),
    },
    activity: {
      title: "Activity",
      subtitle: `Applications submitted per day, ${windowStartLabel} to today`,
      wide: true,
      body: <ActivityHeatmap days={daily} />,
    },
  };

  const visible = prefs.order.filter((id) => !prefs.hidden.includes(id));

  return (
    // The theme scope wraps the charts only, so the --viz-* overrides never
    // leak into the surrounding page chrome.
    <div data-viz-theme={prefs.theme}>
      <div className="mb-3 flex justify-end">
        <InsightsSettings prefs={prefs} update={update} reset={reset} />
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Every chart is hidden. Turn one back on under Customize.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((id) => {
            const card = cards[id];
            return (
              <section
                key={id}
                className={`rounded-lg border p-4 ${card.wide ? "lg:col-span-2" : ""}`}
              >
                <h2 className="text-sm font-medium">{card.title}</h2>
                <p className="mt-0.5 mb-4 text-xs text-muted-foreground">{card.subtitle}</p>
                {card.body}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

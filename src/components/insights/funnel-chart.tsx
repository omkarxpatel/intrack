"use client";

import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import type { FunnelStage } from "@/lib/insights";

// Ordinal ramp: the stages have an inherent order, so the color carries it.
const STAGE_COLORS = [
  "var(--viz-funnel-1)",
  "var(--viz-funnel-2)",
  "var(--viz-funnel-3)",
  "var(--viz-funnel-4)",
];

const config = { count: { label: "Applications" } } satisfies ChartConfig;

function Tooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: FunnelStage }[];
}) {
  const stage = payload?.[0]?.payload;
  if (!active || !stage) return null;

  return (
    <div className="rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-md">
      <div className="font-medium text-foreground">
        {stage.count} {stage.count === 1 ? "application" : "applications"}
      </div>
      <div className="text-muted-foreground">{stage.label}</div>
      <div className="mt-1 text-muted-foreground tabular-nums">
        {Math.round(stage.pctOfApplied)}% of applied
        {stage.pctOfPrevious !== null && ` · ${Math.round(stage.pctOfPrevious)}% of previous`}
      </div>
    </div>
  );
}

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(...stages.map((s) => s.count), 1);
  // Precomputed so LabelList can render it by key rather than via a formatter.
  const data = stages.map((s) => ({
    ...s,
    carryOver: s.pctOfPrevious === null ? "" : `${Math.round(s.pctOfPrevious)}%`,
  }));

  return (
    <ChartContainer config={config} className="aspect-auto h-[200px] w-full">
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ left: 4, right: 56, top: 4, bottom: 4 }}
        barCategoryGap="22%"
      >
        {/* Headroom on the right so the tip label never collides with the edge. */}
        <XAxis type="number" domain={[0, max]} hide />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={78}
          tickMargin={8}
        />
        <ChartTooltip cursor={false} content={<Tooltip />} />
        {/* minPointSize keeps a stub for zero-count stages, so "Offer 0" reads
            as a real zero rather than a row with missing data. */}
        <Bar
          dataKey="count"
          radius={[4, 4, 4, 4]}
          maxBarSize={24}
          minPointSize={2}
          isAnimationActive={false}
        >
          {stages.map((stage, i) => (
            <Cell key={stage.label} fill={STAGE_COLORS[i]} />
          ))}
          <LabelList
            dataKey="count"
            position="right"
            offset={10}
            className="fill-foreground"
            fontSize={12}
          />
          <LabelList
            dataKey="carryOver"
            position="right"
            offset={38}
            className="fill-muted-foreground"
            fontSize={11}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

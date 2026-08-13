"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { WeekPoint } from "@/lib/insights";

const config = {
  count: { label: "Applications", color: "var(--viz-bar)" },
} satisfies ChartConfig;

export function WeeklyApplicationsChart({ weeks }: { weeks: WeekPoint[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-[220px] w-full">
      <BarChart accessibilityLayer data={weeks} margin={{ left: 4, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={28}
          allowDecimals={false}
          tickMargin={4}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent labelFormatter={(label) => `Week of ${label}`} indicator="dot" />
          }
        />
        <Bar
          dataKey="count"
          fill="var(--color-count)"
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  );
}

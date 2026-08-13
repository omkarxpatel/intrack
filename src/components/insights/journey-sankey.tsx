"use client";

import { Layer, Rectangle, Sankey, Tooltip } from "recharts";
import type { LinkProps, NodeProps } from "recharts/types/chart/Sankey";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import type { NodeTone, SankeyGraph } from "@/lib/insights";

// Stage nodes reuse the funnel's ordinal ramp so the two charts agree on what
// each stage looks like. Outcomes wear reserved status steps instead — here the
// color means "ended badly" or "went quiet", not "series 5".
const TONE_COLOR: Record<NodeTone, string> = {
  "stage-1": "var(--viz-funnel-1)",
  "stage-2": "var(--viz-funnel-2)",
  "stage-3": "var(--viz-funnel-3)",
  "stage-4": "var(--viz-funnel-4)",
  positive: "var(--viz-positive)",
  negative: "var(--viz-negative)",
  muted: "var(--viz-neutral)",
};

const config = {} satisfies ChartConfig;

type Toned = { name: string; value: number; tone: NodeTone };

function colorOf(node: { tone?: NodeTone }): string {
  return TONE_COLOR[node.tone ?? "muted"];
}

function SankeyNodeShape({ x, y, width, height, payload }: NodeProps) {
  const node = payload as unknown as Toned & { depth: number };
  // Labels sit to the left of their node so every column reads down a common
  // edge. The first column has no room on its left, so it flips outward.
  // Keyed off depth rather than the link arrays: recharts names them the
  // opposite way round from d3, where targetLinks are the *outgoing* ones.
  const isSource = node.depth === 0;

  return (
    <Layer>
      <Rectangle x={x} y={y} width={width} height={height} fill={colorOf(node)} radius={2} />
      <text
        x={isSource ? x + width + 8 : x - 8}
        y={y + height / 2}
        textAnchor={isSource ? "start" : "end"}
        dominantBaseline="middle"
        fontSize={12}
        // A surface-colored halo keeps the label legible where it crosses a
        // ribbon, instead of boxing the text in a chip.
        stroke="var(--background)"
        strokeWidth={3}
        paintOrder="stroke"
        className="fill-foreground"
      >
        {node.name}
        <tspan className="fill-muted-foreground" dx={6}>
          {node.value}
        </tspan>
      </text>
    </Layer>
  );
}

function SankeyLinkShape({
  sourceX,
  targetX,
  sourceY,
  targetY,
  sourceControlX,
  targetControlX,
  linkWidth,
  payload,
}: LinkProps) {
  return (
    <path
      d={`M${sourceX},${sourceY}C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      // Colored by where the ribbon lands, not where it leaves: rejections run
      // red the whole way, so you can trace which stages they drain out of.
      stroke={colorOf(payload.target as unknown as Toned)}
      strokeWidth={linkWidth}
      strokeOpacity={0.32}
    />
  );
}

type TooltipDatum = Toned | { source: Toned; target: Toned; value: number };

function SankeyTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { payload: TooltipDatum } }[];
}) {
  const datum = payload?.[0]?.payload?.payload;
  if (!active || !datum) return null;

  const label = "source" in datum ? `${datum.source.name} → ${datum.target.name}` : datum.name;

  return (
    <div className="rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-md">
      <div className="font-medium text-foreground">
        {datum.value} {datum.value === 1 ? "application" : "applications"}
      </div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}

export function JourneySankey({ graph }: { graph: SankeyGraph }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-[320px] w-full">
      <Sankey
        data={graph}
        nodePadding={24}
        nodeWidth={10}
        // Labels sit inside the plot now, so the margins only keep the end
        // nodes off the card edges.
        margin={{ left: 8, right: 16, top: 10, bottom: 10 }}
        node={(props: NodeProps) => <SankeyNodeShape {...props} />}
        link={(props: LinkProps) => <SankeyLinkShape {...props} />}
      >
        <Tooltip content={<SankeyTooltip />} />
      </Sankey>
    </ChartContainer>
  );
}

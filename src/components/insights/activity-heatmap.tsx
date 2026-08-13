"use client";

import { useState } from "react";
import type { DayCount } from "@/lib/insights";

const CELL = 14;
const GAP = 3;
const PITCH = CELL + GAP;

/** Sequential ramp: 0 is the empty track, 1–4+ step toward the strong end. */
const HEAT = [
  "var(--viz-heat-0)",
  "var(--viz-heat-1)",
  "var(--viz-heat-2)",
  "var(--viz-heat-3)",
  "var(--viz-heat-4)",
];

function bucket(count: number): number {
  return Math.min(count, 4);
}

function formatDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function ActivityHeatmap({ days }: { days: DayCount[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  // The window always starts on a Monday, so index maps cleanly to a grid slot.
  const weeks = Math.ceil(days.length / 7);
  const active = hovered === null ? null : days[hovered];

  // A month label sits above the first column that contains that month's 1st.
  const monthLabels: { col: number; label: string }[] = [];
  days.forEach((day, i) => {
    const [y, m, d] = day.date.split("-").map(Number);
    if (d > 7) return;
    const col = Math.floor(i / 7);
    if (monthLabels.some((l) => l.col === col)) return;
    const label = new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short" });
    if (monthLabels.at(-1)?.label === label) return;
    monthLabels.push({ col, label });
  });

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="relative w-fit pl-8 pt-5">
          {monthLabels.map(({ col, label }) => (
            <span
              key={label + col}
              className="absolute top-0 text-[11px] text-muted-foreground"
              style={{ left: 32 + col * PITCH }}
            >
              {label}
            </span>
          ))}

          {["Mon", "Wed", "Fri"].map((label, i) => (
            <span
              key={label}
              className="absolute left-0 text-[11px] text-muted-foreground"
              style={{ top: 20 + i * 2 * PITCH - 1 }}
            >
              {label}
            </span>
          ))}

          <div
            className="grid grid-flow-col"
            style={{
              gap: GAP,
              gridTemplateRows: `repeat(7, ${CELL}px)`,
              gridTemplateColumns: `repeat(${weeks}, ${CELL}px)`,
            }}
          >
            {days.map((day, i) => (
              <div
                key={day.date}
                tabIndex={day.count > 0 ? 0 : undefined}
                aria-label={
                  day.count > 0
                    ? `${formatDay(day.date)}: ${day.count} applications`
                    : undefined
                }
                aria-hidden={day.count === 0 || undefined}
                onPointerEnter={() => setHovered(i)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                className="rounded-[3px] outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  backgroundColor: HEAT[bucket(day.count)],
                  // A surface-colored ring, not a border, separates the hovered cell.
                  boxShadow: hovered === i ? "0 0 0 2px var(--foreground)" : undefined,
                }}
              />
            ))}
          </div>

          {active &&
            (() => {
              const col = Math.floor(hovered! / 7);
              const row = hovered! % 7;
              // The scroll container clips on both axes, so the tooltip flips
              // toward the middle near any edge rather than being cut off.
              const below = row < 3;
              const anchorX = col < 2 ? "left" : col > weeks - 3 ? "right" : "center";

              return (
                <div
                  className={`pointer-events-none absolute z-10 rounded-lg border bg-background px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md ${
                    below ? "" : "-translate-y-full"
                  } ${anchorX === "center" ? "-translate-x-1/2" : anchorX === "right" ? "-translate-x-full" : ""}`}
                  style={{
                    left:
                      32 +
                      col * PITCH +
                      (anchorX === "left" ? 0 : anchorX === "right" ? CELL : CELL / 2),
                    top: 20 + row * PITCH + (below ? CELL + 6 : -6),
                  }}
                >
                  <span className="font-medium text-foreground">
                    {active.count} {active.count === 1 ? "application" : "applications"}
                  </span>
                  <span className="text-muted-foreground"> · {formatDay(active.date)}</span>
                </div>
              );
            })()}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
        <span>None</span>
        {HEAT.map((color, i) => (
          <span
            key={color}
            className="size-3 rounded-[3px]"
            style={{ backgroundColor: color }}
            title={i === 0 ? "0" : i === 4 ? "4 or more" : String(i)}
          />
        ))}
        <span>4+</span>
      </div>
    </div>
  );
}

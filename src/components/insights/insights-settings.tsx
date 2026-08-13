"use client";

import { ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  moveCard,
  VIZ_THEMES,
  type CardId,
  type InsightsPrefs,
  type VizTheme,
} from "./use-insights-prefs";

const THEME_LABELS: Record<VizTheme, string> = {
  blue: "Blue",
  violet: "Violet",
  teal: "Teal",
  amber: "Amber",
};

// The mid step of each theme's ramp, purely to preview the hue in the picker.
const THEME_SWATCH: Record<VizTheme, string> = {
  blue: "#2a78d6",
  violet: "#8260cd",
  teal: "#208a85",
  amber: "#9f6e1b",
};

const CARD_LABELS: Record<CardId, string> = {
  funnel: "Pipeline",
  weekly: "Applications per week",
  sankey: "Where applications go",
  activity: "Activity",
};

export function InsightsSettings({
  prefs,
  update,
  reset,
}: {
  prefs: InsightsPrefs;
  update: (patch: Partial<InsightsPrefs>) => void;
  reset: () => void;
}) {
  const toggleHidden = (id: CardId, visible: boolean) =>
    update({
      hidden: visible ? prefs.hidden.filter((h) => h !== id) : [...prefs.hidden, id],
    });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="size-4" /> Customize
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="space-y-1 border-b p-3">
          <div className="text-xs font-medium">Chart color</div>
          <div className="flex gap-1.5 pt-1">
            {VIZ_THEMES.map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => update({ theme })}
                aria-pressed={prefs.theme === theme}
                title={THEME_LABELS[theme]}
                className={`flex flex-1 flex-col items-center gap-1 rounded-md border px-2 py-1.5 text-[11px] transition-colors hover:bg-accent ${
                  prefs.theme === theme ? "border-foreground" : "border-transparent"
                }`}
              >
                <span
                  className="size-4 rounded-full"
                  style={{ backgroundColor: THEME_SWATCH[theme] }}
                />
                {THEME_LABELS[theme]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1 border-b p-3">
          <div className="text-xs font-medium">Interview rounds</div>
          <div className="flex gap-1.5 pt-1">
            {(
              [
                ["combined", "Combined"],
                ["rounds", "By round"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => update({ detail: value })}
                aria-pressed={prefs.detail === value}
                className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] transition-colors hover:bg-accent ${
                  prefs.detail === value ? "border-foreground" : "border-transparent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="pt-1 text-[11px] text-muted-foreground">
            How finely the flow chart splits the interview stages.
          </p>
        </div>

        <div className="space-y-1 p-3">
          <div className="text-xs font-medium">Charts</div>
          <ul className="pt-1">
            {prefs.order.map((id, i) => (
              <li key={id} className="flex items-center gap-2 py-1">
                <Checkbox
                  id={`card-${id}`}
                  checked={!prefs.hidden.includes(id)}
                  onCheckedChange={(checked) => toggleHidden(id, checked === true)}
                />
                <label htmlFor={`card-${id}`} className="flex-1 truncate text-xs">
                  {CARD_LABELS[id]}
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  disabled={i === 0}
                  aria-label={`Move ${CARD_LABELS[id]} up`}
                  onClick={() => update({ order: moveCard(prefs.order, id, -1) })}
                >
                  <ChevronUp className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  disabled={i === prefs.order.length - 1}
                  aria-label={`Move ${CARD_LABELS[id]} down`}
                  onClick={() => update({ order: moveCard(prefs.order, id, 1) })}
                >
                  <ChevronDown className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" className="mt-1 h-7 w-full text-xs" onClick={reset}>
            Reset to defaults
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

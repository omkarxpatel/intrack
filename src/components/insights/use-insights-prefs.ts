"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { SankeyDetail } from "@/lib/insights";

export const VIZ_THEMES = ["blue", "violet", "teal", "amber"] as const;
export type VizTheme = (typeof VIZ_THEMES)[number];

export const CARD_IDS = ["funnel", "weekly", "sankey", "activity"] as const;
export type CardId = (typeof CARD_IDS)[number];

export type InsightsPrefs = {
  theme: VizTheme;
  detail: SankeyDetail;
  /** Every card, in display order. Hidden ones stay here to keep their place. */
  order: CardId[];
  hidden: CardId[];
};

export const DEFAULT_PREFS: InsightsPrefs = {
  theme: "blue",
  detail: "combined",
  order: [...CARD_IDS],
  hidden: [],
};

const STORAGE_KEY = "intrack:insights-prefs";

/** Drops anything unrecognised and re-adds cards added since the prefs were saved. */
function parse(raw: string | null): InsightsPrefs {
  if (!raw) return DEFAULT_PREFS;
  let saved: Partial<InsightsPrefs>;
  try {
    saved = JSON.parse(raw) as Partial<InsightsPrefs>;
  } catch {
    return DEFAULT_PREFS;
  }
  const order = (saved.order ?? []).filter((id): id is CardId => CARD_IDS.includes(id));
  return {
    theme: VIZ_THEMES.includes(saved.theme as VizTheme) ? (saved.theme as VizTheme) : "blue",
    detail: saved.detail === "rounds" ? "rounds" : "combined",
    order: [...order, ...CARD_IDS.filter((id) => !order.includes(id))],
    hidden: (saved.hidden ?? []).filter((id): id is CardId => CARD_IDS.includes(id)),
  };
}

// localStorage is an external store, so it's read through the store API rather
// than mirrored into state in an effect. The snapshot is the raw string, which
// stays referentially stable between reads and can't loop the subscription.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Picks up edits made in another tab as well as our own writes.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** No storage on the server, so the markup is always the defaults. */
function getServerSnapshot(): string | null {
  return null;
}

export function useInsightsPrefs() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const prefs = useMemo(() => parse(raw), [raw]);

  const update = useCallback(
    (patch: Partial<InsightsPrefs>) => {
      const next = { ...parse(getSnapshot()), ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Preference just doesn't persist; the session still works.
      }
      for (const listener of listeners) listener();
    },
    [],
  );

  const reset = useCallback(() => update(DEFAULT_PREFS), [update]);

  return { prefs, update, reset };
}

/** Moves a card one slot up or down, ignoring no-op moves at the ends. */
export function moveCard(order: CardId[], id: CardId, direction: -1 | 1): CardId[] {
  const from = order.indexOf(id);
  const to = from + direction;
  if (from === -1 || to < 0 || to >= order.length) return order;
  const next = [...order];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { addStatusStep, deleteStatusStep, updateStatusStep } from "@/lib/actions";
import { PATH_STATUSES, STATUS_LABELS, type StatusStep } from "@/lib/constants";
import type { Application } from "@/db/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Local date parts, not toISOString() — an event recorded at 17:30 PDT is
 * 00:30 UTC the next day, and formatting it in UTC showed tomorrow's date.
 * The <input type="date"> and the server both work in local time, so this
 * keeps all three in agreement.
 */
function isoDate(d: Date | string) {
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/**
 * Edit the recorded path, not just read it. Steps are ordered by date, so
 * inserting one "in between" is a matter of giving it a date between its
 * neighbours. The application's current status follows the latest step.
 */
export function StatusPathDialog({
  app,
  steps,
  open,
  onOpenChange,
}: {
  app: Application;
  steps: StatusStep[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [newStatus, setNewStatus] = useState<string>("online_assessment");
  const [newDate, setNewDate] = useState(() =>
    isoDate(steps.at(-1)?.at ?? app.appliedAt ?? new Date()),
  );

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) toast.success(success);
      else toast.error(result.error ?? "Something went wrong");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Status path</DialogTitle>
          <DialogDescription>
            {app.company} — {app.role}
          </DialogDescription>
        </DialogHeader>

        {steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No steps recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {steps.map((step) => (
              <li key={step.id} className="flex items-center gap-2">
                <Select
                  value={step.status}
                  onValueChange={(v) =>
                    run(
                      () => updateStatusStep({ stepId: step.id, status: v, date: isoDate(step.at) }),
                      "Step updated",
                    )
                  }
                >
                  <SelectTrigger className="flex-1" aria-label={`Status for step on ${isoDate(step.at)}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PATH_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  className="w-40"
                  defaultValue={isoDate(step.at)}
                  aria-label={`Date for ${STATUS_LABELS[step.status]} step`}
                  onChange={(e) => {
                    const date = e.target.value;
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
                    run(
                      () => updateStatusStep({ stepId: step.id, status: step.status, date }),
                      "Step updated",
                    );
                  }}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={pending}
                  aria-label={`Remove ${STATUS_LABELS[step.status]} step`}
                  onClick={() => run(() => deleteStatusStep(step.id), "Step removed")}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-2 border-t pt-4">
          <Label className="mb-2">Add a step</Label>
          <div className="flex items-center gap-2">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="flex-1" aria-label="New step status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PATH_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              className="w-40"
              value={newDate}
              aria-label="New step date"
              onChange={(e) => setNewDate(e.target.value)}
            />

            <Button
              type="button"
              disabled={pending}
              aria-label="Add step"
              onClick={() =>
                run(
                  () =>
                    addStatusStep({ applicationId: app.id, status: newStatus, date: newDate }),
                  "Step added",
                )
              }
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Steps sort by date, so give a step a date between two others to slot it in between.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

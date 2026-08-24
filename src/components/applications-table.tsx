"use client";

import { Fragment, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ChevronRight,
  ExternalLink,
  History,
  MoreHorizontal,
  Pencil,
  Star,
  StickyNote,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import { deleteApplication, setStarred, setStatus } from "@/lib/actions";
import {
  APPLICATION_STATUSES,
  CLOSED_STATUSES,
  STATUS_LABELS,
  TERM_LABELS,
  type ApplicationStatus,
  type StatusStep,
} from "@/lib/constants";
import type { Application } from "@/db/schema";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { ApplicationFormDialog } from "@/components/application-form-dialog";
import { StatusPathDialog } from "@/components/status-path-dialog";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ApplicationsTable({
  applications,
  rolePresets,
  statusPaths,
  searching = false,
}: {
  applications: Application[];
  rolePresets: string[];
  statusPaths: Record<string, StatusStep[]>;
  searching?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  // The database is a cross-country round-trip away, so waiting for the server
  // before repainting the chip costs a few hundred ms of dead time on the most
  // frequent action in the app. Paint immediately; React reverts automatically
  // if the action fails.
  const [rows, applyOptimistic] = useOptimistic(
    applications,
    (current, { id, patch }: { id: string; patch: Partial<Application> }) =>
      current.map((a) => (a.id === id ? { ...a, ...patch } : a)),
  );

  function onStatusChange(id: string, status: string) {
    startTransition(async () => {
      applyOptimistic({ id, patch: { status: status as ApplicationStatus } });
      const result = await setStatus(id, status);
      if (!result.ok) toast.error(result.error);
    });
  }

  function onStarToggle(app: Application) {
    const starred = !app.starred;
    startTransition(async () => {
      applyOptimistic({ id: app.id, patch: { starred } });
      const result = await setStarred(app.id, starred);
      if (!result.ok) toast.error(result.error);
    });
  }

  function onDelete(app: Application) {
    if (!window.confirm(`Delete ${app.company} — ${app.role}? This can't be undone.`)) return;
    startTransition(async () => {
      const result = await deleteApplication(app.id);
      if (result.ok) toast.success("Application deleted");
      else toast.error(result.error);
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm font-medium">{searching ? "No matches" : "No applications yet"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {searching
            ? "Try a shorter search, or clear it to see everything."
            : "Add one manually, or import a CSV to bring over what you already have."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto" data-pending={pending || undefined}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Company</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Applied</TableHead>
            <TableHead>Term</TableHead>
            <TableHead className="text-right">Last update</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((app) => (
            <TableRow
              key={app.id}
              className={CLOSED_STATUSES.includes(app.status) ? "opacity-60" : undefined}
            >
              <TableCell className="pr-0">
                <button
                  type="button"
                  onClick={() => onStarToggle(app)}
                  aria-pressed={app.starred}
                  aria-label={`${app.starred ? "Unstar" : "Star"} ${app.company} — ${app.role}`}
                  // Negative margin cancels the padding, so the hit area is
                  // comfortable without widening the column.
                  className="-m-1.5 flex items-center p-1.5 text-muted-foreground/40 transition-colors hover:text-foreground"
                >
                  <Star
                    className={cn("size-4", app.starred && "fill-foreground text-foreground")}
                  />
                </button>
              </TableCell>
              <TableCell className="font-medium">
                {app.jobUrl ? (
                  <a
                    href={app.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    {app.company}
                    <ExternalLink className="size-3 opacity-50" />
                  </a>
                ) : (
                  app.company
                )}
              </TableCell>
              <TableCell className="max-w-64">
                <div className="flex items-center gap-1.5">
                  <span className="truncate" title={app.role}>
                    {app.role}
                  </span>
                  {/* Full contrast for the referral, muted for notes: a referral
                      changes your odds, a note is just there if you want it. */}
                  {app.hasReferral && (
                    <span title="You have a referral" className="shrink-0 text-foreground">
                      <UserRoundCheck className="size-3.5" />
                    </span>
                  )}
                  {app.notes && <NotesPreview notes={app.notes} company={app.company} />}
                </div>
              </TableCell>
              <TableCell>
                <Select value={app.status} onValueChange={(v) => onStatusChange(app.id, v)}>
                  <SelectTrigger
                    aria-label={`Status for ${app.company}`}
                    // dark:bg-transparent is required: SelectTrigger ships a
                    // dark:bg-input/30 that plain bg-transparent won't override.
                    className="h-auto w-auto gap-1 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent [&>svg]:size-3 [&>svg]:opacity-40"
                  >
                    <StatusBadge status={app.status} />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLICATION_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <StatusPath steps={statusPaths[app.id] ?? []} />
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {app.appliedAt ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {app.term ? TERM_LABELS[app.term] : "—"}
              </TableCell>
              <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                {relativeDays(app.updatedAt)}
              </TableCell>
              <TableCell>
                <RowActions
                  app={app}
                  rolePresets={rolePresets}
                  steps={statusPaths[app.id] ?? []}
                  onDelete={onDelete}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * The journey, not just the endpoint — a row sitting at Rejected still shows
 * that it got to OA and Interview first. Hidden for single-step paths, where
 * the badge already says everything.
 */
function StatusPath({ steps }: { steps: StatusStep[] }) {
  if (steps.length < 2) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-0.5 text-[10px] leading-tight text-muted-foreground">
      {steps.map((step, i) => (
        <Fragment key={i}>
          {i > 0 && <ChevronRight className="size-2.5 shrink-0 opacity-60" />}
          <span className={i === steps.length - 1 ? "font-medium text-foreground/70" : undefined}>
            {STATUS_LABELS[step.status]}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

function RowActions({
  app,
  rolePresets,
  steps,
  onDelete,
}: {
  app: Application;
  rolePresets: string[];
  steps: StatusStep[];
  onDelete: (app: Application) => void;
}) {
  // Both dialogs are siblings of the menu, not children of it. Nesting a Radix
  // Dialog inside DropdownMenuContent leaves `pointer-events: none` on <body>
  // after the dialog closes, which freezes the whole page until a reload.
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${app.company}`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setHistoryOpen(true)}>
            <History className="size-4" /> Edit status path
          </DropdownMenuItem>
          {app.jobUrl && (
            <DropdownMenuItem asChild>
              <a href={app.jobUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" /> Open listing
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => onDelete(app)}>
            <Trash2 className="size-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mounted only once opened. Rendering both dialogs for all 89 rows builds
          a large element tree on every render, which made even an optimistic
          status change take hundreds of milliseconds to repaint. */}
      {editOpen && (
        <ApplicationFormDialog
          application={app}
          rolePresets={rolePresets}
          open
          onOpenChange={setEditOpen}
        />
      )}

      {historyOpen && (
        <StatusPathDialog app={app} steps={steps} open onOpenChange={setHistoryOpen} />
      )}
    </>
  );
}

/**
 * The note itself on hover, rather than the native `title` tooltip: that waits
 * about a second to appear, collapses the note's own line breaks, and renders
 * outside the theme.
 *
 * Clamped by line count rather than character count so the cut always lands on
 * a line boundary instead of mid-word. A button, not a span, so it's reachable
 * by keyboard — Radix opens the card on focus as well as hover.
 */
function NotesPreview({ notes, company }: { notes: string; company: string }) {
  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          aria-label={`Notes for ${company}`}
          className="flex shrink-0 items-center text-muted-foreground/70 transition-colors hover:text-foreground"
        >
          <StickyNote className="size-3.5" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80">
        <p className="line-clamp-12 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {notes.trim()}
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}

function relativeDays(date: Date) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

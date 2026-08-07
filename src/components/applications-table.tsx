"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { deleteApplication, setStatus } from "@/lib/actions";
import {
  APPLICATION_STATUSES,
  CLOSED_STATUSES,
  STATUS_LABELS,
  WORK_MODE_LABELS,
} from "@/lib/constants";
import type { Application } from "@/db/schema";
import { StatusBadge } from "@/components/status-badge";
import { ApplicationFormDialog } from "@/components/application-form-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ApplicationsTable({ applications }: { applications: Application[] }) {
  const [pending, startTransition] = useTransition();

  function onStatusChange(id: string, status: string) {
    startTransition(async () => {
      const result = await setStatus(id, status);
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

  if (applications.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm font-medium">No applications yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add one manually, or import a CSV to bring over what you already have.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto" data-pending={pending || undefined}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Applied</TableHead>
            <TableHead>Term</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-right">Last update</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((app) => (
            <TableRow key={app.id} className={CLOSED_STATUSES.includes(app.status) ? "opacity-60" : undefined}>
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
              <TableCell className="max-w-64 truncate" title={app.role}>
                {app.role}
              </TableCell>
              <TableCell>
                <Select value={app.status} onValueChange={(v) => onStatusChange(app.id, v)}>
                  <SelectTrigger
                    aria-label={`Status for ${app.company}`}
                    className="h-auto w-auto gap-1 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 [&>svg]:size-3 [&>svg]:opacity-40"
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
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {app.appliedAt ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">{app.term ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {[app.location, app.workMode !== "unknown" ? WORK_MODE_LABELS[app.workMode] : null]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </TableCell>
              <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                {relativeDays(app.updatedAt)}
              </TableCell>
              <TableCell>
                <RowActions app={app} onDelete={onDelete} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * The edit dialog is a sibling of the menu, not a child of it. Nesting a Radix
 * Dialog inside DropdownMenuContent leaves `pointer-events: none` on <body>
 * after the dialog closes, which freezes the whole page until a reload.
 */
function RowActions({
  app,
  onDelete,
}: {
  app: Application;
  onDelete: (app: Application) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);

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

      <ApplicationFormDialog application={app} open={editOpen} onOpenChange={setEditOpen} />
    </>
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

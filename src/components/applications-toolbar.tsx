"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Plus, Search } from "lucide-react";
import {
  APPLICATION_STATUSES,
  IN_PROCESS_FILTER,
  STATUS_LABELS,
  TERMS,
  TERM_LABELS,
} from "@/lib/constants";
import { ApplicationFormDialog } from "@/components/application-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

export function ApplicationsToolbar({
  q,
  onQChange,
  rolePresets,
}: {
  q: string;
  onQChange: (q: string) => void;
  rolePresets: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function apply(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-56 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder="Search company, role, notes…"
          className="pl-8"
          aria-label="Search applications"
        />
        {isPending && (
          <Loader2
            aria-label="Loading results"
            className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        )}
      </div>

      <Select
        value={params.get("status") ?? ALL}
        onValueChange={(v) => apply({ status: v === ALL ? null : v })}
      >
        <SelectTrigger className="w-40" aria-label="Filter by status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {/* The two set-valued options sit above the rule; everything below
              it picks out exactly one status. */}
          <SelectItem value={ALL}>All statuses</SelectItem>
          <SelectItem value={IN_PROCESS_FILTER}>In process</SelectItem>
          <SelectSeparator />
          {APPLICATION_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={params.get("term") ?? ALL}
        onValueChange={(v) => apply({ term: v === ALL ? null : v })}
      >
        <SelectTrigger className="w-40" aria-label="Filter by term">
          <SelectValue placeholder="Term" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All terms</SelectItem>
          {TERMS.map((t) => (
            <SelectItem key={t} value={t}>
              {TERM_LABELS[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={params.get("sort") ?? "applied"}
        onValueChange={(v) => apply({ sort: v === "applied" ? null : v })}
      >
        <SelectTrigger className="w-44" aria-label="Sort">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="applied">Date applied</SelectItem>
          <SelectItem value="updated">Recently updated</SelectItem>
          <SelectItem value="company">Company A–Z</SelectItem>
        </SelectContent>
      </Select>

      <ApplicationFormDialog
        rolePresets={rolePresets}
        trigger={
          <Button>
            <Plus className="size-4" /> Add
          </Button>
        }
      />
    </div>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { APPLICATION_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { ApplicationFormDialog } from "@/components/application-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

export function ApplicationsToolbar({ terms }: { terms: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  function apply(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
  }

  // Debounce the search box so typing doesn't fire a query per keystroke.
  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const timer = setTimeout(() => apply({ q: q || null }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-56 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search company, role, location, notes…"
          className="pl-8"
          aria-label="Search applications"
        />
      </div>

      <Select
        value={params.get("status") ?? ALL}
        onValueChange={(v) => apply({ status: v === ALL ? null : v })}
      >
        <SelectTrigger className="w-40" aria-label="Filter by status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {APPLICATION_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {terms.length > 0 && (
        <Select
          value={params.get("term") ?? ALL}
          onValueChange={(v) => apply({ term: v === ALL ? null : v })}
        >
          <SelectTrigger className="w-40" aria-label="Filter by term">
            <SelectValue placeholder="Term" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All terms</SelectItem>
            {terms.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={params.get("sort") ?? "updated"}
        onValueChange={(v) => apply({ sort: v === "updated" ? null : v })}
      >
        <SelectTrigger className="w-44" aria-label="Sort">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="updated">Recently updated</SelectItem>
          <SelectItem value="applied">Date applied</SelectItem>
          <SelectItem value="company">Company A–Z</SelectItem>
        </SelectContent>
      </Select>

      <ApplicationFormDialog
        trigger={
          <Button>
            <Plus className="size-4" /> Add
          </Button>
        }
      />
    </div>
  );
}

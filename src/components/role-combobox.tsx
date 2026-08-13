"use client";

import { useState, useTransition } from "react";
import { Check, ChevronsUpDown, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { addRolePreset, deleteRolePreset, renameRolePreset } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Pick a saved role or type a new one. Typing a role that isn't saved yet
 * offers to add it as a preset, so the list builds up as you use it.
 */
export function RoleCombobox({
  id,
  value,
  onChange,
  presets,
}: {
  id: string;
  value: string;
  onChange: (role: string) => void;
  presets: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();
  // Optimistic so a newly added preset shows up without waiting for a refetch.
  const [added, setAdded] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const all = [...new Set([...presets, ...added])].sort((a, b) => a.localeCompare(b));
  const trimmed = query.trim();
  const isNew = trimmed.length > 0 && !all.some((r) => r.toLowerCase() === trimmed.toLowerCase());

  function select(role: string) {
    onChange(role);
    setQuery("");
    setOpen(false);
  }

  function addPreset(role: string) {
    setAdded((a) => [...a, role]);
    select(role);
    startTransition(async () => {
      const result = await addRolePreset(role);
      if (!result.ok) {
        setAdded((a) => a.filter((r) => r !== role));
        toast.error(result.error);
      }
    });
  }

  function commitRename(from: string) {
    const to = draft.trim();
    setEditing(null);
    // Clear the search: leaving the old name in the box filters the list by a
    // role that no longer exists and offers to re-add it.
    setQuery("");
    if (!to || to === from) return;

    setAdded((a) => [...a.filter((r) => r !== from), to]);
    if (value === from) onChange(to);

    startTransition(async () => {
      const result = await renameRolePreset(from, to);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const n = result.data.applicationsUpdated;
      toast.success(
        n > 0
          ? `Renamed to "${to}" and updated ${n} application${n === 1 ? "" : "s"}`
          : `Renamed to "${to}"`,
      );
    });
  }

  function removePreset(role: string) {
    setQuery("");
    setAdded((a) => a.filter((r) => r !== role));
    startTransition(async () => {
      const result = await deleteRolePreset(role);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
          )}
        >
          {value || "Select or add a role"}
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or type a new role…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {!isNew && <CommandEmpty>No roles saved yet.</CommandEmpty>}
            {isNew && (
              <CommandGroup>
                <CommandItem value={`__add__${trimmed}`} onSelect={() => addPreset(trimmed)}>
                  <Plus className="size-4" />
                  Add &ldquo;{trimmed}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
            {all.length > 0 && (
              <CommandGroup heading="Saved roles">
                {all.map((role) =>
                  editing === role ? (
                    // Rendered outside CommandItem: cmdk steals arrow keys and
                    // Enter from inputs nested inside a selectable item.
                    <div key={role} className="flex items-center gap-1 px-2 py-1">
                      <Input
                        autoFocus
                        value={draft}
                        aria-label={`Rename ${role}`}
                        className="h-8"
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitRename(role);
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditing(null);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 shrink-0"
                        aria-label={`Save rename of ${role}`}
                        onClick={() => commitRename(role)}
                      >
                        <Check className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <CommandItem key={role} value={role} onSelect={() => select(role)}>
                      <Check
                        className={cn("size-4", value === role ? "opacity-100" : "opacity-0")}
                      />
                      <span className="flex-1 truncate">{role}</span>
                      <span
                        role="button"
                        tabIndex={-1}
                        aria-label={`Rename ${role} preset`}
                        className="rounded p-0.5 opacity-50 hover:bg-accent hover:opacity-100"
                        onPointerDown={(e) => {
                          // Stop CommandItem from treating this as a selection.
                          e.preventDefault();
                          e.stopPropagation();
                          setDraft(role);
                          setEditing(role);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </span>
                      <span
                        role="button"
                        tabIndex={-1}
                        aria-label={`Remove ${role} preset`}
                        className="rounded p-0.5 opacity-50 hover:bg-accent hover:opacity-100"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removePreset(role);
                        }}
                      >
                        <X className="size-3.5" />
                      </span>
                    </CommandItem>
                  ),
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

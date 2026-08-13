"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { createApplication, updateApplication } from "@/lib/actions";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  TERMS,
  TERM_LABELS,
  WORK_MODES,
  WORK_MODE_LABELS,
} from "@/lib/constants";
import type { Application } from "@/db/schema";
import { RoleCombobox } from "@/components/role-combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormValues = Record<
  | "company"
  | "role"
  | "jobUrl"
  | "workMode"
  | "term"
  | "status"
  | "appliedAt"
  | "salary"
  | "source"
  | "notes",
  string
>;

// Radix Select can't hold an empty string as a value, so "no term" needs a sentinel.
const NO_TERM = "__none__";

function todayIso() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// A function, not a constant: evaluated when the dialog opens, so a tab left
// open overnight still defaults to the actual current date.
const emptyValues = (): FormValues => ({
  company: "",
  role: "",
  jobUrl: "",
  workMode: "unknown",
  term: "",
  status: "applied",
  appliedAt: todayIso(),
  salary: "",
  source: "",
  notes: "",
});

function toFormValues(a: Application): FormValues {
  return {
    company: a.company,
    role: a.role,
    jobUrl: a.jobUrl ?? "",
    workMode: a.workMode,
    term: a.term ?? "",
    status: a.status,
    appliedAt: a.appliedAt ?? "",
    salary: a.salary ?? "",
    source: a.source ?? "",
    notes: a.notes ?? "",
  };
}

/**
 * Renders its own trigger when given one, or runs controlled via open/
 * onOpenChange. Callers opening this from a DropdownMenu must use the
 * controlled form and render it as a sibling of the menu — nesting a Dialog
 * inside DropdownMenuContent leaves `pointer-events: none` stuck on <body>.
 */
export function ApplicationFormDialog({
  application,
  trigger,
  rolePresets,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  application?: Application;
  trigger?: ReactNode;
  rolePresets: string[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  // Unique per dialog instance so ids stay distinct when several are mounted
  // (every table row renders one).
  const formId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = setControlledOpen ?? setUncontrolledOpen;
  const [values, setValues] = useState<FormValues>(
    application ? toFormValues(application) : emptyValues(),
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof FormValues>(key: K, value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      // Reset to the source of truth each time it opens so a cancelled edit
      // doesn't leak into the next one.
      setValues(application ? toFormValues(application) : emptyValues());
      setErrors({});
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = application
        ? await updateApplication(application.id, values)
        : await createApplication(values);

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success(application ? "Application updated" : "Application added");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{application ? "Edit application" : "Add application"}</DialogTitle>
            <DialogDescription>
              Only company and role are required — fill in the rest as you learn it.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <Field id={`${formId}-company`} label="Company" error={errors.company} required>
              <Input
                id={`${formId}-company`}
                value={values.company}
                onChange={(e) => set("company", e.target.value)}
                placeholder="Acme Corp"
                autoFocus
              />
            </Field>

            <Field id={`${formId}-role`} label="Role" error={errors.role} required>
              <RoleCombobox
                id={`${formId}-role`}
                value={values.role}
                onChange={(role) => set("role", role)}
                presets={rolePresets}
              />
            </Field>

            <Field
              id={`${formId}-jobUrl`}
              label="Job listing URL"
              error={errors.jobUrl}
              className="sm:col-span-2"
            >
              <Input
                id={`${formId}-jobUrl`}
                value={values.jobUrl}
                onChange={(e) => set("jobUrl", e.target.value)}
                placeholder="https://…"
              />
            </Field>

            <Field id={`${formId}-status`} label="Status" error={errors.status}>
              <Select value={values.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger id={`${formId}-status`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPLICATION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id={`${formId}-appliedAt`} label="Date applied" error={errors.appliedAt}>
              <Input
                id={`${formId}-appliedAt`}
                type="date"
                value={values.appliedAt}
                onChange={(e) => set("appliedAt", e.target.value)}
              />
            </Field>

            <Field id={`${formId}-term`} label="Term" error={errors.term}>
              <Select
                value={values.term || NO_TERM}
                onValueChange={(v) => set("term", v === NO_TERM ? "" : v)}
              >
                <SelectTrigger id={`${formId}-term`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TERM}>Not specified</SelectItem>
                  {TERMS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TERM_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id={`${formId}-workMode`} label="Work mode" error={errors.workMode}>
              <Select value={values.workMode} onValueChange={(v) => set("workMode", v)}>
                <SelectTrigger id={`${formId}-workMode`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m === "unknown" ? "Not specified" : WORK_MODE_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id={`${formId}-salary`} label="Compensation" error={errors.salary}>
              <Input
                id={`${formId}-salary`}
                value={values.salary}
                onChange={(e) => set("salary", e.target.value)}
                placeholder="$45/hr"
              />
            </Field>

            <Field
              id={`${formId}-source`}
              label="Source"
              error={errors.source}
              className="sm:col-span-2"
            >
              <Input
                id={`${formId}-source`}
                value={values.source}
                onChange={(e) => set("source", e.target.value)}
                placeholder="Referral, LinkedIn, career fair…"
              />
            </Field>

            <Field
              id={`${formId}-notes`}
              label="Notes"
              error={errors.notes}
              className="sm:col-span-2"
            >
              <Textarea
                id={`${formId}-notes`}
                value={values.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Recruiter name, interview prep, follow-up dates…"
                rows={4}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : application ? "Save changes" : "Add application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  error,
  required,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string[];
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error?.[0] && <p className="mt-1 text-xs text-destructive">{error[0]}</p>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { toast } from "sonner";
import { importApplications, type ImportReport } from "@/lib/import-actions";
import {
  guessMapping,
  mapRows,
  IMPORT_FIELDS,
  IMPORT_FIELD_LABELS,
  REQUIRED_IMPORT_FIELDS,
  type ImportField,
} from "@/lib/import-mapping";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const IGNORE = "__ignore__";

type Parsed = { headers: string[]; rows: Record<string, string>[] };

/**
 * API responses are usually wrapped ({ success, data: [...] }, { results: [...] }),
 * so pasting one straight from the network tab should just work. Returns the
 * first array-of-objects property, or the object itself as a single row.
 */
function unwrapEnvelope(json: unknown): unknown[] {
  if (typeof json !== "object" || json === null) return [json];
  const nested = Object.values(json).find(
    (v) => Array.isArray(v) && v.length > 0 && v.every((i) => typeof i === "object" && i !== null),
  );
  return (nested as unknown[]) ?? [json];
}

/** Accepts a JSON array of objects as well as delimited text. */
function parseInput(text: string): Parsed | { error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { error: "Nothing to parse." };

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const json = JSON.parse(trimmed);
      const list: unknown[] = Array.isArray(json) ? json : unwrapEnvelope(json);
      const objects = list.filter(
        (v): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v),
      );
      if (objects.length === 0) return { error: "JSON must be an array of objects." };

      const headers = [...new Set(objects.flatMap((o) => Object.keys(o)))];
      const rows = objects.map((o) =>
        Object.fromEntries(
          headers.map((h) => {
            const value = o[h];
            return [h, value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value)];
          }),
        ),
      );
      return { headers, rows };
    } catch {
      return { error: "That looked like JSON but wouldn't parse." };
    }
  }

  const result = Papa.parse<Record<string, string>>(trimmed, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });

  const headers = (result.meta.fields ?? []).filter(Boolean);
  if (headers.length === 0) return { error: "Couldn't find a header row." };
  if (result.data.length === 0) return { error: "No data rows found under the header." };

  return { headers, rows: result.data };
}

export function Importer() {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [mapping, setMapping] = useState<Record<string, ImportField | null>>({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [pending, startTransition] = useTransition();

  const mappedFields = new Set(Object.values(mapping).filter(Boolean) as ImportField[]);
  const missingRequired = REQUIRED_IMPORT_FIELDS.filter((f) => !mappedFields.has(f));

  function onParse() {
    const result = parseInput(text);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setParsed(result);
    setMapping(guessMapping(result.headers));
    setReport(null);
    toast.success(`Found ${result.rows.length} rows across ${result.headers.length} columns`);
  }

  async function onFile(file: File) {
    setText(await file.text());
    setParsed(null);
    setReport(null);
  }

  function run(dryRun: boolean) {
    if (!parsed) return;
    const rows = mapRows(parsed.rows, mapping);
    startTransition(async () => {
      const result = await importApplications(rows, { dryRun, skipDuplicates });
      setReport(result);
      if (!dryRun) {
        if (result.created > 0) toast.success(`Imported ${result.created} applications`);
        else toast.info("Nothing was imported");
      }
    });
  }

  function reset() {
    setText("");
    setParsed(null);
    setMapping({});
    setReport(null);
  }

  const imported = report && !report.dryRun;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <Label htmlFor="import-text">1. Paste your data</Label>
        <Textarea
          id="import-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={"company,role,status,date applied\nAcme,SWE Intern,Applied,01/15/2026"}
          className="font-mono text-xs"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onParse} disabled={!text.trim()}>
            Parse
          </Button>
          <input
            type="file"
            accept=".csv,.tsv,.txt,.json,text/csv,application/json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
            }}
            className="text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm"
          />
          {(parsed || text) && (
            <Button variant="ghost" onClick={reset}>
              Clear
            </Button>
          )}
        </div>
      </section>

      {parsed && (
        <section className="space-y-3">
          <div>
            <Label>2. Map the columns</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Guessed from your headers — correct anything that&apos;s wrong. Company and Role are
              required.
            </p>
          </div>

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Your column</TableHead>
                  <TableHead>Sample value</TableHead>
                  <TableHead className="w-56">Maps to</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsed.headers.map((header) => (
                  <TableRow key={header}>
                    <TableCell className="font-medium">{header}</TableCell>
                    <TableCell className="max-w-72 truncate text-muted-foreground">
                      {parsed.rows.find((r) => r[header]?.trim())?.[header] ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mapping[header] ?? IGNORE}
                        onValueChange={(v) =>
                          setMapping((m) => ({ ...m, [header]: v === IGNORE ? null : (v as ImportField) }))
                        }
                      >
                        <SelectTrigger className="w-full" aria-label={`Map column ${header}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={IGNORE}>Ignore</SelectItem>
                          {IMPORT_FIELDS.map((f) => (
                            <SelectItem
                              key={f}
                              value={f}
                              disabled={mappedFields.has(f) && mapping[header] !== f}
                            >
                              {IMPORT_FIELD_LABELS[f]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="skip-duplicates"
              checked={skipDuplicates}
              onCheckedChange={(v) => setSkipDuplicates(v === true)}
            />
            <Label htmlFor="skip-duplicates" className="font-normal">
              Skip rows that match an application I already have (same company, role, and term)
            </Label>
          </div>

          {missingRequired.length > 0 && (
            <p className="text-sm text-destructive">
              Still need a column mapped to:{" "}
              {missingRequired.map((f) => IMPORT_FIELD_LABELS[f]).join(" and ")}.
            </p>
          )}

          <Button onClick={() => run(true)} disabled={pending || missingRequired.length > 0}>
            {pending ? "Checking…" : "Preview import"}
          </Button>
        </section>
      )}

      {report && (
        <section className="space-y-3">
          <Label>3. {imported ? "Result" : "Preview"}</Label>

          <div className="grid grid-cols-3 gap-3">
            <Summary label={imported ? "Imported" : "Will import"} value={report.created} />
            <Summary label="Skipped as duplicate" value={report.duplicates} />
            <Summary label="Errors" value={report.errors} />
          </div>

          <div className="max-h-96 overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Row</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Outcome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.rows.map((row) => (
                  <TableRow key={row.sourceRow}>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {row.sourceRow}
                    </TableCell>
                    <TableCell>{row.company || "—"}</TableCell>
                    <TableCell className="max-w-64 truncate">{row.role || "—"}</TableCell>
                    <TableCell
                      className={
                        row.outcome === "error"
                          ? "text-destructive"
                          : row.outcome === "duplicate"
                            ? "text-muted-foreground"
                            : "text-emerald-600 dark:text-emerald-400"
                      }
                    >
                      {row.message ?? (imported ? "Imported" : "Ready")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {imported ? (
            <Button asChild>
              <Link href="/applications">View applications</Link>
            </Button>
          ) : (
            <Button onClick={() => run(false)} disabled={pending || report.created === 0}>
              {pending ? "Importing…" : `Import ${report.created} applications`}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

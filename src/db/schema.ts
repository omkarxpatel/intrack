import { relations } from "drizzle-orm";
import {
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
// Relative rather than the "@/" alias so drizzle-kit's loader resolves it too.
import { APPLICATION_STATUSES, WORK_MODES } from "../lib/constants";

export { APPLICATION_STATUSES, WORK_MODES };

export const applicationStatus = pgEnum("application_status", APPLICATION_STATUSES);
export const workMode = pgEnum("work_mode", WORK_MODES);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Every row is scoped to an owner from day one so adding real auth later is
    // a swap of getCurrentUser(), not a schema migration.
    userId: text("user_id").notNull(),

    company: text("company").notNull(),
    role: text("role").notNull(),
    jobUrl: text("job_url"),
    location: text("location"),
    workMode: workMode("work_mode").notNull().default("unknown"),
    // Free text so "Summer 2027", "Fall 2026 co-op", etc. all fit.
    term: text("term"),
    status: applicationStatus("status").notNull().default("saved"),
    appliedAt: date("applied_at"),
    salary: text("salary"),
    source: text("source"),
    notes: text("notes"),

    // Stable id from whatever system a row was imported from. NULL for rows
    // created by hand; Postgres treats NULLs as distinct so the unique index
    // below only constrains actual imported ids.
    externalId: text("external_id"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("applications_user_idx").on(t.userId),
    index("applications_user_status_idx").on(t.userId, t.status),
    uniqueIndex("applications_user_external_idx").on(t.userId, t.externalId),
  ],
);

// Append-only history. Lets us show a timeline and "days since last movement"
// instead of overwriting a single status field.
export const statusEvents = pgTable(
  "status_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    fromStatus: applicationStatus("from_status"),
    toStatus: applicationStatus("to_status").notNull(),
    note: text("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("status_events_application_idx").on(t.applicationId, t.occurredAt)],
);

export const applicationsRelations = relations(applications, ({ many }) => ({
  statusEvents: many(statusEvents),
}));

export const statusEventsRelations = relations(statusEvents, ({ one }) => ({
  application: one(applications, {
    fields: [statusEvents.applicationId],
    references: [applications.id],
  }),
}));

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type StatusEvent = typeof statusEvents.$inferSelect;

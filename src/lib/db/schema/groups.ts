import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { campuses, organizations } from "./identity-org";
import { people } from "./people";
import { groupType } from "./enums";

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    code: text("code"),
    type: groupType("type").notNull().default("custom"),
    description: text("description"),
    leaderPersonId: uuid("leader_person_id").references(() => people.id, { onDelete: "set null" }),
    meetingDay: smallint("meeting_day"),
    meetingTime: time("meeting_time"),
    meetingLocation: text("meeting_location"),
    capacity: integer("capacity"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("groups_org_code_unique").on(table.organizationId, table.code),
    check("groups_meeting_day_check", sql`${table.meetingDay} between 0 and 6`),
    check("groups_capacity_check", sql`${table.capacity} is null or ${table.capacity} > 0`),
  ],
);

export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    joinedAt: date("joined_at"),
    leftAt: date("left_at"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("group_members_unique").on(table.groupId, table.personId)],
);

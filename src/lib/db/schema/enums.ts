import { pgEnum } from "drizzle-orm/pg-core";

// Miroir exact de db/schema.sql §1 ENUMS (valeurs en minuscules — c'est le schéma
// réellement déployé sur Supabase, adopté tel quel comme source de vérité).

export const orgStatus = pgEnum("org_status", ["trial", "active", "suspended", "archived"]);

export const memberStatus = pgEnum("member_status", [
  "active",
  "inactive",
  "transferred",
  "deceased",
  "archived",
]);

export const gender = pgEnum("gender", ["male", "female", "other", "undisclosed"]);

export const relationshipType = pgEnum("relationship_type", [
  "spouse",
  "parent",
  "child",
  "sibling",
  "grandparent",
  "grandchild",
  "guardian",
  "dependent",
  "other",
]);

export const visitorStatus = pgEnum("visitor_status", [
  "new",
  "contacted",
  "follow_up",
  "connected",
  "converted",
  "lost",
  "archived",
]);

export const groupType = pgEnum("group_type", [
  "cell",
  "home_group",
  "youth",
  "women",
  "men",
  "children",
  "prayer",
  "study",
  "team",
  "custom",
]);

export const pastoralStatus = pgEnum("pastoral_status", [
  "new",
  "in_progress",
  "waiting",
  "completed",
  "cancelled",
  "archived",
]);

export const priorityLevel = pgEnum("priority_level", ["low", "normal", "high", "urgent"]);

export const prayerStatus = pgEnum("prayer_status", [
  "open",
  "in_progress",
  "answered",
  "closed",
  "archived",
]);

export const visitType = pgEnum("visit_type", [
  "pastoral",
  "member",
  "family",
  "hospital",
  "home",
  "new_visitor",
  "other",
]);

export const ministryStatus = pgEnum("ministry_status", ["active", "inactive", "archived"]);

export const workerStatus = pgEnum("worker_status", [
  "active",
  "inactive",
  "on_leave",
  "archived",
]);

export const assignmentStatus = pgEnum("assignment_status", [
  "assigned",
  "confirmed",
  "declined",
  "completed",
  "cancelled",
]);

export const eventStatus = pgEnum("event_status", [
  "draft",
  "published",
  "cancelled",
  "completed",
  "archived",
]);

export const eventVisibility = pgEnum("event_visibility", ["private", "members", "public"]);

export const registrationStatus = pgEnum("registration_status", [
  "pending",
  "confirmed",
  "waitlisted",
  "cancelled",
  "attended",
  "no_show",
]);

export const attendanceStatus = pgEnum("attendance_status", [
  "present",
  "absent",
  "excused",
  "late",
]);

export const financeEntryType = pgEnum("finance_entry_type", ["income", "expense", "transfer"]);

export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "succeeded",
  "failed",
  "refunded",
  "cancelled",
]);

export const paymentMethod = pgEnum("payment_method", [
  "cash",
  "bank_transfer",
  "card",
  "mobile_money",
  "check",
  "online",
  "other",
]);

export const documentVisibility = pgEnum("document_visibility", [
  "private",
  "organization",
  "campus",
  "public",
]);

export const notificationChannel = pgEnum("notification_channel", [
  "in_app",
  "email",
  "sms",
  "whatsapp",
  "push",
]);

export const notificationStatus = pgEnum("notification_status", [
  "queued",
  "sent",
  "delivered",
  "failed",
  "read",
]);

export const subscriptionStatus = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "cancelled",
  "paused",
  "expired",
]);

export const billingInterval = pgEnum("billing_interval", ["monthly", "yearly"]);

export const courseStatus = pgEnum("course_status", ["draft", "published", "archived"]);

export const enrollmentStatus = pgEnum("enrollment_status", [
  "enrolled",
  "completed",
  "dropped",
  "pending",
]);

export const resourceType = pgEnum("resource_type", ["room", "equipment", "vehicle", "other"]);

export const reservationStatus = pgEnum("reservation_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
]);
